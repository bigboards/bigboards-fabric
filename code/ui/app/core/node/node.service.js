angular.module('mmc')
    .factory('NodeService', NodeService);

NodeService.$inject = [ 'settings', '$resource' ];

function NodeService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/node',
        {},
        {
            get: { method: 'GET', isArray: false}
        });

    return {
        get: get
    };

    function get() {
        return resource.get().$promise;
    }
}
