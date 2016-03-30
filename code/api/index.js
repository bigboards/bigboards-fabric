var API = require('./api-helper');

var resources = {
    status: require('./status.resource'),
    node: require('./node.resource'),
    service: require('./service.resource'),
    setting: require('./settings.resource'),
    hive: require('./hive.resource'),
    tint: require('./tint.resource')
};

module.exports = function(app) {
    API.register.get(app, '/v1/cluster', resources.status.get);

    API.register.get(app, '/v1/cluster/status', resources.status.status);

    API.register.get(app, '/v1/cluster/settings', resources.setting.get);
    API.register.post(app, '/v1/cluster/settings', resources.setting.set);

    API.register.get(app, '/v1/cluster/nodes', resources.node.list);
    API.register.get(app, '/v1/cluster/nodes/:id', resources.node.get);

    API.register.get(app, '/v1/cluster/services', resources.service.list);
    API.register.get(app, '/v1/cluster/services/:id', resources.service.get);

    API.register.get(app, '/v1/cluster/link', resources.hive.get);
    API.register.put(app, '/v1/cluster/link', resources.hive.link);
    API.register.delete(app, '/v1/cluster/link', resources.hive.unlink);

    API.register.get(app, '/v1/cluster/tints', resources.tint.list);
    API.register.post(app, '/v1/cluster/tints', resources.tint.install);
    API.register.get(app, '/v1/cluster/tints/:profileId/:slug', resources.tint.get);
    API.register.delete(app, '/v1/cluster/tints/:profileId/:slug', resources.tint.uninstall);
};