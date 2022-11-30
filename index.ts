import 'dotenv/config'
import * as fs from 'fs'
import inquirer from 'inquirer'

inquirer
  .prompt({
    type: 'list',
    name: 'func',
    message: 'Select function',
    choices: fs.readdirSync('./commands').map((filename) => filename.split('.')[0])
  })
  .then(async (result) => {
    await import(`./commands/${result.func}.ts`)
  })
