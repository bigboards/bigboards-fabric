var winston = require('winston'),
    API = require('../../utils/api-utils');

module.exports = {
    Resource: require('./resource'),
    Service: require('./service'),
    prepare: function(settings, services) { },
    io: function(socket, services) {},
    link: function(app, services) {
        var resource = new this.Resource(services.hex);

        API.registerGet(app, '/api/v1/hex', function(req, res) { return resource.get(req, res); });
        API.registerDelete(app, '/api/v1/hex', function(req, res) { return resource.powerdown(req, res); });

        // --  link
        API.registerPost(app, '/api/v1/hex/link', function(req, res) { return resource.link(req, res); });
        API.registerDelete(app, '/api/v1/hex/link', function(req, res) { return resource.unlink(req, res); });

        // -- Nodes
        API.registerGet(app, '/api/v1/hex/nodes', function(req, res) { return resource.listNodes(req, res); });

        // -- Tints
        API.registerGet(app, '/api/v1/hex/tints', function(req, res) { return resource.listTints(req, res); });
        API.registerPost(app, '/api/v1/hex/tints', function(req, res) { return resource.installTint(req, res); });
        API.registerGet(app, '/api/v1/hex/tints/:type', function(req, res) { return resource.listTints(req, res); });
        API.registerGet(app, '/api/v1/hex/tints/:type/:owner/:tintId', function(req, res) { return resource.getTint(req, res); });
        API.registerGet(app, /^\/api\/v1\/hex\/tints\/(.+)\/(.+)\/(.+)\/(.+)/, function(req, res) { return resource.getTintResource(req, res); });
        API.registerDelete(app, '/api/v1/hex/tints/:type/:owner/:slug', function(req, res) { return resource.removeTint(req, res); });
    }
};