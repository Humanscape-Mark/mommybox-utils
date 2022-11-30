import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import async from 'async'
import inquirer from 'inquirer'
import jwt from 'jsonwebtoken'
import { GetObjectCommand } from '@aws-sdk/client-s3'

import { migrationDb } from '../config/db.js'
import { s3Client } from '../config/awsWrap.js'
import { mothersFilenameParser } from '../lib/dates.js'
import { getVideoLength, createVideoThumbnail } from '../lib/videos.js'

const tempPath = path.join(path.resolve(), 'tmp')
const Bucket = process.env.S3_MOTHERS_BUCKET_NAME || 'ultrasound.migrated.mmtalk.kr'

export default inquirer
  .prompt([
    {
      type: 'input',
      message: 'mothers chartnumber:',
      name: 'chartnumber'
    }
  ])
  .then(async (mothersAnswers) => {
    const videoList = await getVideolist(mothersAnswers.chartnumber)

    inquirer
      .prompt([
        {
          type: 'input',
          message: 'deviceName:',
          name: 'deviceName',
          default: 'MB0-X00034',
          validate (input) {
            if (/^MB\d{1}-\w{1}\d{5}$/.test(input.trim())) {
              return true
            } else {
              throw Error('Invalid deviceName')
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
              throw Error('Invalid barcode')
            }
          },
          filter (input) {
            return input.trim()
          }
        }
      ])
      .then(async (answers) => {
        try {
          const { barcode, deviceName } = answers
          const uploaderUrl = process.env.BOX_UPLOADER_URL_KR_PROD + '/recording/upload-v2'
          const uploaderJwtSecret = process.env.BOX_UPLOADER_KR_JWT_SECRET || ''

          let count = 1
          return async.eachSeries(videoList, async videoInfo => {
            const { videoFileName, videoFilePath } = videoInfo
            const Key = 'mothers' + videoFilePath + '/' + videoFileName

            const { Body } = await s3Client.send(new GetObjectCommand({ Bucket, Key }))

            const bodyStream = await Body?.transformToByteArray()
            fs.writeFileSync(path.join(tempPath, videoFileName), Buffer.from(bodyStream!))

            await createVideoThumbnail(tempPath, videoFileName)
            const fileId = videoFileName.split('.')[0]
            const thumbnailFileName = videoFileName.replace('mp4', 'jpg')
            const videoLength = await getVideoLength(path.join(tempPath, videoFileName))
            const recordedAt = mothersFilenameParser(videoFileName)

            const result = await axios({
              method: 'POST',
              url: uploaderUrl,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: 'Bearer ' + jwt.sign({ deviceName }, uploaderJwtSecret, { expiresIn: '365d' })
              },
              data: {
                barcode,
                deviceName,
                fileId,
                recordedAt,
                videoLength,
                resolution: '480p',
                recording: fs.createReadStream(path.join(tempPath, videoFileName)),
                thumbnail: fs.createReadStream(path.join(tempPath, thumbnailFileName))
              }
            })

            if (result.status === 200) {
              console.log(`Upload success [ ${fileId} ] (${count++}/${videoList?.length})`)
            } else {
              console.log(`Upload fail [ ${fileId} ] (${count++}/${videoList?.length})`)
            }

            fs.unlinkSync(path.join(tempPath, videoFileName))
            fs.unlinkSync(path.join(tempPath, thumbnailFileName))
          })
        } catch (error) {
          console.log(error)
        }
      })
  })

async function getVideolist (chartnumber: string | number) {
  const [result] = await migrationDb.query(`
    SELECT
      vFilename as videoFileName,
      vFilelocation as videoFilePath
    FROM
      mothers_videolist
    WHERE
      vChartnumber = '${chartnumber}'
  `)

  if (typeof result === 'object') {
    return result as [{
      videoFileName: string,
      videoFilePath: string
    }]
  } else {
    throw new Error('No result')
  }
}
