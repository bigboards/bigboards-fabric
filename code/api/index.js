var API = require('./api-helper');

var resources = {
    cluster: require('./cluster.resource'),
    node: require('./node.resource'),
    service: require('./service.resource'),
    setting: require('./settings.resource'),
    tint: require('./tint.resource')
};

module.exports = function(app) {
    API.register.get(app, '/v1/cluster', resources.cluster.get);

    API.register.get(app, '/v1/cluster/settings', resources.setting.get);
    API.register.post(app, '/v1/cluster/settings', resources.setting.set);

    API.register.get(app, '/v1/cluster/nodes', resources.node.list);
    API.register.get(app, '/v1/cluster/nodes/:id', resources.node.get);

    API.register.get(app, '/v1/cluster/services', resources.service.list);
    API.register.get(app, '/v1/cluster/services/:id', resources.service.get);

    API.register.get(app, '/v1/cluster/tints', resources.tint.list);
    API.register.get(app, '/v1/cluster/tints/:profileId/:slug', resources.tint.get);
};