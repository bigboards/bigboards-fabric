var API = require('../api-helper');

var appService = require('../../cluster/cluster-apps.service');

module.exports = {
    list: list,
    get: get,
    post: post,
    delete: del
};

function list(req, res) {
    API.handle.service(req, res, appService.list());
}

function get(req, res) {
    if (! req.params.appId) return API.handle.missingParameter(req, res, "appId", "path");

    API.handle.service(req, res, appService.get(req.params.appId));
}

function post(req, res) {
    if (! req.body.name) return API.handle.missingParameter(req, res, "name", "body");
    if (! req.body.key) return API.handle.missingParameter(req, res, "key", "body");
    if (! req.body.role) return API.handle.missingParameter(req, res, "role", "body");
    if (! req.body.nodes) return API.handle.missingParameter(req, res, "nodes", "body");
    if (! req.body.servers) return API.handle.missingParameter(req, res, "servers", "body");

    API.handle.service(req, res, appService.install(req.body, req.query.verbose === true));
}

function del(req, res) {
    if (! req.params.appId) return API.handle.missingParameter(req, res, "appId", "path");

    API.handle.service(req, res, appService.uninstall(req.params.appId, req.query.verbose === true));
}