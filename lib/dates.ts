import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'

dayjs.extend(utc)
dayjs.extend(advancedFormat)

function humangateFilenameParser (filename: string, format: string = 'x') {
  const datestring = filename
    .replace('y', '-').replace('m', '-').replace('d(', ' ')
    .replace('h', ':').replace('m', ':').replace('s).mp4', '')

  return dayjs(datestring).utc().format(format)
}

function mothersFilenameParser (filename: string, format: string = 'x') {
  const datestring = filename.split('_')[0]

  return dayjs(datestring, 'YYYYMMDDHHmmss').utc().format(format)
}

export {
  humangateFilenameParser,
  mothersFilenameParser
}
