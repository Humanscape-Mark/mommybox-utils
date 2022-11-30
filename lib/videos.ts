import path from 'path'
import ffmpeg from 'fluent-ffmpeg'

export function getVideoLength (filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .ffprobe((err, metadata) => {
        if (err) reject(err)
        resolve(Math.round(metadata.format.duration || 0))
      })
  })
}

export function createVideoThumbnail (baseDir:string, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(path.join(baseDir, fileName))
      .screenshot({
        count: 1,
        filename: fileName.replace('mp4', 'jpg'),
        folder: baseDir
      })
      .on('end', () => {
        return resolve()
      })
  })
}
