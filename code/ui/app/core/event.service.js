angular.module('mmc')
    .factory('EventService', EventService);

EventService.$inject = [ 'settings', '$resource' ];

function EventService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/events',
        { },
        {
            list: { method: 'GET', isArray: true}
        });

    return {
        list: list
    };

    function list() {
        return resource.list().$promise;
    }

}
