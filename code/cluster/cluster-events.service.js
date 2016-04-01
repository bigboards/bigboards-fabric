var Q = require('q'),
    events = require('../store/events'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.cluster.events');

module.exports = {
    list: list
};

function list(name) {
    return events.list(name);
}