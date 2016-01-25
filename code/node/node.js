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
        create: createContainer,
        remove: removeContainer,
        removeAll: removeAll,
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

function createContainer(id, definition) {
    if (definition.ArchitectureAware) definition.Image += '-' + device.architecture;

    // -- check if the container already exists
    return du.container.get(id).then(function(container) {
        if (! container) {
            logger.info('Creating container ' + id + 'as ' + JSON.stringify(definition));
            return du.image.pull(definition.Image)
                .then(function(stream) {
                    var defer = Q.defer();

                    stream.on('data', function (chunk) {
                        logger.debug(chunk.toString('utf8'));
                    });

                    stream.on('end', function () {
                        logger.info('Pulled the ' + definition.Image + ' image');

                        defer.resolve(du.container.create(definition));
                    });

                    return defer.promise;
                });
        } else {
            return Q();
        }
    });
}

function removeAll() {
    return du.container.destroy.all({ force: true });
}

function removeContainer(id) {
    return du.container.get(id)
        .then(function(container) {
            if (container) {
                logger.info('Removing container ' + id);
                return  du.container.destroy.byId(id, { force: true });
            } else {
                return Q();
            }
        });
}

function startContainer(id) {
    return du.container.start.byId(id);
}

function stopContainer(id) {
    return du.container.stop.byId(id);
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
    logger.warn('looking for templates at: ' + definition.consulPath);
    return kv.list(definition.consulPath).then(function(templateKeys) {
        logger.warn('templates: ' + JSON.stringify(templateKeys));
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
