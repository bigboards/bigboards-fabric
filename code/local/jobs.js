var Singularity = require('../singularity');

module.exports = {
    isInstalled: isInstalled,
    isRunning: isRunning,
    install: install,
    uninstall: uninstall,
    start: start,
    stop: stop
};

function install(namespace, app, service, job) {
    return isInstalled(namespace, app, service, job)
        .then(function(exists) {
            if (exists) return true;

            return Singularity.images.instance.create(namespace, app, service, job);
        });
}

function uninstall(namespace, app, service, job) {
    return isInstalled(namespace, app, service, job)
        .then(function(exists) {
            if (! exists) return true;

            return Singularity.images.instance.remove(namespace, app, service, job);
        });
}

function start(job) {
    return isRunning(job)
        .then(function(isRunning) {
            if (isRunning) return false;


        })
}

function stop(job) {

}

function isInstalled(namespace, app, service, job) {
    return Q.resolve(Singularity.images.instance.exists(namespace, app, service, job));
}

function isRunning(job) {
    var defer = Q.defer();

    if (job.pid == -1) defer.resolve(false);
    else {
        ps.lookup({pid: job.pid}, function(err, psData) {
            if (err) defer.reject(err);

            if (psData.command.indexOf("singularity/sexec") != -1 && psData.args == job.command) {
                defer.resolve(true);
            } else {
                defer.resolve(false);
            }
        });
    }

    return defer.promise;
}