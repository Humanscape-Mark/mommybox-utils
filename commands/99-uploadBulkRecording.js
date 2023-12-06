import 'dotenv/config'
import async from 'async'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'

dayjs.extend(utc)
dayjs.extend(advancedFormat)

const deviceName = 'MB2-X00001'
const barcodes = [
  '08624979528',
  '08624980330',
  '08624983297',
  '08624991078',
  '08624996799',
  '08625005693',
  '08625009627',
  '08625010421',
  '08625012138',
  '08625030779'
]

const recordings = [
  {
    filePath: '/Users/whitehander',
    fileId: '4w4eoevpzttlpzw1',
    videoLength: 295,
    recordedAt: dayjs('2023-10-01 09:00:00').format('x')
  },
  {
    filePath: '/Users/whitehander',
    fileId: 'fvv15pjlreha23hr',
    videoLength: 136,
    recordedAt: dayjs('2023-10-25 09:00:00').format('x')
  }
]

const uploaderUrl = process.env.BOX_UPLOADER_URL_KR_DEV + '/recording/upload'
const uploaderJwtSecret = process.env.BOX_UPLOADER_KR_JWT_SECRET || ''

async function sendVideo (barcode) {
  try {
    async.eachSeries(recordings, async (recording) => {
      const { filePath, fileId, videoLength, recordedAt } = recording

      try {
        const result = await axios({
          method: 'POST',
          url: uploaderUrl,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization:
              'Bearer ' +
              jwt.sign({ deviceName }, uploaderJwtSecret, { expiresIn: '365d' })
          },
          data: {
            barcode,
            deviceName,
            recordedAt,
            resolution: '720p',
            videoLength,
            recording: fs.createReadStream(
              path.join(filePath, fileId + '.mp4')
            ),
            thumbnail: fs.createReadStream(
              path.join(filePath, fileId + '.jpg')
            ),
            fileId
          }
        })
        console.log(result.data)
      } catch (error) {
        console.log(error)
      }
    })
  } catch (error) {
    console.log(error)
  }
}

async.eachSeries(barcodes, sendVideo)
