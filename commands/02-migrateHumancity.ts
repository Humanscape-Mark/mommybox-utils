import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import async from 'async'
import inquirer from 'inquirer'
import jwt from 'jsonwebtoken'
import { GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3'

import { s3Client } from '../config/awsWrap.js'
import { humangateFilenameParser } from '../lib/dates.js'
import { getVideoLength, createVideoThumbnail } from '../lib/videos.js'

const tempPath = path.join(path.resolve(), 'tmp')
const Bucket = process.env.S3_HUMANGATE_BUCKET_NAME || 'ultrasound.migrated.mmtalk.kr'

export default inquirer
  .prompt([
    {
      type: 'input',
      message: 'deviceName:',
      name: 'deviceName',
      default: 'MB0-X00034',
      filter: (input) => input.trim(),
      validate: (input) => {
        if (/^MB\d{1}-\w{1}\d{5}$/.test(input)) {
          return true
        } else {
          throw Error('Invalid deviceName')
        }
      }
    },
    {
      type: 'input',
      message: 'barcode:',
      name: 'barcode',
      filter: (input) => input.trim(),
      validate: (input) => {
        if (input.trim().length === 11) {
          return true
        } else {
          throw Error('Invalid barcode')
        }
      }
    },
    {
      type: 'input',
      message: 's3Prefix (ex: humangate/03/00247/GJC00247H25664) ',
      name: 'Prefix',
      filter: (input) => input.trim(),
      validate: (input) => {
        if (input) {
          return true
        } else {
          throw Error('Prefix required')
        }
      }
    }
  ])
  .then(async (answers) => {
    try {
      const { barcode, Prefix, deviceName } = answers
      const uploaderUrl = process.env.BOX_UPLOADER_URL_KR_PROD + '/recording/upload-v2'
      const uploaderJwtSecret = process.env.BOX_UPLOADER_KR_JWT_SECRET || ''

      const files = await s3Client.send(new ListObjectsCommand({
        Bucket,
        Prefix
      }))

      if (files.Contents) {
        let count = 1
        async.eachSeries(files.Contents, async (file) => {
          if (file.Key) {
            const Key = file.Key
            const videoFileName = Key.split('/').pop()

            if (Key && videoFileName) {
              const { Body } = await s3Client.send(new GetObjectCommand({ Bucket, Key }))

              const bodyStream = await Body?.transformToByteArray()
              fs.writeFileSync(path.join(tempPath, videoFileName), Buffer.from(bodyStream!))

              await createVideoThumbnail(tempPath, videoFileName)
              const fileId = videoFileName.split('.')[0]
              const thumbnailFileName = videoFileName.replace('mp4', 'jpg')
              const videoLength = await getVideoLength(path.join(tempPath, videoFileName))
              const recordedAt = humangateFilenameParser(videoFileName)

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
                console.log(`Upload success [ ${fileId} ] (${count++}/${files.Contents?.length})`)
              } else {
                console.log(`Upload fail [ ${fileId} ] (${count++}/${files.Contents?.length})`)
              }

              fs.unlinkSync(path.join(tempPath, videoFileName))
              fs.unlinkSync(path.join(tempPath, thumbnailFileName))
            }
          }
        })
      }
    } catch (error) {
      console.log(error)
    }
  })
