var Q = require('q'),
    log4js = require('log4js'),
    kv = require('../store/kv'),
    du = require('../utils/docker-utils'),
    fs = require('../utils/fs-utils'),
    sh = require('../utils/sh-utils');

var node = require('../node');

var settings = require('../settings');
var logger = log4js.getLogger('node');
var unirest = require('unirest');
var Introspecter = require('../introspecter');

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
    },
    hive: {
        register: registerWithHive,
        update: updateHive,
        deregister: deregisterFromHive
    }
};

// ====================================================================================================================
// == Containers
// ====================================================================================================================

function pullContainerImage(definition) {
    var image = definition.Image;
    if (definition.ArchitectureAware) image += '-' + node.architecture;

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
    logger.warn("image = " + definition.Image);

    if (definition.ArchitectureAware) definition.Image += '-' + node.architecture;

    // -- check if the container already exists
    return du.container.exists(definition.name).then(function(exists) {
        if (exists) {
            logger.info('Not creating the docker container since it already exists');
            return Q();
        } else {
            return du.container.create(definition);
        }
    });
}

function removeAll() {
    return du.container.destroy.all({ force: true });
}

function removeContainerById(id) {
    return du.container.destroy.byId(id, { force: true });
}

function removeContainerByName(name) {
    return du.container.exists(name).then(function(exists) {
        if (exists) {
            return du.container.destroy.byId(name, { force: true });
        }
    });
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
    return Q(sh.rm(definition.fsPath, {sudo: settings.get('sudo', false), flags: 'rf'}));
}
function removeAllResources() {
    var res = sh.rm(settings.get('data_dir') + '/tints', {sudo: settings.get('sudo', false), flags: 'rf'});

    return Q(res);
}

function registerWithHive(shortId) {
    var url = (settings.get("hive_port", 80) == 443 ? 'https://' : 'http://') + settings.get("hive_host", "hive.bigboards.io") + ':' + settings.get("hive_port", 80) + '/api/v1/devices';
    logger.info('Registering node on the hive at ' + url + ' with shortId ' + shortId);

    return Introspecter().then(function(data) {
        var defer = Q.defer();

        data.short_id = shortId;

        logger.debug('registering ' + JSON.stringify(data, null, 2));

        unirest.put(url)
            .header('Accept', 'application/json')
            .type('json')
            .send(data)
            .end(function (response) {
                if (response.ok) {
                    logger.debug('Registration success');
                    defer.resolve({ ok: true });
                } else {
                    logger.warn('Registration error: ' + JSON.stringify(response.body));
                    defer.reject({ok: false, message: response.body});
                }
            });

        return defer.promise;
    });
}

function updateHive() {
    var url = (settings.get("hive_port", 80) == 443 ? 'https://' : 'http://') + settings.get("hive_host", "hive.bigboards.io") + ':' + settings.get("hive_port", 80) + '/api/v1/devices/' + node.id;
    logger.info('Updating node on the hive at ' + url);

    return Introspecter().then(function(data) {
        var defer = Q.defer();

        var patches = [
            { op: 'set', fld: 'ipv4', val: data.ipv4 }
        ];

        logger.debug('patches: ' + JSON.stringify(patches, null, 2));

        unirest.patch(url)
            .header('Accept', 'application/json')
            .type('json')
            .send(JSON.stringify(patches))
            .end(function (response) {
                if (response.ok) {
                    logger.debug('Hive update success');
                    defer.resolve({ ok: true });
                } else {
                    logger.warn('Hive update error: ' + JSON.stringify(response.body));
                    defer.reject({ok: false, message: response.body});
                }
            });

        return defer.promise;
    });
}

function deregisterFromHive() {
    var url = (settings.get("hive_port", 80) ? 'https://' : 'http://') + settings.get("hive_host", "hive.bigboards.io") + ':' + settings.get("hive_port", 80) + '/api/v1/devices/' + node.id;

    var defer = Q.defer();

    unirest.delete(url)
        .header('Accept', 'application/json')
        .send()
        .end(function (response) {
            if (response.ok) defer.resolve({ ok: true });
            else defer.reject({ok: false, message: response.body});
        });

    return defer.promise;
}