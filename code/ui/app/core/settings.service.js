angular.module('mmc')
    .factory('SettingsService', SettingsService);

SettingsService.$inject = [ 'settings', '$resource' ];

function SettingsService(settings, $resource) {
    var resource = $resource(
        settings.api + '/v1/cluster/settings',
        {},
        {
            get: { method: 'GET', isArray: false},
            set: { method: 'POST', isArray: false}
        });

    return {
        get: getSettings,
        set: setSettings
    };

    function getSettings() {
        return resource.get().$promise;
    }

    function setSettings(settings) {
        return resource.set({}, settings).$promise;
    }
}
