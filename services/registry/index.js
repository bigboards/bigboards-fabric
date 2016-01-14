var winston = require('winston'),
    API = require('../../utils/api-utils');

module.exports = {
    Resource: require('./resource'),
    Service: require('./service'),
    prepare: function(settings, services) { },
    io: function(socket, services) {},
    link: function(app, services) {
        var resource = new this.Resource(services.registry);

        API.registerGet(app, '/api/v1/registry', function(req, res) { return resource.getRegistries(req, res); });
        API.registerGet(app, '/api/v1/registry/:name', function(req, res) { return resource.getRegistry(req, res); });
        API.registerPut(app, '/api/v1/registry', function(req, res) { return resource.addRegistry(req, res); });
        API.registerPost(app, '/api/v1/registry/:name', function(req, res) { return resource.updateRegistry(req, res); });
        API.registerDelete(app, '/api/v1/registry/:name', function(req, res) { return resource.removeRegistry(req, res); });
    }
};