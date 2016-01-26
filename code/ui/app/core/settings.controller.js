angular.module('mmc').controller('SettingsController', SettingsController);

SettingsController.$inject = ['$scope', '$mdSidenav', 'SettingsService'];

function SettingsController($scope, $mdSidenav, SettingsService) {
    var sc = this;

    sc.settings = {};
    sc.toggleList = toggleList;

    SettingsService.get().then(function(settings) {
        if (! settings) settings = {};
        if (! settings.hive) settings.hive = {};

        sc.settings = settings;

        $scope.$watch('sc.settings', function (newVal, oldVal) {
            if (newVal == oldVal) return;

            saveSettings();
        }, true);
    });

    function toggleList() {
        $mdSidenav('right').toggle();
    }

    function saveSettings() {
        return SettingsService.set(sc.settings);
    }
}