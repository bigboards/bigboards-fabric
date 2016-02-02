angular.module('mmc')
    .factory('LinkService', LinkService);

LinkService.$inject = [ 'settings', '$resource' ];

function LinkService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/link',
        {},
        {
            get: { method: 'GET', isArray: false},
            link: { method: 'PUT', isArray: false},
            unlink: { method: 'DELETE', isArray: false}
        });

    return {
        get: get,
        link: link,
        unlink: unlink
    };

    function get() {
        return resource.get().$promise;
    }

    function link(shortId) {
        return resource.link({}, {shortId: shortId}).$promise;
    }

    function unlink() {
        return resource.unlink().$promise;
    }
}
