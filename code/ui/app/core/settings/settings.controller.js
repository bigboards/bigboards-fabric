angular.module('mmc').controller('SettingsController', SettingsController);

SettingsController.$inject = ['$scope', '$mdSidenav', 'SettingsService', 'LinkService'];

function SettingsController($scope, $mdSidenav, SettingsService, LinkService) {
    var sc = this;

    sc.settings = {};
    sc.toggleList = toggleList;
    sc.link = link;
    sc.unlink = unlink;

    //LinkService.get().then(function(linkData) {
    //    sc.linkData = linkData;
    //});

    //SettingsService.get().then(function(settings) {
    //    if (! settings) settings = {};
    //    if (! settings.hive) settings.hive = {};
    //
    //    sc.settings = settings;
    //
    //    $scope.$watch('sc.settings', function (newVal, oldVal) {
    //        if (newVal == oldVal) return;
    //
    //        saveSettings();
    //    }, true);
    //});

    function toggleList() {
        $mdSidenav('right').toggle();
    }

    function saveSettings() {
        return SettingsService.set(sc.settings);
    }

    function link() {
        LinkService.link(sc.shortId).then(function() {
            sc.linkData = {shortId: sc.shortId};
        });
    }

    function unlink() {
        LinkService.unlink();
    }
}