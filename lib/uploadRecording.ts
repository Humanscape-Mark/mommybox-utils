import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import os from 'os'
import _ from 'lodash'
import inquirer from 'inquirer'
import ffmpeg from 'fluent-ffmpeg'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import { v4 as uuidv4 } from 'uuid'

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
      type: 'list',
      message: '개발/운영',
      name: 'environment',
      choices: ['dev', 'prod']
    },
    {
      type: 'number',
      message: 'recordingFilePath:',
      name: 'recordingFilePath',
      default: recordingFilePath
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
      const slsApiAxios = axios.create({
        baseURL: answers.environment === 'dev' ? process.env.SLS_API_HOST_DEV : process.env.SLS_API_HOST_PROD,
        timeout: 15000,
        headers: {
          'x-api-key': (answers.environment === 'dev' ? process.env.SLS_API_KEY_DEV : process.env.SLS_API_KEY_PROD) || ''
        }
      })
      console.log(answers)
      console.log(files)

      try {
        const videoLength = getVideoLength(path.join(answers.recordingFilePath, files.recording))

        const legacyInfo = await slsApiAxios({
          method: 'GET',
          url: '/migrateGetLegacyDeviceInfo',
          params: {
            countryCode: process.env.COUNTRY_CODE,
            serialNumber: answers.deviceName
          }
        })

        console.log(`Get Legacy Info '${answers.deviceName}': ${legacyInfo.statusText}`)

        const videoPresignedUrl = await slsApiAxios({
          method: 'POST',
          url: '/requestUltraSoundPreSignedUrl',
          data: {
            objects: [
              {
                countryCode: process.env.COUNTRY_CODE,
                Key: `${legacyInfo.data.hospitalCode}/${files.recording}`,
                expires: 60
              }
            ]
          }
        })

        console.log('Get Video Presigned URL: ' + videoPresignedUrl.statusText)

        const sendVideo = await axios({
          method: 'PUT',
          url: videoPresignedUrl.data[0].signedUrl,
          headers: {
            'Content-Type': 'video/mp4'
          },
          data: fs.readFileSync(path.join(answers.recordingFilePath, files.recording)),
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        })

        console.log(`Send Video '${files.recording}': ${sendVideo.statusText}`)

        const imagePresignedUrl = await slsApiAxios({
          method: 'POST',
          url: '/requestUltraSoundPreSignedUrl',
          data: {
            objects: [
              {
                countryCode: process.env.COUNTRY_CODE,
                Key: `${legacyInfo.data.hospitalCode}/${files.thumbnail}`,
                expires: 60
              }
            ]
          }
        })

        await axios({
          method: 'PUT',
          url: imagePresignedUrl.data[0].signedUrl,
          headers: {
            'Content-Type': 'image/jpeg'
          },
          data: fs.readFileSync(path.join(answers.recordingFilePath, files.thumbnail)),
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        })

        const finishData = {
          uuid: uuidv4(),
          barcode: answers.barcode,
          countryCode: process.env.COUNTRY_CODE,
          recordedAt: dayjs().utc().format(),
          files: {
            video: `${legacyInfo.data.hospitalCode}/${files.recording}`,
            image: `${legacyInfo.data.hospitalCode}/${files.thumbnail}`,
            videoLength
          },
          deviceCode: legacyInfo.data.sk,
          deviceSeq: legacyInfo.data.legacyInfo.seq,
          hospitalSeq: legacyInfo.data.legacyInfo.hospitalSeq,
          hospitalRoomSeq: legacyInfo.data.legacyInfo.hospitalRoomSeq,
          ..._.pick(legacyInfo.data, ['hospitalCode', 'hospitalName', 'roomCode', 'roomName', 'deviceName'])
        }

        console.log(JSON.stringify(finishData))

        const finished = await slsApiAxios({
          method: 'POST',
          url: '/migrateUltrasoundUploadFinish',
          data: finishData
        })

        console.log('Sls Finished: ' + finished.statusText)
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
