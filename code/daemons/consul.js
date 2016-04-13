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
    this.binary_url = this.home + '/lib/consul/';
    this.command = this.home + '/lib/consul/consul-' + su.architecture();

    this.sudo = true;

    this.child = null;
    this.consul = new C();

    function shutdownHandler(command, sudo) {
        return function() {
            var pid = sh.pidof(command, {sudo: sudo});

            if (!pid || pid == -1) {
                logger.error('Unable to stop consul since no PID could be found for the process');
            } else {
                logger.warn('Stopping consul by sending it the kill signal');
                sh.kill(pid, 9, {sudo: sudo});
            }
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
    return {
        daemon: 'consul',
        running: this.isRunning()
    }
};

Consul.prototype.isRunning = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    return (pid && pid != -1);
};

Consul.prototype.clean = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (pid) {
        return Q(sh.kill(pid, 9, {sudo: this.sudo}));
    } else {
        return Q(false);
    }
};

Consul.prototype.start = function(args) {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    var defer = Q.defer();

    var me = this;

    if (pid && pid != -1) {
        return Q(false);
    }

    if (! sh.exists(this.command, {sudo: this.sudo})) {
        return Q.reject(new Errors.DaemonNotInstalledError('consul'));
    }

    // -- merge the args if there are any
    var cli = {
        cmd: (this.sudo) ? 'sudo' : this.command,
        args: (this.sudo) ? [this.command].concat(args) : args
    };

    try {
        this.child = spawn(cli.cmd, cli.args);

        this.child.stderr.on('data', function (data) {
            logger.error(data.toString('utf8'));
        });

        var found = false;

        this.child.stdout.on('data', function (data) {
            if (data.toString('utf8').indexOf('agent: Synced node info') != -1 && !found) {
                found = true;

                defer.resolve(Q.delay(1000).then(function() {
                    logger.warn("consul has been started");
                }));
            }

            logger.info(data.toString('utf8'));
        });

        this.child.on('close', function (code) {
            me.child = null;
            logger.info('The consul daemon exited with code ' + code);

            if (code != 0) defer.reject(new Error('The consul daemon exited with code ' + code));
        });

    } catch (error) {
        logger.error(error);
        defer.reject(error);
    }

    return defer.promise;
};

Consul.prototype.stop = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (!pid || pid == -1) {
        return Q(false);
    }

    return Q(sh.kill(pid, 9, {sudo: this.sudo}));
};

Consul.prototype.reload = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (pid && pid != -1) {
        logger.debug('Consul daemon running with pid ' + pid + ' stopping it before trying to start');

        if (! sh.kill(pid, 1, {sudo: this.sudo})) {
            return Q(false);
        }
    }

    return start();
};

module.exports = Consul;