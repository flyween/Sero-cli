var fs = require('fs');
var path = require('path');
var inquirer = require('inquirer');
var request = require('request');
var TaskRunner = require('terminal-task-runner');
var Shell = TaskRunner.shell;
var Base = TaskRunner.Base;
var logger = TaskRunner.logger;

var MAIL_REG = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


var options = {
    url: 'https://api.github.com/user/repos',
    method: 'POST',
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'leftstick@qq.com',
        'Content-type': 'application/json; charset=utf-8'
    },
    auth: {
        user: '',
        pass: ''
    },
    encoding: 'utf-8',
    body: {
        'name': '',
        'description': '',
        'auto_init': true,
        'license_template': 'mit'
    }
};


var Task = Base.extend({
    id: 'CreateGitRepo',
    name: 'Create a brand new repository on Github',
    position: 5,
    run: function (cons) {

        inquirer.prompt([{
            type: 'input',
            name: 'username',
            message: 'Username or Email for Github',
            default: process.env.USERNAME
        }, {
            type: 'password',
            name: 'password',
            message: 'Password for Github',
            validate: function (pass) {
                return !!pass;
            }
        }, {
            type: 'input',
            name: 'proName',
            message: 'Project name to be created',
            validate: function (pass) {
                return !!pass;
            }
        }, {
            type: 'input',
            name: 'proDesc',
            message: 'Project description'
        }], function (answer) {
            options.auth.user = answer.username;
            options.auth.pass = answer.password;
            options.body.name = answer.proName;
            options.body.description = answer.proDesc;
            options.body = JSON.stringify(options.body);

            answer.localPath = path.join('.', answer.proName);


            fs.exists(answer.localPath, function (exists) {
                if (exists) {
                    cons('The directory [' + answer.proName + '] is already exist.');
                    return;
                }

                request(options, function (err, incoming, response) {
                    var res = JSON.parse(response);
                    if (err) {
                        cons(err);
                        return;
                    }
                    if (res.errors) {
                        cons(res.errors[0].message);
                        return;
                    }
                    if (res.message) {
                        cons(res.message);
                        return;
                    }
                    logger.success('Repository [' + answer.proName + '] is created!');

                    var exec = new Shell(['git clone ' + res.ssh_url]);

                    exec.start().then(function () {
                        cons();
                        return;
                    }, function (err) {
                        cons(err);
                        return;
                    });
                });

            });

        });


    }
});


module.exports = Task;