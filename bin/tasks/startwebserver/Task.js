'use strict';
var TaskRunner = require('terminal-task-runner');
var Base = TaskRunner.Base;

var isInt = function(val) {
    return !isNaN(parseInt(val));
};

var compileLess = function(lessPath, dest, paths) {
    var gulp = require('gulp');
    var less = require('gulp-less');
    var prefix = require('gulp-autoprefixer');
    var sourcemap = require('gulp-sourcemaps');
    var plumber = require('gulp-plumber');

    gulp.src(lessPath + '/main.less')
        .pipe(plumber())
        .pipe(sourcemap.init())
        .pipe(less({
            paths: paths,
            compress: false
        }))
        .pipe(sourcemap.write())
        .pipe(prefix({
            browsers: ['last 5 versions'],
            cascade: true
        }))
        .pipe(gulp.dest(dest));

    TaskRunner.logger.info(lessPath + '/main.less was compiled');
};


var Task = Base.extend({
    id: 'StartWebServer',
    name: 'Start a static web server for current working directory',
    position: 2,
    command: 'server',
    options: [{
        flags: '-r, --root <root>',
        description: 'specify the root path of the static webserver'
    }, {
        flags: '-p, --port <port>',
        description: 'specify the port of the static webserver'
    }, {
        flags: '-le, --paths [paths]',
        description: 'specify the less paths'
    }, {
        flags: '-l, --livereload',
        description: 'specify whether to enable livereload'
    }],
    check: function(cmd) {
        return cmd.root && cmd.port;
    },
    run: function(cons) {
        var _this = this;
        var fs = require('fs');
        var path = require('path');

        this.prompt([{
            type: 'input',
            name: 'root',
            message: 'root for webserver',
            default: '.'
        }, {
            type: 'input',
            name: 'port',
            message: 'port for webserver',
            default: this.get('webserverport', 8080),
            validate: function(pass) {
                return isInt(pass);
            }
        }, {
            type: 'input',
            name: 'paths',
            message: 'paths for less(separate in comma)',
            when: function(pass) {
                return fs.existsSync(path.join(pass.root, 'less'));
            }
        }, {
            type: 'confirm',
            name: 'livereload',
            message: 'would you like to have livereload?',
            default: true
        }], function(answer) {
            _this.action(answer, cons);
        });
    },
    action: function(answer, cons) {

        if (!isInt(answer.port)) {
            cons('port must be int');
            return;
        }

        var gulp = require('gulp');
        var path = require('path');
        var fs = require('fs');
        var webserver = require('gulp-webserver');

        var _this = this;


        _this.put({
            webserverport: answer.port
        });

        var lessPath = path.join(answer.root, 'less');
        var dest = path.join(answer.root, 'css');

        var paths = [];

        if (answer.paths) {
            answer.paths.split(',').forEach(function(p) {
                paths.push(path.join(answer.root, p));
            });
        }

        fs.exists(lessPath, function(exists) {
            if (!exists) {
                return;
            }
            compileLess(lessPath, dest, paths);
        });

        var stream = gulp.src(answer.root)
            .pipe(webserver({
                host: '0.0.0.0',
                port: answer.port,
                livereload: answer.livereload,
                directoryListing: false,
                fallback: 'index.html'
            }));

        stream.on('error', function(err) {
            cons(err);
        });

        stream.on('close', function() {
            cons();
        });

        stream.on('finish', function() {
            cons();
        });

        fs.exists(lessPath, function(exists) {
            if (!exists) {
                return;
            }
            gulp.watch(lessPath + '/**/*', function(event) {
                compileLess(lessPath, dest, paths);
            });
        });

    }
});


module.exports = Task;
