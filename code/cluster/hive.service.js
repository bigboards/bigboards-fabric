var Q = require('q'),
    kv = require('../store/kv'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.hive');

module.exports = {
    get: get,
    link: link,
    unlink: unlink
};

function get() {
    return kv.get.key('hive');
}

function link(shortId) {
    return kv.set('hive', {shortId: shortId});
}

function unlink() {
    return kv.remove.key('hive');
}