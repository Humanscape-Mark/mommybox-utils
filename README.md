# Box 유틸 모음

## 기능들
- 01-uploadRecording
초음파 영상 업로드

- 02-migrateHumancity
휴먼시티 영상 이전

- 03-migrateMothers
마더스 영상 이전

- 04-createThumbnail
썸네일 이미지 생성

- 05-generateRandom
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

// KR
BOX_UPLOADER_URL_KR_DEV
BOX_UPLOADER_URL_KR_PROD
BOX_UPLOADER_KR_JWT_SECRET

// ID
BOX_UPLOADER_URL_ID_DEV
BOX_UPLOADER_URL_ID_PROD
BOX_UPLOADER_ID_JWT_SECRET

// US
BOX_UPLOADER_URL_US_DEV
BOX_UPLOADER_URL_US_PROD
BOX_UPLOADER_US_JWT_SECRET

S3_HUMANGATE_BUCKET_NAME
S3_MOTHERS_BUCKET_NAME

MIGRATION_DB_HOST
MIGRATION_DB_DATABASE
MIGRATION_DB_USER
MIGRATION_DB_PASSWORD
```

## TODO
npm start 스크립트 설정