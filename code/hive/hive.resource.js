var API = require('../api/api-helper'),
    HiveService = require('./hive.service');

module.exports = {
    get: get,
    link: link,
    unlink: unlink
};

function get(req, res) {
    API.handle.service(req, res, HiveService.get());
}

function link(req, res) {
    if (! req.body || ! req.body.shortId) {
        API.handle.missingParameter(req, res, 'shortId');
    } else {
        API.handle.service(req, res, HiveService.link(req.body.shortId));
    }
}

function unlink(req, res) {
    API.handle.service(req, res, HiveService.unlink());
}

