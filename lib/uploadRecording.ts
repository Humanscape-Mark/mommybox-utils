import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import os from 'os'
import inquirer from 'inquirer'
import ffmpeg from 'fluent-ffmpeg'
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
      default: 'MB2-A90009',
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
      type: 'list',
      message: '국가',
      name: 'country',
      choices: ['kr', 'id'],
      default: 'kr'
    },
    {
      type: 'list',
      message: '개발/운영',
      name: 'environment',
      choices: ['dev', 'prod']
    },
    {
      type: 'input',
      message: 'recordingFilePath:',
      name: 'recordingFilePath',
      default: os.homedir()
    }
  ])
  .then(async (answers) => {
    inquirer.prompt([
      {
        type: 'list',
        name: 'recording',
        message: '영상 파일을 선택해주세요',
        choices: () => {
          const files = fs.readdirSync(answers.recordingFilePath, { withFileTypes: true })
          return files
            .filter(file => file.isFile())
            .filter(file => !(/(^|\/)\.[^/.]/g).test(file.name))
        }
      },
      {
        type: 'list',
        name: 'thumbnail',
        message: '썸네일 파일을 선택해주세요',
        choices: () => {
          const files = fs.readdirSync(answers.recordingFilePath, { withFileTypes: true })
          return files
            .filter(file => file.isFile())
            .filter(file => !(/(^|\/)\.[^/.]/g).test(file.name))
            .map(file => file.name)
        }
      }
    ]).then(async (files) => {
      console.log(answers)
      console.log(files)

      let uploaderUrl: String | undefined = ''
      let uploaderJwt: String | undefined = ''

      if (answers.country === 'kr') {
        uploaderJwt = process.env.BOX_UPLOADER_KR_JWT_TOKEN
        uploaderUrl = answers.environment === 'dev' ? process.env.BOX_UPLOADER_URL_KR_DEV : process.env.BOX_UPLOADER_URL_KR_PROD
      } else if (answers.country === 'id') {
        uploaderJwt = process.env.BOX_UPLOADER_ID_JWT_TOKEN
        uploaderUrl = answers.environment === 'dev' ? process.env.BOX_UPLOADER_URL_ID_DEV : process.env.BOX_UPLOADER_URL_ID_PROD
      }

      try {
        if (uploaderUrl === undefined) throw new Error('Uploader URL is undefined')
        if (uploaderJwt === undefined) throw new Error('Uploader JWT key is undefined')
        const videoLength = await getVideoLength(path.join(answers.recordingFilePath, files.recording))

        const result = await axios({
          method: 'POST',
          url: uploaderUrl + '/recording/upload',
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: 'Bearer ' + uploaderJwt
          },
          data: {
            barcode: answers.barcode,
            deviceName: answers.deviceName,
            recordedAt: dayjs().format('x'),
            resolution: '720p',
            videoLength,
            recording: fs.createReadStream(path.join(answers.recordingFilePath, files.recording)),
            thumbnail: fs.createReadStream(path.join(answers.recordingFilePath, files.thumbnail)),
            fileId: files.recording.split('.')[0]
          }
        })

        console.log(result.data)
      } catch (error) {
        console.log(error)
      }
    })
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
