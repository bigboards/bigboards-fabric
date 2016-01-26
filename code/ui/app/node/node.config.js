angular.module('mmc.node').config(config);

config.$inject = ['$routeProvider'];

function config($routeProvider) {
    $routeProvider
        .when('/nodes', {
            templateUrl: 'app/node/list.part.html',
            controller: 'NodeListController',
            controllerAs: 'vm'
        });
}