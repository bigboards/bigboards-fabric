var API = require('./api-helper'),
    settings = require('../settings');

var resources = {
    node: require('../node/node.resource'),
    membership: require('../membership/membership.resource'),
    hive: require('../hive/hive.resource'),
    cluster: {
        status: require('../cluster/cluster-status.resource'),
        setting: require('../cluster/cluster-settings.resource'),
        node: require('../cluster/cluster-node.resource'),
        tint: require('../cluster/cluster-tint.resource')
    }
};

module.exports = function(app) {
    API.register.get(app, '/v1/status', resources.node.detail);

    API.register.post(app, '/v1/membership', resources.membership.join);
    API.register.delete(app, '/v1/membership', resources.membership.leave);

    API.register.get(app, '/v1/membership/status', resources.membership.status);
    API.register.post(app, '/v1/membership/status', resources.membership.start);
    API.register.delete(app, '/v1/membership/status', resources.membership.stop);

    API.register.guarded.get(app, '/v1/cluster', scopeMiddleware, resources.cluster.status.get);

    API.register.guarded.get(app, '/v1/cluster/settings', scopeMiddleware, resources.cluster.setting.get);
    API.register.guarded.post(app, '/v1/cluster/settings', scopeMiddleware, resources.cluster.setting.set);

    API.register.guarded.get(app, '/v1/cluster/nodes', scopeMiddleware, resources.cluster.node.list);
    API.register.guarded.get(app, '/v1/cluster/nodes/:id', scopeMiddleware, resources.cluster.node.get);

    API.register.guarded.get(app, '/v1/cluster/tints', scopeMiddleware, resources.cluster.tint.list);
    API.register.guarded.post(app, '/v1/cluster/tints', scopeMiddleware, resources.cluster.tint.install);
    API.register.guarded.get(app, '/v1/cluster/tints/:profileId/:slug', scopeMiddleware, resources.cluster.tint.get);
    API.register.guarded.delete(app, '/v1/cluster/tints/:profileId/:slug', scopeMiddleware, resources.cluster.tint.uninstall);

    //API.register.get(app, '/v1/cluster/link', resources.hive.get);
    //API.register.put(app, '/v1/cluster/link', resources.hive.link);
    //API.register.delete(app, '/v1/cluster/link', resources.hive.unlink);
};

function scopeMiddleware(req, res, next) {
    if (settings.has('cluster_key')) return next();
    else res.status(403).json({reason: "the node has not been linked to a cluster yet."});
}