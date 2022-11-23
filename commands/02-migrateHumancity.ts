import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import async from 'async'
import os from 'os'
import inquirer from 'inquirer'
import ffmpeg from 'fluent-ffmpeg'
import jwt from 'jsonwebtoken'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'

dayjs.extend(utc)
dayjs.extend(advancedFormat)

export default inquirer
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
    },
    {
      type: 'input',
      message: 'recordingFilePath:',
      name: 'recordingFilePath',
      default: process.env.UPLOAD_DEFAULT_PATH || path.join(os.homedir(), 'migration')
    }
  ])
  .then(async (answers) => {
    try {
      const uploaderUrl = process.env.BOX_UPLOADER_URL_KR_PROD + '/recording/upload-v2'
      const uploaderJwtSecret = process.env.BOX_UPLOADER_KR_JWT_SECRET || ''

      const files = fs.readdirSync(answers.recordingFilePath)

      async.eachSeries(files, async (file) => {
        const videoLength = await getVideoLength(path.join(answers.recordingFilePath, file))
        const recordedAt = fileNameDateParser(file)
        await createVideoThumbnail(answers.recordingFilePath, file)

        const result = await axios({
          method: 'POST',
          url: uploaderUrl,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: 'Bearer ' + jwt.sign({ deviceName: answers.deviceName }, uploaderJwtSecret, { expiresIn: '365d' })
          },
          data: {
            barcode: answers.barcode,
            deviceName: answers.deviceName,
            recordedAt,
            resolution: '480p',
            videoLength,
            recording: fs.createReadStream(path.join(answers.recordingFilePath, file)),
            thumbnail: fs.createReadStream(path.join(answers.recordingFilePath, file.replace('mp4', 'jpg'))),
            fileId: file.split('.')[0]
          }
        })

        console.log(`${file} - ${result.status}`)
      })
    } catch (error) {
      console.log(error)
    }
  })

function getVideoLength (filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .ffprobe((err, metadata) => {
        if (err) reject(err)
        resolve(Math.round(metadata.format.duration || 0))
      })
  })
}

function fileNameDateParser (filename: string, format: string = 'x') {
  const datestring = filename
    .replace('y', '-').replace('m', '-').replace('d(', ' ')
    .replace('h', ':').replace('m', ':').replace('s).mp4', '')

  return dayjs(datestring).utc().format(format)
}

function createVideoThumbnail (baseDir:string, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(path.join(baseDir, fileName))
      .screenshot({
        count: 1,
        filename: fileName.replace('mp4', 'jpg'),
        folder: baseDir
      })
      .on('end', () => {
        return resolve()
      })
  })
}
