var API = require('./api-helper'),
    StatusService = require('../cluster/status.service'),
    log4js = require('log4js');

var logger = log4js.getLogger('resource.status');


module.exports = {
    get: getCluster,
    status: getClusterStatus
};

function getCluster(req, res) {
    res.status(200).json([{name: 'node-1'}]);
}

function getClusterStatus(req, res) {
    try {
        API.handle.service(req, res, StatusService.status());
    } catch (error) {
        logger.error(error);
    }
}
