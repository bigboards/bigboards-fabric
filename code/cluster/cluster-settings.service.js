var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.cluster.settings');

module.exports = {
    set: setSettings,
    get: getSettings
};

function getSettings() {
    return kv.get.key('settings')
        .fail(function(error) { return {}; });
}

function setSettings(settings) {
    return kv.set('settings', settings, null, 0);
}