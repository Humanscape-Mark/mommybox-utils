# Box 유틸 모음

## 기능들
- generateRandom
    랜덤 파일명 생성

- insertRecording
영상 업로드 (한국 전용)

- migrateHumancity
휴먼시티 영상 이전 쿼리 생성기

- mmbDevices
마미박스 현재정보 S3에 업로드/기록 (sls)

- uploadRecording
SLS 영상 업로드 (인도네시아용)


## 필요 env (.env)
```
MYSQL_HOST
MYSQL_PORT
MYSQL_DB
MYSQL_USERNAME
MYSQL_PASSWORD

S3_ULTRASOUND_BUCKET
S3_DEVICE_DAILY_LOG_BUCKET

COUNTRY_CODE
BOX_UPLOADER_URL_DEV
BOX_UPLOADER_URL_PROD
UPLOADER_JWT_TOKEN
```