angular.module('mmc').config(Config);

Config.$inject = ['$sceProvider', '$mdThemingProvider', '$routeProvider'];

function Config($sceProvider, $mdThemingProvider, $routeProvider) {
    $sceProvider.enabled(false);

    $mdThemingProvider.theme('default').primaryPalette('grey');

    $routeProvider
        .when('/', {
            templateUrl: 'app/core/dashboard.part.html',
            controller: 'DashboardController',
            controllerAs: 'vm'
        })
        .when('/bootstrap', {
            templateUrl: 'app/core/bootstrap.part.html',
            controller: 'BootstrapController',
            controllerAs: 'vm'
        });
}