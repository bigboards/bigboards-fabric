angular.module('mmc.node').config(config);

config.$inject = ['$routeProvider'];

function config($routeProvider) {
    $routeProvider
        .when('/nodes', {
            templateUrl: 'app/node/list.part.html',
            controller: 'NodeListController',
            controllerAs: 'vm'
        })
        .when('/nodes/:id', {
            templateUrl: 'app/node/detail.part.html',
            controller: 'NodeDetailController',
            controllerAs: 'vm',
            resolve: {
                node: ['ClusterNodeService', '$route', function(ClusterNodeService, $route) {
                    var nodeId = $route.current.params.id;
                    return ClusterNodeService.detail(nodeId);
                }]
            }
        });
}