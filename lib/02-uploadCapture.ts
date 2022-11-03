import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import os from 'os'
import inquirer from 'inquirer'
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
      default: 'MB2-A90009',
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
      type: 'list',
      message: 'County',
      name: 'country',
      choices: ['kr', 'id'],
      default: 'kr'
    },
    {
      type: 'list',
      message: 'Dev/Prod',
      name: 'environment',
      choices: ['dev', 'prod']
    },
    {
      type: 'input',
      message: 'captureFilePath:',
      name: 'captureFilePath',
      default: process.env.UPLOAD_DEFAULT_PATH || os.homedir()
    }
  ])
  .then(async (answers) => {
    inquirer.prompt([
      {
        type: 'list',
        name: 'capture',
        message: 'Capture file (jpg)',
        choices: () => {
          const files = fs.readdirSync(answers.captureFilePath, { withFileTypes: true })
          return files
            .filter(file => file.isFile())
            .filter(file => !(/(^|\/)\.[^/.]/g).test(file.name))
            .map(file => file.name)
        }
      },
      {
        type: 'input',
        message: 'capturedAt (YYYY-MM-DD HH:mm:ss):',
        name: 'capturedAt',
        default: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        validate (input) {
          if (dayjs(input).isValid()) {
            return true
          } else {
            throw Error('Invalid date')
          }
        },
        filter (input) {
          return dayjs(input).format('x')
        }
      }
    ]).then(async (files) => {
      console.log(answers)
      console.log(files)

      let uploaderUrl: string | undefined = ''
      let uploaderJwtSecret: string = ''

      if (answers.country === 'kr') {
        uploaderJwtSecret = process.env.BOX_UPLOADER_KR_JWT_SECRET || ''
        uploaderUrl = answers.environment === 'dev' ? process.env.BOX_UPLOADER_URL_KR_DEV : process.env.BOX_UPLOADER_URL_KR_PROD
        uploaderUrl += '/recording/upload/capture'
      } else if (answers.country === 'id') {
        uploaderJwtSecret = process.env.BOX_UPLOADER_ID_JWT_SECRET || ''
        uploaderUrl = answers.environment === 'dev' ? process.env.BOX_UPLOADER_URL_ID_DEV : process.env.BOX_UPLOADER_URL_ID_PROD
        uploaderUrl += '/recording/upload/capture'
      }

      try {
        if (uploaderUrl === undefined) throw new Error('Uploader URL is undefined')
        if (uploaderJwtSecret === '') throw new Error('Uploader JWT key is undefined')

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
            capturedAt: files.capturedAt,
            capture: fs.createReadStream(path.join(answers.captureFilePath, files.capture)),
            fileId: files.capture.split('.')[0]
          }
        })

        console.log(result.data)
      } catch (error) {
        console.log(error)
      }
    })
  })
