var Q = require('q'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors');

var consul = require('consul')();

function SettingsService(mmcConfig) {
    this.mmcConfig = mmcConfig;
}

/*********************************************************************************************************************
 * Hex
 *********************************************************************************************************************/
SettingsService.prototype.getHexSettings = function() {
    return this.getClientSettings();
};

/*********************************************************************************************************************
 * Client
 *********************************************************************************************************************/
SettingsService.prototype.getClientSettings = function() {
    var defer = Q.defer();

    consul.kv.get('hex', function(err, data) {
        if (err) return defer.reject(err);

        if (!data) return defer.resolve({});

        defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
};

module.exports = SettingsService;