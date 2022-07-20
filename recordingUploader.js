import 'dotenv/config';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import db from './config/db.js';

inquirer
  .prompt([
    {
      type: 'input',
      message: 'deviceName:',
      name: 'deviceName',
      validate(input) {
        if (/^MB\d{1}-\w{1}\d{5}$/.test(input.trim())) {
          return true;
        } else {
          throw Error('박스이름 형식 오류');
        }
      },
      filter(input) {
        return input.trim();
      }
    },
    {
      type: 'input',
      message: 'fullBarcode:',
      name: 'fullBarcode',
      validate(input) {
        if (input.trim().length === 11) {
          return true;
        } else {
          throw Error('바코드 길이 오류');
        }
      },
      filter(input) {
        return input.trim();
      }
    },
    {
      type: 'input',
      message: 'fileId:',
      name: 'fileId',
      validate(input) {
        if (input.trim().length === 16) {
          return true;
        } else {
          throw Error('파일명 길이 오류');
        }
      },
      filter(input) {
        return input.trim();
      }
    },
    {
      type: 'number',
      message: 'videoLength:',
      name: 'videoLength',
      validate(input) {
        if (typeof input === 'number') {
          return true;
        } else {
          throw Error('숫자를 입력해 주세요');
        }
      }
    },
    {
      type: 'input',
      message: 'createdAt (YYYY-MM-DD hh:mm:ss):',
      name: 'createdAt',
      validate(input) {
        if (dayjs(input).isValid()) {
          return true;
        } else {
          throw Error('올바른 날짜 형식이 아닙니다.');
        }
      },
      filter(input) {
        return dayjs(input).subtract(9, 'hours').format('YYYY-MM-DD hh:mm:ss');
      }
    }
  ])
  .then(async (answers) => {
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
        ${answers.fullBarcode.substring(2)}, ${answers.fullBarcode}, 0,
        '${answers.fileId}', '', '720p',
        0, 'ultrasound.mmtalk.kr', '${answers.fullBarcode}/${answers.fileId}.mp4',
        '${answers.createdAt}', NOW(), NOW()
      FROM
        devices
      WHERE
        deviceName = '${answers.deviceName}'
    `;

    try {
      const result = await db.query(insertQuery, { raw: true });
      console.log(`Insert Success, recording seq: ${result[0]}`);
    } catch (error) {
      console.log(error.parent.sqlMessage);
    }
  });
