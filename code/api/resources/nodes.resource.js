var API = require('../api-helper');

var nodeService = require('../../cluster/cluster-node.service');

module.exports = {
    list: list,
    get: get
};

function get(req, res) {
    if (! req.params.nodeId) return API.handle.missingParameter(req, res, "nodeId", "path");

    API.handle.service(req, res, nodeService.get(req.params.nodeId));
}

function list(req, res) {
    API.handle.service(req, res, nodeService.list());
}