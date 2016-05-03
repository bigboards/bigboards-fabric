var API = require('../api/api-helper'),
    TintService = require('./cluster-tint.service');

module.exports = {
    list: listTints,
    get: getTint,
    install: installTint,
    uninstall: uninstallTint
};

function listTints(req, res) {
    API.handle.service(req, res, TintService.list());
}

function getTint(req, res) {
    API.handle.service(req, res, TintService.get(req.params.profileId, req.params.slug));
}

function installTint(req, res) {
    API.handle.service(req, res, TintService.install(req.body));
}

function uninstallTint(req, res) {
    API.handle.service(req, res, TintService.uninstall(req.params.profileId, req.params.slug));
}

