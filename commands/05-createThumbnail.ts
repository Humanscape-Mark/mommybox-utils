import 'dotenv/config'
import fs from 'fs'
import os from 'os'
import inquirer from 'inquirer'

import { createVideoThumbnail } from '../lib/videos.js'

export default inquirer
  .prompt([
    {
      type: 'input',
      message: 'recordingFilePath:',
      name: 'recordingFilePath',
      default: process.env.UPLOAD_DEFAULT_PATH || os.homedir()
    }
  ])
  .then(async (answers) => {
    inquirer.prompt([
      {
        type: 'list',
        name: 'recording',
        message: 'Recording file (mp4)',
        choices: () => {
          const files = fs.readdirSync(answers.recordingFilePath, { withFileTypes: true })
          return files
            .filter(file => file.isFile())
            .filter(file => !(/(^|\/)\.[^/.]/g).test(file.name))
        }
      }
    ]).then(async (files) => {
      console.log(answers)
      console.log(files)
      createVideoThumbnail(answers.recordingFilePath, files.recording)
    })
  })
