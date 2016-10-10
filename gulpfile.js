var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var runSequence = require('run-sequence');
var fs = require('fs');
var path = require('path');
var process = require('process');

// Nuevas
var templateCache = require('gulp-angular-templatecache');
var ngAnnotate = require('gulp-ng-annotate');
var useref = require('gulp-useref');


var paths = {
    sass: ['./scss/**/*.scss'],
    templatecache: ['./www/app/**/*.html'],
    ng_annotate: ['./www/app/**/*.js'],
    useref: ['./www/app/**/*.html']
};


var APP_NAME = "appName"; // No spaces
var dropboxAuth = "DROPBOX_API_TOKEN";


gulp.task('default', ['sass' , 'useref']);


gulp.task('sass', function (done) {
    gulp.src('./scss/ionic.app.scss')
        .pipe(sass())
        .on('error', sass.logError)
        .pipe(gulp.dest('./www/css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({ extname: '.min.css' }))
        .pipe(gulp.dest('./www/css/'))
        .on('end', done);
});


gulp.task('templatecache', function (done) {
    gulp.src('./www/app/**/*.html')
        .pipe(templateCache({standalone: true}))
        .pipe(gulp.dest('./www/app'))
        .on('end', done);
});


gulp.task('ng_annotate', function (done) {
    gulp.src('./www/app/**/*.js')
        .pipe(ngAnnotate({single_quotes: true}))
        .pipe(gulp.dest('./www/dist/dist_js/app'))
        .on('end', done);
});


gulp.task('useref', ['templatecache'], function (done) {
    gulp.src('./www/*.html')
        .pipe(useref())
        .pipe(gulp.dest('./www/dist'))
        .on('end', done);
});


gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
    gulp.watch(paths.templatecache, ['templatecache']);
//    gulp.watch(paths.ng_annotate, ['ng_annotate']);
    gulp.watch(paths.useref, ['useref']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});


gulp.task('removeDefaultUglify', function (done) {
    var defaultUglifyFilePath = path.resolve(__dirname, 'hooks/after_prepare/uglify.js');
    fs.stat(defaultUglifyFilePath, function (err, stat) {
        if (err == null) {
            fs.unlinkSync(defaultUglifyFilePath);
            console.log("default uglify.js file removed from hooks");
        } else {
            // console.log(err.code);
        }
    });
    done();
});


gulp.task('prepareAndroidRelease', function (done) {
    gulp.src('release-signing.properties')
        .pipe(gulp.dest('platforms/android/'))
        .on('end', done);
});


// Called on hooks/before_prepare
gulp.task('buildDistFolder', function (done) {
    runSequence('lint', 'useref', 'removeDefaultUglify', done);
});


// called on hooks/after_build
gulp.task('renameAndroidApks', function (done) {
    var pjson = require('./package.json');
    var rename = require('gulp-rename');
    gulp.src("./platforms/android/build/outputs/apk/android-debug.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_debug.apk"))
        .pipe(gulp.dest("./apks"));
    gulp.src("./platforms/android/build/outputs/apk/android-armv7-debug.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_armv7_debug.apk"))
        .pipe(gulp.dest("./apks"));
    gulp.src("./platforms/android/build/outputs/apk/android-x86-debug.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_x86_debug.apk"))
        .pipe(gulp.dest("./apks"));

    gulp.src("./platforms/android/build/outputs/apk/android-armv7-release.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_armv7_release.apk"))
        .pipe(gulp.dest("./apks"));
    gulp.src("./platforms/android/build/outputs/apk/android-x86-release.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_x86_release.apk"))
        .pipe(gulp.dest("./apks"));
    gulp.src("./platforms/android/build/outputs/apk/android-release.apk")
        .pipe(rename(APP_NAME + "_v." + pjson.version + "_release.apk"))
        .pipe(gulp.dest("./apks"));
    console.log(
        gutil.colors.green('\n************************************************\n') +
            ' ' + gutil.colors.blue(APP_NAME + ' version(' + pjson.version + ') apks generated!!!\n',
            ' files in path: {root}/apks\n') +
            gutil.colors.green('************************************************\n')
    );
    done();
});


// Para generar Apks Android Release
gulp.task('androidRelease', function (done) {
    require('shelljs/global');
    if (exec('ionic build android --release').code !== 0) {
        echo('Error: ionic build android --release failed');
        exit(1);
    }
    done();
});


// FASTLANE - Checks if fastlane is installed
gulp.task('checkFastlane', function (done) {
    require('shelljs/global');
    console.log(gutil.colors.green('Checking fastlane installation...'));
    if (exec('fastlane --version').code !== 0) {
        console.log(gutil.colors.red('\nError: fastlane not installed'));
        console.log(gutil.colors.blue('Run following command from desired platform folder:\nsudo gem install fastlane --verbose'));
        console.log(gutil.colors.green('More info:\nhttps://github.com/fastlane/fastlane\n'));
        exit(1);
    }
    done();
});


// FASTLANE - Copy Android Fastlane to Platform
gulp.task('prepareAndroidFastlane', function (done) {
    gulp.src(['fastlane-android/**/*','!fastlane-android/**/*.p12'])
        .pipe(gulp.dest('platforms/android/fastlane'))
        .on('end', done);
});

// FASTLANE - Copy iOS Fastlane to Platform
gulp.task('prepareiOSFastlane', function (done) {
    gulp.src('fastlane-ios/**/*')
        .pipe(gulp.dest('platforms/ios/fastlane'))
        .on('end', done);
});


// FASTLANE - Upload Play Store App Info
gulp.task('uploadAndroidMetadata', function (done) {
    require('shelljs/global');
    process.chdir('platforms');
    process.chdir('android');
    if (exec('supply run').code !== 0) {
        echo('Error: supply run failed');
        exit(1);
    }
    done();
});

// FASTLANE - Upload App Store App Info
gulp.task('uploadiOSMetadata', function (done) {
    require('shelljs/global');
    process.chdir('platforms');
    process.chdir('ios');
    if (exec('deliver').code !== 0) {
        echo('Error: deliver failed');
        exit(1);
    }
    done();
});


// FASTLANE - Upload Android Apk to Alpha Channel
gulp.task('uploadAndroidx86Alpha', ['checkFastlane'], function (done) {
    var pjson = require('./package.json');
    var rename = require('gulp-rename');
    require('shelljs/global');
    process.chdir('platforms');
    process.chdir('android');
    if (exec('supply --apk ../../apks/' + APP_NAME + '_v.' + pjson.version + '_x86_release.apk --track alpha').code !== 0) {
        echo('Error: supply --apk failed');
        exit(1);
    }
    process.chdir('../../');
    done();
});


// FASTLANE - Upload Android Apk to Alpha Channel
gulp.task('uploadAndroidarmAlpha', ['checkFastlane'], function (done) {
    var pjson = require('./package.json');
    var rename = require('gulp-rename');
    require('shelljs/global');
    process.chdir('platforms');
    process.chdir('android');
    if (exec('supply --apk ../../apks/' + APP_NAME + '_v.' + pjson.version + '_armv7_release.apk --track alpha').code !== 0) {
        echo('Error: supply --apk failed');
        exit(1);
    }
    process.chdir('../../');
    done();
});


// FASTLANE - Upload Android Metadata to Google play
gulp.task('androidMetadata', function (done) {
    runSequence('prepareAndroidFastlane', 'uploadAndroidMetadata', done);
});


// FASTLANE - Build Android Release & Upload Metadata
gulp.task('androidAlpha', function (done) {
    runSequence('androidRelease', 'prepareAndroidFastlane', 'uploadAndroidarmAlpha', 'uploadAndroidx86Alpha', 'androidDevConsoleTip', done);
});

// FASTLANE - Upload Android Metadata to Google play
gulp.task('androidDevConsoleTip', function (done) {
    var pjson = require('./package.json');
    console.log(gutil.colors.green('\n********************************************************************'));
    console.log(gutil.colors.blue(' ' + APP_NAME + ' version(' + pjson.version + ') uploaded to Alpha Testing!!!'));
    console.log(gutil.colors.blue('\n Next steps:'));
    console.log(gutil.colors.blue(' 1. goto: https://play.google.com/apps/publish'));
    console.log(gutil.colors.blue(' 2. in APK-Alpha Testing, enable Advanced Mode'));
    console.log(gutil.colors.blue(' 3. check if both x86 & armeabi-v7 STATUS are in ALPHA'));
    console.log(gutil.colors.blue(' 4. publish changes'));
    console.log(gutil.colors.blue(' 5. That\'s all wait a few hours while the changes are applied ;)'));
    console.log(gutil.colors.green('********************************************************************'));
});



var gulp = require('gulp'),
    eslint = require('gulp-eslint');

gulp.task('lintDefault', function () {
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.
    return gulp.src('./www/app/**/*.js')
        // eslint() attaches the lint output to the "eslint" property
        // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});


gulp.task('lint', function () {
return gulp.src('./www/app/**/*.js')
    .pipe(eslint({
        extends: 'eslint:recommended',
        ecmaFeatures: {
            'modules': true
        },
        rules: {
            //'my-custom-rule': 1,
            //'strict': 2
            'no-alert': 2
        },
        globals: {
            'angular':false,
            'window':false, // Better use $window if possible
            'cordova':false,
            'StatusBar':false,
            'Camera':false,
            'CameraPopoverOptions':false,
            'FileTransfer':false,
            'FileUploadOptions':false,
            'DOMINIO':false,
            'FRIENDLY_LOGIN_HELPER':false,
            'S3_STORAGE_URL':false,
            'USER':false,
            'PASS':false,
            'moment':false,
            'StackTrace':false
        },
        envs: [
            'node'
        ]
    }))
    .pipe(eslint.formatEach('stylish', process.stderr));
    //.pipe(eslint.failAfterError());
});


/*
 * Dropbox
 *
 * Para generar token de acceso
 * https://dropbox.github.io/dropbox-api-v2-explorer/#auth_token/revoke
 *
 */

gulp.task('rundrop', function (done) {
    runSequence('androidRelease', 'drop', 'hipchat',done);
});

gulp.task('drop', function (done) {
    runSequence('droparm', 'dropx86', done);
});

gulp.task('droparm', function (done) {
    var http = require("https");
    var pjson = require('./package.json');
    var appName = APP_NAME + '_v.' + pjson.version + '_armv7_release.apk';
    var dropFilePath = '{"path":"/DROPBOX/DIR/PATH/' + appName + '" }';
    var options = {
        host: 'content.dropboxapi.com',
        port: 443,
        method: 'POST',
        path: '/2/files/upload',
        headers: {'Authorization': 'Bearer ' + dropboxAuth, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': dropFilePath}
    };

    var data = "{\"path\":\"/ideable\"}";

    var callback = function (response) {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("file uploaded");
            console.log("response - " + str);
            done();
        });
    };

    var request = http.request(options, callback);
    var stream = fs.createReadStream('apks/' + appName);
    stream.on('data', function (data) {
        request.write(data);
    });
    stream.on('end', function () {
        console.log("file readed, uploading " + appName + " to dropbox...");
        request.end();
    });
});


gulp.task('dropx86', function (done) {
    var http = require("https");
    var pjson = require('./package.json');
    var appName = APP_NAME + '_v.' + pjson.version + '_x86_release.apk';
    var dropFilePath = '{"path":"/DROPBOX/DIR/PATH/' + appName + '" }';
    var options = {
        host: 'content.dropboxapi.com',
        port: 443,
        method: 'POST',
        path: '/2/files/upload',
        headers: {'Authorization': 'Bearer ' + dropboxAuth, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': dropFilePath}
    };

    var data = "{\"path\":\"/ideable\"}";

    var callback = function (response) {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("file uploaded");
            console.log("response - " + str);
            done();
        });
    };

    var request = http.request(options, callback);
    request.on('end', function () {
        done();
    });
    var stream = fs.createReadStream('apks/' + appName);
    stream.on('data', function (data) {
        //console.log("reading file ...");
        request.write(data);
    });
    stream.on('end', function () {
        console.log("file readed, uploading " + appName + " to dropbox...");
        request.end();
    });
});


/*
 * Hipchat Integration
 *
 * https://github.com/jacopotarantino/gulp-hipchat
 * https://github.com/nkohari/node-hipchat
 */

gulp.task('hipchat', function (done) {
    var gulp = require('gulp');
    var hipchat = require('node-hipchat');
    var HC = new hipchat('CODE');
    var pjson = require('./package.json');
    var appName = APP_NAME + '_v.' + pjson.version + '_armv7_release.apk';
    var devsRoom = ROOMID;
    var testersRoom = ROOMID;

    var params = {
        room: devsRoom,
        from: 'AUTHOR',
        message:'<strong>' + APP_NAME + '</strong> - Update available!<br>File: <strong><a href="https://www.dropbox.com/URL">' + appName + '</a></strong>',
        color: 'green',
        notify: true
    };

    HC.postMessage(params, function (data) {
        console.log("Message has been sent!");
    });

    var params = {
        room: testersRoom,
        from: 'AUTHOR',
        message:'<strong>' + APP_NAME + '</strong> - Update available!<br>File: <strong><a href="https://www.dropbox.com/URL">' + appName + '</a></strong>',
        color: 'green',
        notify: true
    };

    HC.postMessage(params, function (data) {
        console.log("Message has been sent!");
    });

});
