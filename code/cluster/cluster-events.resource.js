var API = require('../api/api-helper'),
    EventService = require('./cluster-events.service');

module.exports = {
    list: list
};

function list(req, res) {
    API.handle.service(req, res, EventService.list());
}

