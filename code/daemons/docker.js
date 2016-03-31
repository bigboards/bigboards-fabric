var os = require('os'),
    Q = require('q');

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var netu = require('../../utils/net-utils'),
    sh = require('../../utils/sh-utils'),
    cu = require('../../utils/con-utils');

var device = require('../device/device.manager');

var Log4js = require('log4js');
var logger = Log4js.getLogger('daemon.docker');
var D = require('dockerode');

var Errors = require('../errors');

function Docker(globalConfig) {
    this.home = globalConfig.home;
    this.binary_url = globalConfig.url.binaries;
    this.config = globalConfig.daemons['docker'];

    this.version = this.config.version;
    this.command = this.home + '/bin/docker';
    this.sudo = this.config.sudo || false;
    this.enabled = this.config.enabled || false;
    this.args = this.config.args;

    this.child = null;
    this.docker = new D();
}

Docker.prototype.isInstalled = function() {
    return sh.exists(this.home + '/bin/docker', {sudo: this.sudo});
};

Docker.prototype.install = function() {
    var daemons = require('./index');

    if (this.isInstalled()) return Q(false);

    var url = this.binary_url + '/docker/docker-' + this.version + '-' + os.arch();
    var dest = this.home + "/bin/docker";
    var sudo = this.sudo;
    var me = this;

    logger.info('Downloading the docker daemon from ' + url);

    return netu.download(url, dest, {sudo: sudo}).then(function(ok) {
        if (!ok) throw new Error('Was able to download but unable to move to the final destination.');

        logger.info('Changing the mode of the docker daemon to a+x');
        return sh.chmod(dest, 'a+x', { sudo: sudo});
    }).then(function(ok) {
        if (!ok) throw new Error('Was able to download and move to the right location but unable to chmod the final destination.');

        var service = {
            "ID": 'docker.' + device.id,
            "Name": 'Docker',
            "Tags": [ 'daemon' ]
        };

        logger.info('Registering the docker service');
        return cu.service.register(daemons.consul.client(), service).then(function() {
            logger.info('The docker service has been registered with consul')
        }, function(error) {
            logger.error(error);
        });
    }).then(function(ok) {
        logger.info('Starting the docker daemon');
        return me.start();
    });
};

Docker.prototype.uninstall = function() {
    if (! this.isInstalled()) return Q(false);

    var daemons = require('./index');
    var me = this;

    function _uninstall() {
        logger.info('Uninstalling the docker daemon');
        logger.info('Removing the docker binary');
        sh.rm(me.home + '/bin/docker', {sudo: me.sudo});

        return "Uninstalled the docker daemon";
    }

    return Q.when(me.isRunning(), function(running) {
        if (running) {
            logger.info('Stopping the docker daemon');
            return me.stop().then(_uninstall);
        } else {
            return Q(_uninstall());
        }
    }).then(function() {
        return cu.service.deregister(daemons.consul.client(), 'docker.' + device.id);
    });
};

Docker.prototype.setArguments = function(args) {
    if (args == null) return;
    this.args = args;
};

Docker.prototype.client = function() {
    return this.docker;
};

/* ===================================================================================================================
   == Start & Stop
   ================================================================================================================ */

Docker.prototype.status = function() {
    return {
        daemon: 'docker',
        version: this.version,
        installed: this.isInstalled(),
        running: this.isRunning()
    }
};

Docker.prototype.isRunning = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    return (pid && pid != -1);
};

Docker.prototype.clean = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (pid) {
        return Q(sh.kill(pid, 9, {sudo: this.sudo}));
    } else {
        return Q(false);
    }
};

Docker.prototype.start = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    var me = this;

    if (pid && pid != -1) {
        return Q(false);
    }

    if (! sh.exists(this.command, {sudo: this.sudo})) {
        return Q.reject(new Errors.DaemonNotInstalledError('docker'));
    }

    // -- merge the args if there are any
    var cli = {
        cmd: (this.sudo) ? 'sudo' : this.command,
        args: (this.sudo) ? [this.command].concat(this.args) : this.args
    };

    try {
        this.child = spawn(cli.cmd, cli.args);

        this.child.stderr.on('data', function (data) {
            logger.error(data.toString('utf8'));
        });

        this.child.stdout.on('data', function (data) {
            logger.info(data.toString('utf8'));
        });

        this.child.on('close', function (code) {
            me.child = null;
            logger.info('The docker daemon exited with code ' + code);
        });

        return Q(true);
    } catch (error) {
        logger.error(error);
        return Q(false);
    }
};

Docker.prototype.stop = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (!pid || pid == -1) {
        return Q(false);
    }

    return Q(sh.kill(pid, 9, {sudo: this.sudo}));
};

Docker.prototype.reload = function() {
    var pid = sh.pidof(this.command, {sudo: this.sudo});

    if (pid && pid != -1) {
        logger.debug('Docker daemon running with pid ' + pid + ' stopping it before trying to start');

        if (! sh.kill(pid, 1, {sudo: this.sudo})) {
            return Q(false);
        }
    }

    return start();
};

module.exports = Docker;