'use strict';

require('dotenv/config');
const axios = require('axios');
const _ = require('lodash');
const S3 = require('@aws-sdk/client-s3');
const dayjs = require('dayjs');

const captureboardNames = [
  { seq: 0, name: 'No Captureboard' },
  { seq: 1, name: '신캡 (유안 캡처보드)' },
  { seq: 2, name: '게임독 울트라 (이지캡 캡처보드)' },
  { seq: 3, name: '게임독 울트라v2 (이지캡 캡처보드)' },
  { seq: 4, name: '구캡 (랜스타 캡처보드)' },
  { seq: 5, name: '아날로그 (이지캡)' }
];

module.exports.dailyCheck = async function main(event, context) {
  const time = new Date();
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);
  const data = await getDeviceDetails();
  const refinedData = refineData(data);
  console.log(refinedData);
};

async function main() {
  const data = await getDeviceDetails();
  const refinedData = refineData(data);
  await uploadS3(refinedData);
}

main();

async function getDeviceDetails() {
  return axios({
    method: 'GET',
    url: 'https://mda.mommytalk.kr/internal/device',
    headers: {
      'Content-type': 'application/json'
    }
  });
}

function refineData(rawData) {
  let data = rawData.data.map((device) => {
    if (device.device_detail && device.device_detail.endpointUpstreamData && device.device_detail.endpointUpstreamData.acme && device.device_detail.endpointUpstreamData.acme.usbList) {
      const usbList = device.device_detail.endpointUpstreamData.acme.usbList;
      let captureboardName = 'No Captureboard';

      usbList.map((usb) => {
        switch (usb.ID) {
          case '1164:f57a':
            captureboardName = '신캡 (유안 캡처보드)';
            break;
          case '32ed:3200':
            captureboardName = '게임독 울트라 (이지캡 캡처보드)';
            break;
          case '32ed:3201':
            captureboardName = '게임독 울트라v2 (이지캡 캡처보드)';
            break;
          case '1bcf:2c99':
            captureboardName = '구캡 (랜스타 캡처보드)';
            break;
          case '534d:0021':
            captureboardName = '아날로그 (이지캡)';
            break;
        }
      });

      return {
        deviceSeq: device.seq,
        deviceName: device.deviceName,
        captureboardName
      };
    }
  });

  data = _(data).omitBy(_.isUndefined).omitBy(_.isNull).value();

  return {
    count: _.countBy(data, 'captureboardName'),
    list: data,
    raw: rawData.data
  };
}

async function uploadS3(data) {
  const s3Client = new S3.S3Client({ region: process.env.AWS_REGION || 'ap-northeast-2' });

  try {
    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: process.env.S3_DEVICE_DAILY_LOG_BUCKET || 'device-daily-log',
        Key: `${dayjs().format('YYYY-MM-DD')}.json`,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000',
        ContentType: 'application/json; charset=UTF-8',
        Body: Buffer.from(JSON.stringify(_.omit(data, 'raw'), null, 4))
      })
    );

    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: process.env.S3_DEVICE_DAILY_LOG_BUCKET || 'device-daily-log',
        Key: `${dayjs().format('YYYY-MM-DD')}_raw.json`,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000',
        ContentType: 'application/json; charset=UTF-8',
        Body: Buffer.from(JSON.stringify(data.raw, null, 4))
      })
    );
  } catch (error) {
    console.log(error);
    throw new Error('Upload failed', error);
  }
}
