var API = require('../api/api-helper'),
    NodeService = require('./node.service');

module.exports = {
    detail: nodeDetail
};

function nodeDetail(req, res) {
    API.handle.service(req, res, NodeService.detail());
}

