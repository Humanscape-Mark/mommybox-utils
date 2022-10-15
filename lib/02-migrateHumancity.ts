import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import async from 'async'
import inquirer from 'inquirer'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export default inquirer
  .prompt([
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
      type: 'number',
      message: 'hospitalSeq:',
      name: 'hospitalSeq',
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
      message: 'hospitalRoomSeq:',
      name: 'hospitalRoomSeq',
      validate (input) {
        if (typeof input === 'number') {
          return true
        } else {
          throw Error('숫자를 입력해 주세요')
        }
      }
    },
    {
      type: 'input',
      message: 's3KeyBase (예: 03/00329/GJC00329H16619):',
      name: 's3KeyBase'
    },
    {
      type: 'input',
      message: 'baseDir:',
      name: 'baseDir',
      default: '/Users/mark/Downloads/mp4'
    }
  ])
  .then(async (answers) => {
    try {
      const files = fs.readdirSync(answers.baseDir)
      const query = await createQuery(answers.barcode, answers.hospitalSeq, answers.hospitalRoomSeq, answers.s3KeyBase, answers.baseDir, files)
      console.log(query)
    } catch (error) {
      console.log(error)
    }
  })

function fileNameDateParser (filename: string) {
  const datestring = filename
    .replace('y', '-').replace('m', '-').replace('d(', ' ')
    .replace('h', ':').replace('m', ':').replace('s).mp4', '')

  return dayjs(datestring).utc().format()
}

function getVideoLength (filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .ffprobe((err, metadata) => {
        if (err) reject(err)
        resolve(Math.round(metadata.format.duration || 0))
      })
  })
}

async function createQuery (barcode: string, hospitalSeq: number, hospitalRoomSeq: number, s3KeyBase: string, baseDir: string, files: string[]) {
  const baseQuery = `
    INSERT INTO recordings (
      deviceSeq, hospitalSeq, hospitalRoomSeq,
      barcode, fullBarcode, deleteFlag,
      fileId, localFilePath, resolution,
      videoLength, s3Bucket, s3FileKey,
      recordedAt, createdAt, updatedAt
    )
    VALUES
  `
  const valueQuery = await async.mapSeries(files, async (file: string) => {
    const videoLength = await getVideoLength(baseDir + '/' + file)
    const recordedAt = fileNameDateParser(file)

    return `
      (
        34, ${hospitalSeq}, ${hospitalRoomSeq},
        ${barcode.substring(2)}, '${barcode}', 0,
        '${file.split('.')[0]}', '', '480p',
        ${videoLength}, 'ultrasound.migrated.mmtalk.kr', 'humangate/${s3KeyBase}/${file}',
        '${recordedAt}', NOW(), NOW()
      )
    `
  })

  return baseQuery + valueQuery.join(',')
}
