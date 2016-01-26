var Q = require('q'),
    log4js = require('log4js'),
    kv = require('../store/kv'),
    du = require('../utils/docker-utils'),
    fs = require('../utils/fs-utils'),
    sh = require('../utils/sh-utils');

var config = require('../config').lookupEnvironment();
var device = require('../device/device.manager');
var logger = log4js.getLogger('node');

module.exports = {
    container: {
        pull: pullContainerImage,
        create: createContainer,
        remove: {
            all: removeAll,
            byId: removeContainerById,
            byName: removeContainerByName
        },
        start: startContainer,
        stop: stopContainer
    },
    resource: {
        create: provisionResource,
        remove: removeResource,
        removeAll: removeAllResources
    }
};

// ====================================================================================================================
// == Containers
// ====================================================================================================================

function pullContainerImage(definition) {
    var image = definition.Image;
    if (definition.ArchitectureAware) image += '-' + device.architecture;

    // -- check if a repo tag has been provided. if not, we will pull the latest tag
    if (image.indexOf(':') == -1) image += ':latest';

    logger.info('Downloading container image ' + image);
    return du.image.pull(image)
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
        });
}

function createContainer(definition) {
    if (definition.ArchitectureAware) definition.Image += '-' + device.architecture;

    // -- check if the container already exists
    return du.container.create(definition);
}

function removeAll() {
    return du.container.destroy.all({ force: true });
}

function removeContainerById(id) {
    return du.container.destroy.byId(id, { force: true });
}

function removeContainerByName(name) {
    return  du.container.destroy.byId(name, { force: true });
}

function startContainer(id) {
    return du.container.status(id).then(function(status) {
        logger.debug('Container ' + id + ' Status: ' + JSON.stringify(status));

        if (!status.Running) {
            return du.container.start.byId(id);
        } else {
            logger.warn('Not starting container ' + id + ' because it is already running');
            return false;
        }
    });
}

function stopContainer(id) {
    return du.container.status(id).then(function(status) {
        logger.debug('Container ' + id + ' Status: ' + JSON.stringify(status));

        if (status.Running) {
            return du.container.stop.byId(id);
        } else {
            logger.warn('Not stopping container ' + id + ' because it is not running');
            return false;
        }
    });
}

// ====================================================================================================================
// == Resources
// ==
// ==   A resource should match the following structure:
// ==   {
// ==      type: '',            < [ template | path ]
// ==      consulPath: '',      < only needed in case type=template
// ==      fsPath: '',
// ==      scope: {}
// ==   }
// ==
// ====================================================================================================================

function provisionResource(definition) {
    return kv.list(definition.consulPath).then(function(templateKeys) {
        var promises = [];

        templateKeys.forEach(function(templateKey) {
            promises.push(provisionTemplate(definition, templateKey))
        });

        return Q.all(promises);
    });
}

function provisionTemplate(definition, templateKey) {
    return kv.raw.get(templateKey).then(function(template) {
        try {
            logger.debug('Handling template ' + templateKey);
            var filePath = templateKey.substr(definition.consulPath.length + 1);

            logger.info('Generating consul:' + templateKey + ' to ' + definition.fsPath + '/' + filePath);
            return fs.generateString(template, definition.fsPath + '/' + filePath, definition.scope);
        } catch (error) {
            return Q.reject(error);
        }
    });

}

function removeResource(definition) {
    return Q(sh.rm(definition.fsPath, {sudo: config.sudo, flags: 'rf'}));
}
function removeAllResources() {
    var res = sh.rm(config.dir.data + '/tints', {sudo: config.sudo, flags: 'rf'});

    return Q(res);
}
