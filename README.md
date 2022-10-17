# Box 유틸 모음

## 기능들
- 01-uploadRecording
초음파 영상 업로드

- 02-migrateHumancity
휴먼시티 영상 이전 쿼리 생성기

- 03-mmbDevices
마미박스 현재정보 S3에 업로드/기록 (sls)

- 04-generateRandom
랜덤 파일명 생성

## 실행방법
ts-node로 실행하면 편합니다
```
npm i -g ts-node
ts-node index.ts
```

## 필요 env (.env)
```
UPLOAD_DEFAULT_PATH // 없으면 home 경로

S3_DEVICE_DAILY_LOG_BUCKET

BOX_UPLOADER_URL_KR_DEV
BOX_UPLOADER_URL_KR_PROD
BOX_UPLOADER_KR_JWT_SECRET

BOX_UPLOADER_URL_ID_DEV
BOX_UPLOADER_URL_ID_PROD
BOX_UPLOADER_ID_JWT_SECRET
```

## TODO
npm start 스크립트 설정