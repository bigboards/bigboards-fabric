angular.module('mmc').config(Config);

Config.$inject = ['$sceProvider', '$mdThemingProvider'];

function Config($sceProvider, $mdThemingProvider) {
    $sceProvider.enabled(false);

    $mdThemingProvider.theme('default').primaryPalette('grey');
}