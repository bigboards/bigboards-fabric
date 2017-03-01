var os = require('os'),
    Q = require('q');

var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var Log4js = require('log4js');

var sh = require('../utils/sh-utils'),
    su = require('../utils/sys-utils'),
    fs = require('../utils/fs-utils');

var Errors = require('../errors');
var logger = Log4js.getLogger('daemon.nomad');
var settings = require('../settings');

function Nomad() {
    this.home = process.cwd();
    this.command = this.home + '/lib/' + su.platform() + '/' + su.architecture() + '/nomad';

    this.sudo = false;

    this.child = null;

    function shutdownHandler(command, sudo) {
        return function() {
            sh.pidof(command, {sudo: sudo})
                .then(function(pid) {
                    if (!pid || pid == -1) {
                        logger.error('Unable to stop nomad since no PID could be found for the process');
                    } else {
                        logger.warn('Stopping nomad by sending it the kill signal');
                        return sh.kill(pid, 9, {sudo: sudo}).then(function() {
                            logger.warn('Stopped nomad.');
                        });
                    }
                });
        }
    }

    process.on('SIGINT', function() { process.exit(0); });
    process.on('exit', shutdownHandler(this.command, this.sudo));
    process.on('uncaughtException', function(error) {
        logger.error(error);
        process.exit(1);
    });
}

Nomad.prototype.client = function() {
    return null;
};

/* ===================================================================================================================
   == Start & Stop
   ================================================================================================================ */

Nomad.prototype.status = function() {
    logger.trace("STATUS");

    return this.isRunning()
        .then(function(running) {
            return {
                daemon: 'consul',
                running: running
            };
        });
};

Nomad.prototype.isRunning = function() {
    logger.trace("ISRUNNING");

    var output = execSync("ps aux |grep \"[n]omad agent\" | tr -s ' ' ' '  | cut -d ' ' -f2").toString().trim();

    return Q(output.length > 0);
};

Nomad.prototype.clean = function() {
    logger.trace("CLEAN");

    var opts = {sudo: this.sudo};

    return sh.pidof(this.command, opts)
        .then(function(pid) {
            if (! pid) return false;
            return sh.kill(pid, 9, opts);
        });
};

Nomad.prototype.start = function(args) {
    var command = this.command;
    var sudo = this.sudo;
    var opts = {sudo: this.sudo};
    var me = this;

    var pid = execSync("ps aux |grep \"[n]omad agent\" | tr -s ' ' ' '  | cut -d ' ' -f2").toString().trim();
    logger.debug("pid: '" +  + pid + "'");

    if (pid && pid.length > 0 && pid != "-1") return false;
    logger.info("nomad not started, starting it now.");

    return sh.exists(command, opts)
        .then(function(exists) {
            if (! exists) throw new Errors.DaemonNotInstalledError('nomad');

            var defer = Q.defer();

            // -- merge the args if there are any
            var cli = {
                cmd: (sudo) ? 'sudo' : command,
                args: (sudo) ? [command].concat(args) : args
            };

            try {
                me.child = spawn(cli.cmd, cli.args, {env: {PATH: process.env.PATH + ':' + fs.parentFileName(cli.cmd)}});

                me.child.stderr.on('data', function (data) {
                    logger.error(data.toString('utf8'));
                });

                var found = false;

                me.child.stdout.on('data', function (data) {
                    if (!found) {
                        found = true;

                        defer.resolve(Q.delay(1000).then(function() {
                            logger.warn("nomad has been started");
                        }));
                    }

                    logger.info(data.toString('utf8').replace(/^\s+|\s+$/g, ''));
                });

                me.child.on('close', function (code) {
                    me.child = null;
                    logger.info('The nomad daemon exited with code ' + code);

                    if (code != 0) defer.reject(new Error('The nomad daemon exited with code ' + code));
                });

            } catch (error) {
                logger.error(error);
                defer.reject(error);
            }

            return defer.promise;
        });
};

Nomad.prototype.stop = function() {
    var opts = {sudo: this.sudo};

    return sh.pidof(this.command, opts)
        .then(function(pid) {
            if (!pid || pid == -1) return false;

            return sh.kill(pid, 9, opts);
        });
};

Nomad.prototype.reload = function() {
    return stop().then(function() {
        return start();
    });
};

module.exports = Nomad;