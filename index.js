import 'dotenv/config';
import fs from 'fs';
import inquirer from 'inquirer';

inquirer
  .prompt({
    type: 'list',
    name: 'func',
    message: 'Select function',
    choices: fs.readdirSync('./lib').map((filename) => filename.split('.')[0])
  })
  .then(async (result) => {
    await import(`./lib/${result.func}.js`);
  });
