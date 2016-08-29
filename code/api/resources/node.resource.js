var API = require('../api-helper'),
    NodeService = require('../../node/node.service');

module.exports = {
    get: get
};

function get(req, res) {
    API.handle.service(req, res, NodeService.detail());
}

