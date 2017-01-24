#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const inquirer = require('inquirer');
const path = require('path');
const program = require('commander');
const scaffold = require('scaffold-generator');
const version = require('./package.json').version;
const fs = require('fs');
const execSync = require('child_process').execSync;

program
    .version(version)
    .option('-o, --override', 'Override any existing files')
    .arguments('<source> <destination>', '"source" is the path to the dir containing the template and hooks dirs, "destination" is the desired location of the project')
    .action(action);

function action(source, destination) {

    let hooksDir = path.join(source, "hooks");
    let tplDir = path.join(source, "template");
    let hooks = {
        pre: 'pre.hook',
        post: 'post.hook'
    };

    const variables = require(path.join(tplDir, 'template-variables.json'));
    let questions = [];
    for (let key of Object.keys(variables)) {
        questions.push({
            type : 'input',
            name : key,
            message: key
        })
    }

    inquirer
        .prompt(questions)
        .then(answers => {
            console.log(chalk.yellow(`This ${program.override ? 'will' : 'will not'} override existing files`));

            console.log(chalk.green('Data used for templating:'));
            console.log(chalk.cyan(JSON.stringify(answers, null, 4)));

            //run pre hook, if exists
            let preHook = path.join(hooksDir, hooks.pre);
            runHook(preHook, source, answers);

            scaffold({
                    data: answers,
                    open: '{{{%',
                    close: '%}}}',
                    override: program.override,
                    noBackup: program.override
                })
                .copy(tplDir, destination, err => {

                    if (err) {
                        console.log(chalk.red('ERROR:'));
                        console.log(err);
                    } else {
                        console.log(chalk.green('Scaffolding complete.'));
                        console.log(chalk.green(`New project is at: ${destination}`));

                        //run post hook, if exists
                        let postHook = path.join(hooksDir, hooks.post);
                        runHook(postHook, destination, answers);
                    }
                });
        });

}


function runHook(hook, cwd, answers) {
    if (!fs.existsSync(hook)) {
        return false;
    }

    let cmd = `${hook} ${JSON.stringify(answers)}`;
    execSync(cmd, {cwd: cwd, stdio: 'inherit'});

}


program.on('--help', function(){
    console.log(chalk.blue('  Notes:'));
    console.log('');
    console.log(chalk.blue('Requires node 6+'));
    console.log(chalk.blue('The template delimiters are {{{% and %}}}'));
    console.log('');
});

program.parse(process.argv);
