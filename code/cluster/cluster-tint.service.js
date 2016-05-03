var Q = require('q'),
    kv = require('../store/kv'),
    Storage = require('../cluster/storage'),
    services = require('../store/services'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js'),
    tu = require('../utils/tint-utils'),
    consulUtils = require('../utils/consul-utils');

var logger = log4js.getLogger('service.cluster.tint');

module.exports = {
    list: listTints,
    get: getTint,
    install: installTint,
    uninstall: uninstallTint
};

function installTint(definition) {
    // -- todo: make sure a stack tint has not been installed yet
    return kv.set('tints/' + tu.id(definition), definition, null, consulUtils.flags.CREATE + consulUtils.flags.OPERATION_NEW);
}

function uninstallTint(profileId, slug) {
    return kv.flag('tints/' + profileId + '/' + slug, consulUtils.flags.REMOVE + consulUtils.flags.OPERATION_NEW);
}

function listTints() {
    return kv.list('tints').then(function(tintPaths) {
        var promises = [];

        tintPaths.forEach(function(tintPath) {
            promises.push(_getTintListItem(tintPath));
        });

        return Q.all(promises);
    }, function(error) {
        if (error.statusCode == 404) return [];
        else throw error;
    });
}

function getTint(profileId, slug) {
    return _getExtendedNodeDetail('tints/' + profileId + '/' + slug);
}

function _getTintListItem(tintPath) {
    return _getExtendedTintDetail(tintPath).then(function(tint) {
        return tint;
    });
}

function _getExtendedTintDetail(tintPath) {
    return kv.get.key(tintPath).then(function(tint) {
        return _getViewInstances(tint).then(function(views) {
            tint.views = views;

            return tint;
        })
    });
}

function _getViewInstances(tint) {
    var promises = [];

    if (tint.views) {
        tint.views.forEach(function(view) {
            promises.push(services.nodes(view.daemon).then(function(nodes) {
                var result = {
                    name: view.name,
                    description: view.description,
                    type: view.type
                };

                if (view.multiplicity == 'one' || nodes.length == 1) {
                    result.instance = {
                        host: nodes[0].name,
                        uri: view.protocol + '://' + nodes[0].address + ':' + view.port + view.path
                    }
                } else {
                    result.instances = [];

                    nodes.forEach(function(node) {
                        result.instances.push({
                            host: node.name,
                            uri: view.protocol + '://' + node.address + ':' + view.port + view.path
                        })
                    });
                }

                return result;
            }));
        });
    }

    return Q.all(promises);
}