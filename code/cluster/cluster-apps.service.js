var Q = require('q'),
    kv = require('../store/kv'),
    Storage = require('../cluster/storage'),
    services = require('../store/services'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js'),
    tu = require('../utils/app-utils'),
    consulUtils = require('../utils/consul-utils');

var logger = log4js.getLogger('service.cluster.app');

module.exports = {
    list: listApps,
    get: getApp,
    install: installApp,
    uninstall: uninstallApp
};

function installApp(definition) {
    // -- todo: make sure a stack app has not been installed yet
    return kv.set('apps/' + tu.id(definition), definition, null, consulUtils.flags.CREATE + consulUtils.flags.OPERATION_NEW);
}

function uninstallApp(profileId, slug) {
    return kv.flag('apps/' + profileId + '/' + slug, consulUtils.flags.REMOVE + consulUtils.flags.OPERATION_NEW);
}

function listApps() {
    return kv.list('apps').then(function(appPaths) {
        var promises = [];

        appPaths.forEach(function(appPath) {
            promises.push(_getAppListItem(appPath));
        });

        return Q.all(promises);
    }, function(error) {
        if (error.statusCode == 404) return [];
        else throw error;
    });
}

function getApp(profileId, slug) {
    return _getExtendedNodeDetail('apps/' + profileId + '/' + slug);
}

function _getAppListItem(appPath) {
    return _getExtendedAppDetail(appPath).then(function(app) {
        return app;
    });
}

function _getExtendedAppDetail(appPath) {
    return kv.get.key(appPath).then(function(app) {
        return _getViewInstances(app).then(function(views) {
            app.views = views;

            return app;
        })
    });
}

function _getViewInstances(app) {
    var promises = [];

    if (app.views) {
        app.views.forEach(function(view) {
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