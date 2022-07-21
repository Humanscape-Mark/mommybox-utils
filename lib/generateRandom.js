import inquirer from 'inquirer';

function generateRandom(length = 16) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export default inquirer
  .prompt([
    {
      type: 'number',
      message: 'string length:',
      name: 'stringlength',
      default: 16,
      validate(input) {
        if (typeof input === 'number') {
          return true;
        } else {
          throw Error('숫자를 입력해 주세요');
        }
      }
    }
  ])
  .then((result) => {
    console.log(`Generated String: ${generateRandom(result.stringlength)}`);
  });
