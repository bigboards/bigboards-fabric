var API = require('../api/api-helper'),
    StatusService = require('./cluster-status.service'),
    log4js = require('log4js');

var logger = log4js.getLogger('resource.cluster.status');


module.exports = {
    get: getClusterStatus
};
function getClusterStatus(req, res) {
    try {
        API.handle.service(req, res, StatusService.status());
    } catch (error) {
        logger.error(error);
    }
}
