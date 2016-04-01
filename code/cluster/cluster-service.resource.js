var API = require('../api/api-helper'),
    ServiceService = require('./cluster-service.service');

module.exports = {
    list: listServices
};

function listServices(req, res) {
    API.handle.service(req, res, ServiceService.list());
}

