var API = require('./api-helper'),
    settings = require('../settings');

var resources = {
    cluster: require('./resources/cluster.resource'),
    nodes: require('./resources/nodes.resource'),
    apps: require('./resources/apps.resource'),
    node: require('./resources/node.resource'),
    hive: require('../hive/hive.resource')
};

module.exports = function(app, io) {
    // -- this node
    API.register.get(app, '/v1/node', resources.node.get);

    // -- cluster
    API.register.get(app, '/v1/cluster', resources.cluster.get);
    API.register.post(app, '/v1/cluster', resources.cluster.post);
    API.register.delete(app, '/v1/cluster', resources.cluster.delete);

    // -- Nodes
    API.register.guarded.get(app, '/v1/cluster/nodes', scopeMiddleware, resources.nodes.list);
    API.register.guarded.get(app, '/v1/cluster/nodes/:nodeId', scopeMiddleware, resources.nodes.get);

    // -- Apps
    API.register.guarded.get(app, '/v1/cluster/apps', scopeMiddleware, resources.apps.list);
    API.register.guarded.post(app, '/v1/cluster/apps', scopeMiddleware, resources.apps.install);
    API.register.guarded.get(app, '/v1/cluster/apps/:appId', scopeMiddleware, resources.apps.get);
    API.register.guarded.delete(app, '/v1/cluster/apps/:appId', scopeMiddleware, resources.apps.uninstall);





    //API.register.guarded.get(app, '/v1/events', scopeMiddleware, resources.cluster.events.list);
    //
    //API.register.guarded.get(app, '/v1/services', scopeMiddleware, resources.cluster.service.list);
    //
    //API.register.guarded.get(app, '/v1/settings', scopeMiddleware, resources.cluster.setting.get);
    //API.register.guarded.post(app, '/v1/settings', scopeMiddleware, resources.cluster.setting.set);


    //API.register.post(app, '/v1/status', resources.membership.start);
    //API.register.delete(app, '/v1/status', resources.membership.stop);

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