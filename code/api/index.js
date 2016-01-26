var API = require('./api-helper');

var resources = {
    cluster: require('./cluster.resource'),
    node: require('./node.resource'),
    service: require('./service.resource')
};

module.exports = function(app) {
    API.register.get(app, '/v1/cluster', resources.cluster.get);

    API.register.get(app, '/v1/cluster/nodes', resources.node.list);
    API.register.get(app, '/v1/cluster/nodes/:id', resources.node.get);

    API.register.get(app, '/v1/cluster/services', resources.service.list);
    API.register.get(app, '/v1/cluster/services/:id', resources.service.get);
};