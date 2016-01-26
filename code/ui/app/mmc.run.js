angular.module('mmc').run(Run);

Run.$inject = ['$http', 'SettingsService'];

function Run($http, SettingsService) {
    var settings = SettingsService.get.local;

    $http.defaults.headers.common['BB-Firmware'] = settings.firmware;
    $http.defaults.headers.common['BB-Architecture'] = settings.arch;
}