var Q = require('q'),
    kv = require('../store/kv'),
    services = require('../store/services'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js'),
    consulUtils = require('../utils/consul-utils'),
    tasks = require('../tasks'),
    errors = require("../errors");

var logger = log4js.getLogger('service.cluster.app');

module.exports = {
    list: listApps,
    get: getApp,
    install: installApp,
    uninstall: uninstallApp
};

function installApp(app, verbose) {
    // -- todo: validate the app structure
    logger.trace("installing " + app.id);

    return tasks.invoke('app_install', {
        app: app,
        verbose: verbose
    });
}

function uninstallApp(appId, verbose) {
    if (! appId) throw new errors.MissingArgumentError("appId");

    logger.trace("uninstalling " + appId);

    return tasks.invoke('app_uninstall', {
        appId: appId,
        verbose: verbose
    });
}

function listApps() {
    return kv.children('apps/').then(function(appPaths) {
        var promises = [];

        appPaths.forEach(function(appPath) {
            if (consulUtils.isDirectory(appPath)) return;

            promises.push(_getAppListItem(appPath));
        });

        return Q.all(promises);
    }, function(error) {
        if (error.statusCode == 404) return [];
        else throw error;
    });
}

function getApp(appId) {
    if (! appId) throw new errors.MissingArgumentError("appId");

    return _getExtendedAppDetail('apps/' + appId);
}

function _getAppListItem(appPath) {
    return _getExtendedAppDetail(appPath);
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