var os = require('os'),
    Q = require('q');

var spawn = require('child_process').spawn;
var Log4js = require('log4js');
var C = require('consul');

var sh = require('../utils/sh-utils'),
    su = require('../utils/sys-utils');

var Errors = require('../errors');
var logger = Log4js.getLogger('daemon.consul');
var settings = require('../settings');

function Consul() {
    this.home = process.cwd();
    this.command = this.home + '/lib/' + su.platform() + '/' + su.architecture() + '/consul';

    this.sudo = false;

    this.child = null;
    this.consul = new C();

    function shutdownHandler(command, sudo) {
        return function() {
            sh.pidof(command, {sudo: sudo})
                .then(function(pid) {
                    if (!pid || pid == -1) {
                        logger.error('Unable to stop consul since no PID could be found for the process');
                    } else {
                        logger.warn('Stopping consul by sending it the kill signal');
                        return sh.kill(pid, 9, {sudo: sudo}).then(function() {
                            logger.warn('Stopped consul.');
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

Consul.prototype.client = function() {
    return this.consul;
};

/* ===================================================================================================================
   == Start & Stop
   ================================================================================================================ */

Consul.prototype.status = function() {
    logger.trace("STATUS");

    return this.isRunning()
        .then(function(running) {
            return {
                daemon: 'consul',
                running: running
            };
        });
};

Consul.prototype.isRunning = function() {
    logger.trace("ISRUNNING");

    return sh.pidof(this.command, {sudo: this.sudo})
        .then(function(pid) {
            logger.debug(pid);
            return (pid && pid != -1);
        });
};

Consul.prototype.clean = function() {
    logger.trace("CLEAN");

    var opts = {sudo: this.sudo};

    return sh.pidof(this.command, opts)
        .then(function(pid) {
            if (! pid) return false;
            return sh.kill(pid, 9, opts);
        });
};

Consul.prototype.start = function(args) {
    var command = this.command;
    var sudo = this.sudo;
    var opts = {sudo: this.sudo};
    var me = this;

    return sh.pidof(command, opts)
        .then(function(pid) {
            logger.debug("pid: '" +  + pid + "'");

            if (pid && pid != -1) return false;
            logger.info("consul not started, starting it now.");

            return sh.exists(command, opts)
                .then(function(exists) {
                    if (! exists) throw new Errors.DaemonNotInstalledError('consul');

                    var defer = Q.defer();

                    // -- merge the args if there are any
                    var cli = {
                        cmd: (sudo) ? 'sudo' : command,
                        args: (sudo) ? [command].concat(args) : args
                    };

                    logger.info("Starting consul with " + cli.args);

                    try {
                        me.child = spawn(cli.cmd, cli.args);

                        me.child.stderr.on('data', function (data) {
                            logger.error(data.toString('utf8'));
                        });

                        var found = false;

                        me.child.stdout.on('data', function (data) {
                            data = data.toString('utf8');
                            var synced = data.indexOf('agent: Synced ') != -1;

                            if (synced && !found) {
                                found = true;

                                defer.resolve(Q.delay(1000).then(function() {
                                    logger.warn("consul has been started");
                                }));
                            }

                            logger.info(data.toString('utf8').replace(/^\s+|\s+$/g, ''));
                        });

                        me.child.on('close', function (code) {
                            me.child = null;
                            logger.info('The consul daemon exited with code ' + code);

                            if (code != 0) defer.reject(new Error('The consul daemon exited with code ' + code));
                        });

                    } catch (error) {
                        logger.error(error);
                        defer.reject(error);
                    }

                    return defer.promise;
                });
        });
};

Consul.prototype.stop = function() {
    var opts = {sudo: this.sudo};

    return sh.pidof(this.command, opts)
        .then(function(pid) {
            if (!pid || pid == -1) return false;

            return sh.kill(pid, 9, opts);
        });
};

Consul.prototype.reload = function() {
    return stop().then(function() {
        return start();
    });
};

module.exports = Consul;