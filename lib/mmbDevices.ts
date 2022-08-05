'use strict'

import 'dotenv/config'
import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import dayjs from 'dayjs'

export async function dailyCheck (_: any, context: { functionName: string }) {
  try {
    const data = await getDeviceDetails()
    const refinedData = refineData(data)
    await uploadS3(refinedData)
  } catch (error) {
    console.log(error)
  }
}

async function getDeviceDetails () {
  return axios({
    method: 'GET',
    url: 'https://mda.mommytalk.kr/internal/device',
    headers: {
      'Content-type': 'application/json'
    }
  })
}

function refineData (rawData: AxiosResponse) {
  let data = rawData.data.map((device: any) => {
    if (device.device_detail &&
      device.device_detail.endpointUpstreamData &&
      device.device_detail.endpointUpstreamData.acme &&
      device.device_detail.endpointUpstreamData.acme.usbList) {
      const usbList = device.device_detail.endpointUpstreamData.acme.usbList
      let captureboardName = 'No Captureboard'

      _.each(usbList, (usb: { ID: string }) => {
        switch (usb.ID) {
          case '1164:f57a':
            captureboardName = '신캡 (유안 캡처보드)'
            break
          case '32ed:3200':
            captureboardName = '게임독 울트라 (이지캡 캡처보드)'
            break
          case '32ed:3201':
            captureboardName = '게임독 울트라v2 (이지캡 캡처보드)'
            break
          case '1bcf:2c99':
            captureboardName = '구캡 (랜스타 캡처보드)'
            break
          case '534d:0021':
            captureboardName = '아날로그 (이지캡)'
            break
        }
      })

      return {
        deviceSeq: device.seq,
        deviceName: device.deviceName,
        captureboardName
      }
    } else {
      return null
    }
  })

  data = _(data).omitBy(_.isUndefined).omitBy(_.isNull).value()

  return {
    count: _.countBy(data, 'captureboardName'),
    list: data,
    raw: rawData.data
  }
}

async function uploadS3 (data: any) {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-2'
  })

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_DEVICE_DAILY_LOG_BUCKET || 'device-daily-log',
      Key: `${dayjs().format('YYYY-MM-DD')}.json`,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000',
      ContentType: 'application/json; charset=UTF-8',
      Body: Buffer.from(JSON.stringify(_.omit(data, 'raw'), null, 4))
    })
  )

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_DEVICE_DAILY_LOG_BUCKET || 'device-daily-log',
      Key: `${dayjs().format('YYYY-MM-DD')}_raw.json`,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000',
      ContentType: 'application/json; charset=UTF-8',
      Body: Buffer.from(JSON.stringify(data.raw, null, 4))
    })
  )
}
