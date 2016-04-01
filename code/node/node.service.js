var Q = require('q'),
    log4js = require('log4js');

var settings = require('../settings');
var introspect = require('../introspecter');

var logger = log4js.getLogger('service.status');

module.exports = {
    detail: getDetail
};

function getDetail() {
    logger.debug('get the details of this node.');

    return introspect().then(function(data) {
        data.is_linked = settings.has('cluster_key');

        return data;
    });
}