import { spawn } from 'child_process';

const bucketFrom = 's3://ultrasound.mmtalk.kr';
const bucketTo = 's3://ultrasound-prod-kr-temp';
const profile = 'mmb-global-prod';
const startNumber = 0;
const endNumber = 99;

const logs = [];
let prefix = startNumber;
while (prefix <= endNumber) {
  s3cp(prefix);
  prefix++;
}

prompter();

function s3cp(prefix) {
  console.log('Run Process: ', prefix);

  if (!logs[prefix])
    logs[prefix] = {
      prefix: prefix.toString().padStart(2, '0'),
      status: 'start'
    };

  const cp = spawn('aws', ['s3', 'sync', bucketFrom, bucketTo, '--exclude', '*', '--include', prefix.toString().padStart(2, '0') + '*', '--profile', profile]);

  cp.stdout.on('data', (data) => {
    (logs[prefix].status = 'running'), (logs[prefix].message = data.toString());
  });

  cp.stderr.on('data', (data) => {
    (logs[prefix].status = 'error'), (logs[prefix].message = data.toString());
  });

  cp.on('exit', (data) => {
    (logs[prefix].status = 'exited'), (logs[prefix].message = data.toString());
  });
}

function prompter() {
  setInterval(() => {
    console.clear();
    console.log(logs);
  }, 1000);
}
