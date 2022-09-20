import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import os from 'os'
import inquirer from 'inquirer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import db from '../config/db.js'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

const recordingFilePath = process.env.RECORDING_FILE_PATH || os.homedir()

export default inquirer
  .prompt([
    {
      type: 'input',
      message: 'deviceName:',
      name: 'deviceName',
      validate (input) {
        if (/^MB\d{1}-\w{1}\d{5}$/.test(input.trim())) {
          return true
        } else {
          throw Error('박스이름 형식 오류')
        }
      },
      filter (input) {
        return input.trim()
      }
    },
    {
      type: 'input',
      message: 'barcode:',
      name: 'barcode',
      validate (input) {
        if (input.trim().length === 11) {
          return true
        } else {
          throw Error('바코드 길이 오류')
        }
      },
      filter (input) {
        return input.trim()
      }
    },
    {
      type: 'input',
      message: 'fileId:',
      name: 'fileId',
      validate (input) {
        if (input.trim().length === 16) {
          return true
        } else {
          throw Error('파일명 길이 오류')
        }
      },
      filter (input) {
        return input.trim()
      }
    },
    {
      type: 'number',
      message: 'videoLength:',
      name: 'videoLength',
      validate (input) {
        if (typeof input === 'number') {
          return true
        } else {
          throw Error('숫자를 입력해 주세요')
        }
      }
    },
    {
      type: 'number',
      message: 'recordingFilePath:',
      name: 'recordingFilePath',
      default: recordingFilePath
    },
    {
      type: 'input',
      message: 'recordedAt (YYYY-MM-DD hh:mm:ss):',
      name: 'recordedAt',
      validate (input) {
        if (dayjs(input).isValid()) {
          return true
        } else {
          throw Error('올바른 날짜 형식이 아닙니다.')
        }
      },
      filter (input) {
        return dayjs(input).utc().format()
      }
    }
  ])
  .then(async (answers) => {
    try {
      await uploadS3(answers)
      await insertDB(answers)
    } catch (error) {
      console.log(error)
    }
  })

function getContentType (filename: string) {
  const extension = filename.split('.')[1]

  switch (extension) {
    case 'mp4':
      return 'video/mp4'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'log':
    case 'txt':
      return 'application/octet-stream'
  }
}

async function uploadS3 (data: any) {
  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-2' })
  try {
    const filelist = fs.readdirSync(path.join(recordingFilePath)).filter((filename) => filename.startsWith(data.fileId))
    console.log(filelist)

    if (filelist.length > 0) {
      await Promise.all(
        filelist.map(async (file) => {
          data.videoLength = data.videoLength.toString()
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.S3_ULTRASOUND_BUCKET || 'ultrasound.mmtalk.kr',
              Key: `${data.barcode}/${file}`,
              ACL: 'public-read',
              CacheControl: 'max-age=31536000',
              ContentType: getContentType(file),
              Metadata: data,
              Body: fs.createReadStream(path.join(recordingFilePath, file))
            })
          )
        })
      )

      console.log('S3 Uploaded!')

      filelist.map(async (file) => {
        fs.unlinkSync(path.join(recordingFilePath, file))
      })

      console.log('Deleted all files')
    } else {
      throw new Error('No such files')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Upload failed')
  }
}

async function insertDB (data: { barcode: string; fileId: any; videoLength: any; recordedAt: any; deviceName: any }) {
  const insertQuery = `
    INSERT INTO recordings (
      deviceSeq, hospitalSeq, hospitalRoomSeq,
      barcode, fullBarcode, deleteFlag,
      fileId, localFilePath, resolution,
      videoLength, s3Bucket, s3FileKey,
      recordedAt, createdAt, updatedAt
    )

    SELECT
      devices.seq, devices.hospitalSeq, devices.hospitalRoomSeq,
      ${data.barcode.substring(2)}, ${data.barcode}, 0,
      '${data.fileId}', '', '720p',
      ${data.videoLength}, 'ultrasound.mmtalk.kr', '${data.barcode}/${data.fileId}.mp4',
      '${data.recordedAt}', NOW(), NOW()
    FROM
      devices
    WHERE
      deviceName = '${data.deviceName}'
  `

  try {
    const result = await db.query(insertQuery, { raw: true })
    console.log(`Insert Success, recording seq: ${result[0]}`)
  } catch (error) {
    console.log(error)
  }
}
