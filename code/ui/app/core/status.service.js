angular.module('mmc')
    .factory('StatusService', StatusService);

StatusService.$inject = [ 'settings', '$resource' ];

function StatusService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster',
        { owner: '@owner', slug: '@slug' },
        {
            status: { method: 'GET', isArray: false}
        });

    return {
        status: status
    };

    function status() {
        return resource.status().$promise;
    }

}
