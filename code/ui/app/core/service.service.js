angular.module('mmc')
    .factory('ServiceService', ServiceService);

ServiceService.$inject = [ 'settings', '$resource' ];

function ServiceService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/services',
        { },
        {
            list: { method: 'GET', isArray: false}
        });

    return {
        list: list
    };

    function list() {
        return resource.list().$promise;
    }

}
