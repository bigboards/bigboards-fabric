var system = require('../system'),
    Q = require('q');

// -- utilities
var dockerUtils = require('../../utils/docker-utils');

module.exports = {
    create: createDaemon,
    remove: removeDaemon,
    clean: removeDaemons,
    start: startDaemon,
    stop: stopDaemon
};

function createDaemon(configuration) {
    if (configuration.ArchitectureAware) configuration.Image += '-' + system.architecture;

    // -- set the name as the hostname of the new container
    configuration.Hostname = configuration.name;

    // -- check if a repo tag has been provided. if not, we will pull the latest tag
    var imageToPull = configuration.Image;
    if (imageToPull.indexOf(':') == -1) imageToPull += ':latest';

    return dockerUtils.image.pull(imageToPull)
        .then(function(stream) {
            var defer = Q.defer();
            var error = null;

            stream.on('data', function (chunk) {
                var obj = JSON.parse(chunk.toString('utf8'));

                if (obj.errorDetail) {
                    error = new Error(obj.errorDetail.message);
                } else if (obj.status) {
                    defer.notify(obj);
                }
            });

            stream.on('end', function () {
                if (error) defer.reject(error);
                else defer.resolve(true);
            });

            return defer.promise;
        })
        .then(function() {
            // -- check if the container already exists
            return dockerUtils.container.exists(configuration.name);
        })
        .then(function(exists) {
            if (exists) return Q();

            return dockerUtils.container.create(configuration);
        });
}

function removeDaemon(containerName) {
    return dockerUtils.container.exists(containerName)
        .then(function(exists) {
            if (! exists) return Q();

            return dockerUtils.container.destroy.byId(containerName, { force: true });
        });
}

function removeDaemons() {
    return dockerUtils.container.destroy.all({ force: true });
}

function startDaemon(containerName) {
    return dockerUtils.container.status(containerName)
        .then(function(status) {
            if (status.Running) return Q();

            return dockerUtils.container.start.byId(containerName);
        });
}

function stopDaemon(containerName) {
    return dockerUtils.container.status(containerName)
        .then(function(status) {
            if (!status.Running) return Q();

            return dockerUtils.container.stop.byId(containerName);
        });
}