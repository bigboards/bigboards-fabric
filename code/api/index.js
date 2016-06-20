var API = require('./api-helper'),
    settings = require('../settings');

var resources = {
    node: require('../node/node.resource'),
    membership: require('../membership/membership.resource'),
    hive: require('../hive/hive.resource'),
    cluster: {
        status: require('../cluster/cluster-status.resource'),
        service: require('../cluster/cluster-service.resource'),
        events: require('../cluster/cluster-events.resource'),
        setting: require('../cluster/cluster-settings.resource'),
        node: require('../cluster/cluster-node.resource'),
        app: require('../cluster/cluster-apps.resource')
    }
};

module.exports = function(app, io) {
    API.register.guarded.get(app, '/v1/apps', scopeMiddleware, resources.cluster.app.list);
    API.register.guarded.post(app, '/v1/apps', scopeMiddleware, resources.cluster.app.install);

    API.register.guarded.get(app, '/v1/apps/:profileId/:slug', scopeMiddleware, resources.cluster.app.get);
    API.register.guarded.delete(app, '/v1/apps/:profileId/:slug', scopeMiddleware, resources.cluster.app.uninstall);

    API.register.get(app, '/v1/cluster', scopeMiddleware, resources.cluster.status.get);
    API.register.post(app, '/v1/cluster', resources.membership.join);
    API.register.delete(app, '/v1/cluster', resources.membership.leave);

    API.register.guarded.get(app, '/v1/events', scopeMiddleware, resources.cluster.events.list);

    API.register.guarded.get(app, '/v1/nodes', scopeMiddleware, resources.cluster.node.list);
    API.register.guarded.get(app, '/v1/nodes/:id', scopeMiddleware, resources.cluster.node.get);

    API.register.guarded.get(app, '/v1/services', scopeMiddleware, resources.cluster.service.list);

    API.register.guarded.get(app, '/v1/settings', scopeMiddleware, resources.cluster.setting.get);
    API.register.guarded.post(app, '/v1/settings', scopeMiddleware, resources.cluster.setting.set);

    API.register.get(app, '/v1/status', resources.node.detail);
    API.register.post(app, '/v1/status', resources.membership.start);
    API.register.delete(app, '/v1/status', resources.membership.stop);

    // todo: this returns invalid content


    startIO(io);

    //API.register.get(app, '/v1/cluster/link', resources.hive.get);
    //API.register.put(app, '/v1/cluster/link', resources.hive.link);
    //API.register.delete(app, '/v1/cluster/link', resources.hive.unlink);
};

function scopeMiddleware(req, res, next) {
    if (settings.has('cluster_key')) return next();
    else res.status(403).json({reason: "the node has not been linked to a cluster yet."});
}

function startIO(io) {
    io.on('connection', function(socket) {
        console.log('new connection');

        socket.on('add-customer', function(customer) {
            io.emit('notification', {
                message: 'new customer',
                customer: customer
            });
        });
    });
}