var Q = require('q'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    swig = require('swig'),
    log4js = require('log4js'),
    mkdirp = require('mkdirp'),
    sh = require('shelljs');

var child_process = require('child_process');
var exec = child_process.execSync;

var log = log4js.getLogger('sh');

/**********************************************************************************************************************
 ** GENERAL
 *********************************************************************************************************************/
module.exports.exists = exists;
module.exports.mkdir = mkdir;
module.exports.rm = rm;
module.exports.mv = mv;
module.exports.cp = cp;
module.exports.chmod = chmod;
module.exports.chown = chown;
module.exports.pidof = pidof;
module.exports.kill = kill;
module.exports.tar = tar;
module.exports.unzip = unzip;


function exists(path, options) {
    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('[ -e ' + path + ' ] && echo true || echo false ');

    return command(cmd.join(' '), true);
}

function mkdir(path, options) {
    return exists(path, {sudo: options && options.sudo})
        .then(function(exists) {
            if (exists) return true;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('mkdir');
            if (options && options.flags) cmd.push('-' + options.flags);
            cmd.push('"' + path + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function rm(path, options) {
    return exists(path, {sudo: options && options.sudo})
        .then(function(exists) {
            if (!exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('rm');

            if (options && options.flags) cmd.push('-' + options.flags);

            cmd.push('"' + path + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function mv(source, target, options) {
    return exists(source, {sudo: options && options.sudo})
        .then(function(exists) {
            if (! exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('mv');

            if (options && options.flags) cmd.push('-' + options.flags);

            cmd.push('"' + source + '"');
            cmd.push('"' + target + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function cp(source, target, options) {
    return exists(source, {sudo: options && options.sudo})
        .then(function(exists) {
            if (! exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('cp');

            if (options && options.flags) cmd.push('-' + options.flags);

            cmd.push('"' + source + '"');
            cmd.push('"' + target + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function chmod(path, mode, options) {
    return exists(path, {sudo: options && options.sudo})
        .then(function(exists) {
            if (! exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('chmod');

            if (options && options.flags) cmd.push('-' + options.flags);

            cmd.push(mode);
            cmd.push('"' + path + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function chown(path, owner, options) {
    return exists(path, {sudo: options && options.sudo})
        .then(function(exists) {
            if (! exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('chown');

            if (options && options.flags) cmd.push('-' + options.flags);

            cmd.push(owner);
            cmd.push('"' + path + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function pidof(program, options) {
    var cmd = ['RES=$('];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('pidof');

    cmd.push(program);
    cmd.push(') && echo $RES || echo -1');

    return command(cmd.join(' '))
        .then(function(output) {
            return parseInt(output);
        });
}

function kill(pid, signal, options) {
    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('kill');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push('-' + signal);
    cmd.push(pid);

    cmd.push(' && echo true || echo false');

    return command(cmd.join(' '), true).then(function(output) {
        if (!output) {
            log.warn('Unable to send pid ' + pid + ' a -' + signal + ' signal');
        }

        return output;
    });
}

function tar(archive, options) {
    return exists(archive, {sudo: options && options.sudo})
        .then(function(exists) {
            if (!exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('tar');

            if (options && options.flags) cmd.push('-' + options.flags);
            if (options && options.dest) cmd.push('-C ' + options.dest);

            cmd.push('"' + archive + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function unzip(archive, options) {
    return exists(archive, {sudo: options && options.sudo})
        .then(function(exists) {
            if (! exists) return false;

            var cmd = [];
            if (options && options.sudo) cmd.push('sudo');
            cmd.push('unzip');
            cmd.push('-qq -o');

            if (options && options.dest) {
                mkdir(options.dest, {sudo: options.sudo, flags: 'p'});
                cmd.push('-d ' + options.dest);
            }

            cmd.push('"' + archive + '"');

            cmd.push(' && echo true || echo false');

            return command(cmd.join(' '), true);
        });
}

function command(cmd, asJson) {
    var defer = Q.defer();
    try {
        log.trace(cmd);
        var res = exec(cmd);

        if (res) res = res.toString();

        defer.resolve(res);
    } catch (error) {
        defer.reject(error);
    }

    return defer.promise;
}