var winston = require('winston'),
    API = require('../../utils/api-utils');

module.exports = {
    Resource: require('./resource'),
    Service: require('./service'),
    prepare: function(settings, services) { },
    io: function(socket, services) {},
    link: function(app, services) {
        var resource = new this.Resource(services.settings);

        API.registerGet(app, '/api/v1/settings/hex', function(req, res) { return resource.getHexSettings(req, res); });
        API.registerGet(app, '/api/v1/settings/client', function(req, res) { return resource.getClientSettings(req, res); });
    }
};