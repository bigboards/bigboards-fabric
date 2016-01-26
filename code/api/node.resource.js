var API = require('./api-helper'),
    NodeService = require('../cluster/node.service');


module.exports = {
    list: listNodes,
    get: getNode
};

function listNodes(req, res) {
    API.handle.service(req, res, NodeService.list());
}

function getNode(req, res) {
    API.handle.service(req, res, NodeService.get(req.param('id')));
}

