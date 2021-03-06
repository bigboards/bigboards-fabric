var Q = require('q'),
    Docker = require('dockerode'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    swig = require('swig'),
    log4js = require('log4js'),
    mkdirp = require('mkdirp'),
    sh = require('shelljs');

var docker = new Docker();
var log = log4js.getLogger('docker');

/**********************************************************************************************************************
 ** GENERAL
 *********************************************************************************************************************/
module.exports = {
    image: {
        pull: pullImage
    },
    container: {
        exists: containerExists,
        detail: containerDetail,
        get: {
            byName: getContainer,
            byId: getContainerById
        },
        list: listContainers,
        create: createContainer,
        destroy: {
            all: destroyAll,
            byContainer: destroyContainer,
            byId: destroyContainerById
        },
        start: {
            byContainer: startContainer,
            byId: startContainerById
        },
        stop: {
            byContainer: stopContainer,
            byId: stopContainerById
        },
        status: checkContainer
    }
};

function containerExists(name) {
    return listContainers({all: true})
        .then(function(containers) {
            for (var idx in containers) {
                if (! containers.hasOwnProperty(idx)) continue;

                if (containers[idx].Names.indexOf('/' + name) !== -1) return true;
            }

            return false;
        });
}

function pullImage(image, options) {
    var defer = Q.defer();

    docker.pull(image, options, function (err, stream) {
        if (err) return defer.reject(err);
        return defer.resolve(stream);
    });

    return defer.promise;
}

function getContainer(tag) {
    return listContainers({all: true})
        .then(function(containers) {
            for (var idx in containers) {
                if (! containers.hasOwnProperty(idx)) continue;

                if (containers[idx].Names.indexOf('/' + tag) !== -1) return containers[idx];
            }

            return null;
        });
}

function getContainerById(id) {
    return Q(docker.getContainer(id));
}

function listContainers(options) {
    var defer = Q.defer();

    docker.listContainers(options, function (err, res) {
        log.trace("containers: " + JSON.stringify(res));
        return (err) ? defer.reject(err) : defer.resolve(res);
    });

    return defer.promise;
}

function createContainer(options) {
    var defer = Q.defer();

    log.debug("Creating the docker container from image " + options.Image);

    docker.createContainer(options, function (err, res) {
        return (err) ? defer.reject(err) : defer.resolve(res.id);
    });

    return defer.promise;
}

function destroyAll(options) {
    return listContainers({all: true})
        .then(function(containers) {
            var promises = [];

            containers.forEach(function(container) {
                promises.push(destroyContainerById(container.Id, options));
            });

            return Q.all(promises);
        });
}

function destroyContainer(container, options) {
    if (container == null) return Q(true);

    var defer = Q.defer();

    container.remove(options, function (err, res) {
        return (err) ? defer.reject(err) : defer.resolve(res);
    });

    return defer.promise;
}

function destroyContainerById(id, options) {
    var container = docker.getContainer(id);

    return destroyContainer(container, options);
}

function startContainer(container) {
    var defer = Q.defer();

    // -- check if the container is already running
    container.inspect(function (err, res) {
        if (err) return defer.reject(err);

        if (! res.State.Running) {
            container.start(function (err, res) {
                return (err) ? defer.reject(err) : defer.resolve(res);
            });
        } else defer.resolve();
    });

    return defer.promise;
}

function startContainerById(id) {
    var container = docker.getContainer(id);

    return startContainer(container);
}

function stopContainer(container) {
    var defer = Q.defer();

    container.inspect(function (err, res) {
        if (err) return defer.reject(err);

        if (res.State.Running) {
            container.stop(function (err, res) {
                return (err) ? defer.reject(err) : defer.resolve(res);
            });
        } else defer.resolve();
    });

    return defer.promise;
}

function stopContainerById(id) {
    var container = docker.getContainer(id);

    return stopContainer(container);
}

function containerDetail(container) {
    var defer = Q.defer();

    container.inspect(function (err, res) {
        return (err) ? defer.reject(err) : defer.resolve(res);
    });

    return defer.promise;
}

function checkContainer(id) {
    var container = docker.getContainer(id);

    var defer = Q.defer();

    container.inspect(function (err, res) {
        if (err) {
            return defer.reject(err);
        }

        return defer.resolve(res.State);
    });

    return defer.promise;
}