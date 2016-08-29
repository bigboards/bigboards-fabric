angular.module('mmc')
    .factory('ClusterNodeService', ClusterNodeService);

ClusterNodeService.$inject = [ 'settings', '$resource' ];

function ClusterNodeService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/nodes/:nodeId',
        { nodeId: '@nodeId' },
        {
            list: { method: 'GET', isArray: true},
            detail: { method: 'GET', isArray: false}
        });

    return {
        list: listNodes,
        detail: getNode
    };

    function listNodes() {
        return resource.list().$promise;
    }

    function getNode(nodeId) {
        return resource.detail({nodeId: nodeId}).$promise;
    }

    function filterByName(name) {
        return resource.list({name: name}).$promise;
    }
}