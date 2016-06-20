angular.module('mmc')
    .factory('AppService', TintService);

TintService.$inject = [ 'settings', '$resource' ];

function TintService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/tints/:owner/:slug',
        { owner: '@owner', slug: '@slug' },
        {
            list: { method: 'GET', isArray: true},
            detail: { method: 'GET', isArray: false},
            status: { method: 'GET', isArray: false}
        });

    return {
        list: list,
        detail: detail
    };

    function list() {
        return resource.list().$promise;
    }

    function detail(owner, slug) {
        return resource.detail({owner: owner, slug: slug}).$promise;
    }

}
