var Q = require('q'),
    ps = require('ps-node'),
    log4js = require('log4js'),
    fs = require('../utils/fs-utils'),
    spawn = require('child_process').spawn,
    uuid = require('node-uuid');

var SingularityImages = require('./images');

var logger = log4js.getLogger("singularity.instances");

var appsLocation = "./data/images/apps";
var pathToPreload = path.join(__dirname, '../lib/linux/x86_64/libprocname.so');

module.exports = {
    list: list,
    exists: exists,
    create: create,
    remove: remove,
    start: start,
    stop: stop,
    kill: kill,
    isRunning: isRunning
};

function exists(instanceId) {
    return SingularityImages.instance.exists(instanceId);
}

function list() {
    var files = fs.readDir(appsLocation);
    return Q((files) ? files : []);
}

function create(instanceId, config) {
    // -- create the instance directory
    fs.mkdir(appsLocation + "/" + instanceId);

    return SingularityImages.instance.create(config.image.namespace, config.image.name, config.image.tag, instanceId)
        .then(function(){
            return fs.writeJsonFile(appsLocation + "/" + instanceId + "/config.json", config);
        })
        .then(function() {
            return instanceId;
        });
}

function remove(instanceId) {
    if (isRunning(instanceId))
        return Q.reject(new Error("The instance is still running. Please stop if first."));

    return Q.resolve(fs.rm(appsLocation + "/" + instanceId));
}

function start(instanceId) {
    return pid(instanceId)
        .then(function(pid) {
            if (pid > 0) {
                logger.warn("The instance is already running on this host.");
                return pid;
            }

            var job = fs.readJsonFile(appsLocation + "/" + instanceId + "/config.json");

            // -- spawn a new singularity process
            var child = spawn('singularity', job.command, {
                detached: true,
                stdio: 'ignore',
                env: {
                    LD_PRELOAD: pathToPreload,
                    PROCNAME: instanceId
                }
            });

            // -- cut the references to the master nodejs process
            child.unref();

            // -- return the pid
            return child.pid;
        });
}

function stop(instanceId) {
    return pid(instanceId)
        .then(function(pid) {
            if (pid == -1) {
                logger.warn("The instance is not running on this host.");
                return false;
            } else if (pid == -2) {
                logger.warn("Multiple invocations of the instance are running on this host.");
                return false;
            } else {
                var defer = Q.defer();

                ps.kill(pid, function(err) {
                    if (err) return defer.reject(err);

                    defer.resolve(true);
                });

                return defer.promise;
            }
        });
}

function kill(instanceId) {
    return pid(instanceId)
        .then(function(pid) {
            if (pid == -1) {
                logger.warn("The instance is not running on this host.");
                return false;
            } else if (pid == -2) {
                logger.warn("Multiple invocations of the instance are running on this host.");
                return false;
            } else {
                var defer = Q.defer();

                ps.kill(pid, { signal: 9 }, function(err) {
                    if (err) return defer.reject(err);

                    defer.resolve(true);
                });

                return defer.promise;
            }
        });
}

function isRunning(instanceId) {
    return pid(instanceId).then(function(pid) {
        return (pid > 0);
    })
}

function pid(instanceId) {
    var defer = Q.defer();

    ps.lookup({command: 'instanceId'}, function(err, resultList) {
        if (err)
            return defer.reject(err);

        if (resultList.length == 0)
            return defer.resolve(-1);

        if (resultList.length > 1)
            return defer.resolve(-2);

        return defer.resolve(resultList[0].pid);
    });

    return defer.promise;
}