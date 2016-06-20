var API = require('../api/api-helper'),
    AppService = require('./cluster-apps.service');

module.exports = {
    list: listApps,
    get: getApp,
    install: installApp,
    uninstall: uninstallApp
};

function listApps(req, res) {
    API.handle.service(req, res, AppService.list());
}

function getApp(req, res) {
    API.handle.service(req, res, AppService.get(req.params.profileId, req.params.slug));
}

function installApp(req, res) {
    API.handle.service(req, res, AppService.install(req.body));
}

function uninstallApp(req, res) {
    API.handle.service(req, res, AppService.uninstall(req.params.profileId, req.params.slug));
}

