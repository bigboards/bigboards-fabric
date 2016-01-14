var winston = require('winston'),
    API = require('../../utils/api-utils');

module.exports = {
    Resource: require('./resource'),
    Service: require('./service'),
    prepare: function(settings, services) { },
    io: function(socket, services) {},
    link: function(app, services) {
        var resource = new this.Resource(services.tutorials);

        API.registerGet(app, '/api/v1/tutorials', function(req, res) { return resource.list(req, res); });
        API.registerGet(app, '/api/v1/tutorials/:owner/:slug', function(req, res) { return resource.get(req, res); });
        API.registerGet(app, '/api/v1/tutorials/:owner/:slug/toc', function(req, res) { return resource.getToc(req, res); });
        API.registerGet(app, /^\/api\/v1\/tutorials\/([\w\-_]+)\/([\w\-_]+)\/page\/(.+)/, function(req, res) { return resource.getPage(req, res); });
    }
};