var API = require('../api-helper');

var membershipService = require('../../membership/membership.service'),
    statusService = require('../../cluster/cluster-status.service');

module.exports = {
    get: get,
    post: post,
    delete: del
};

function get(req, res) {
    API.handle.service(req, res, statusService.status());
}

function post(req, res) {
    if (! req.body.name) return API.handle.missingParameter(req, res, "name", "body");
    if (! req.body.key) return API.handle.missingParameter(req, res, "key", "body");
    if (! req.body.role) return API.handle.missingParameter(req, res, "role", "body");
    if (! req.body.nodes) return API.handle.missingParameter(req, res, "nodes", "body");
    if (! req.body.servers) return API.handle.missingParameter(req, res, "servers", "body");

    API.handle.service(req, res, membershipService.join(req.body.name, req.body.key, req.body.role, req.body.nodes, req.body.servers));
}

function del(req, res) {
    API.handle.service(req, res, membershipService.leave());
}