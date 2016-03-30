angular.module('mmc.tint').config(config);

config.$inject = ['$routeProvider'];

function config($routeProvider) {
    $routeProvider
        .when('/tints', {
            templateUrl: 'app/tint/list.part.html',
            controller: 'TintListController',
            controllerAs: 'vm'
        });
}