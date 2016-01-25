var Q = require('q'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    swig = require('swig'),
    log4js = require('log4js'),
    mkdirp = require('mkdirp'),
    sh = require('shelljs');

var deasync = require('deasync');
var child_process = require('child_process');
var exec = deasync(child_process.exec);

var log = log4js.getLogger();

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

    var res = exec(cmd.join(' '));

    log.debug('exists: ' + cmd.join(' ') + ' = ' + res);
    return JSON.parse(res);
}

function mkdir(path, options) {
    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('mkdir');
    if (options && options.flags) cmd.push('-' + options.flags);
    cmd.push('"' + path + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function rm(path, options) {
    try {
        if (!exists(path, {sudo: options && options.sudo})) {
            return true;
        }

        var cmd = [];
        if (options && options.sudo) cmd.push('sudo');
        cmd.push('rm');

        if (options && options.flags) cmd.push('-' + options.flags);

        cmd.push('"' + path + '"');

        cmd.push(' && echo true || echo false');

        var res = exec(cmd.join(' '));
        return JSON.parse(res);
    } catch (error) {
        log.error(error);
        return false;
    }
}

function mv(source, target, options) {
    if (! exists(source, {sudo: options && options.sudo})) return false;

    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('mv');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push('"' + source + '"');
    cmd.push('"' + target + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function cp(source, target, options) {
    if (! exists(source, {sudo: options && options.sudo})) return false;

    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('cp');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push('"' + source + '"');
    cmd.push('"' + target + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function chmod(path, mode, options) {
    if (! exists(path, {sudo: options && options.sudo})) return false;

    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('chmod');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push(mode);
    cmd.push('"' + path + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function chown(path, owner, options) {
    if (! exists(path, {sudo: options && options.sudo})) return false;

    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('chown');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push(owner);
    cmd.push('"' + path + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function pidof(program, options) {
    var cmd = ['RES=$('];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('pidof');

    cmd.push(program);
    cmd.push(') && echo $RES || echo -1');

    return JSON.parse(exec(cmd.join(' ')));
}

function kill(pid, signal, options) {
    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('kill');

    if (options && options.flags) cmd.push('-' + options.flags);

    cmd.push('-' + signal);
    cmd.push(pid);

    cmd.push(' && echo true || echo false');

    var result = JSON.parse(exec(cmd.join(' ')));

    if (!result) {
        log.warn('Unable to send pid ' + pid + ' a -' + signal + ' signal');
    }

    return result;
}

function tar(archive, options) {
    if (! exists(archive, {sudo: options && options.sudo})) return false;

    var cmd = [];
    if (options && options.sudo) cmd.push('sudo');
    cmd.push('tar');

    if (options && options.flags) cmd.push('-' + options.flags);
    if (options && options.dest) cmd.push('-C ' + options.dest);

    cmd.push('"' + archive + '"');

    cmd.push(' && echo true || echo false');

    return JSON.parse(exec(cmd.join(' ')));
}

function unzip(archive, options) {
    if (! exists(archive, {sudo: options && options.sudo})) return false;

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

    console.log(cmd.join(' '));
    var res = exec(cmd.join(' '));

    return JSON.parse(res);
}