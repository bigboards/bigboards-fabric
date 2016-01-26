angular.module('mmc').config(Config);

Config.$inject = ['$sceProvider', '$mdThemingProvider', 'storeProvider'];

function Config($sceProvider, $mdThemingProvider, storeProvider) {
    $sceProvider.enabled(false);

    storeProvider.setStore('sessionStorage');

    $mdThemingProvider.theme('default').primaryPalette('grey');
}