app.controller('SettingsController', ['$scope', 'Hex', 'Registry', function($scope, Hex, Registry) {
    $scope.hiveLinkPart = determineHiveLinkPart($scope.hexConfig);
    $scope.editing = false;
    $scope.creating = false;

    Registry.list().then(function(response) {
        $scope.registries = response.data;
    });

    $scope.saveRegistry = function() {
        var res = null;
        if ($scope.editing) {
            res = Registry.update($scope.data.name,  $scope.data);
        } else if ($scope.creating) {
            res = Registry.add($scope.data);
        }

        if (res) {
            res.then(function(response) {
                $scope.registries[$scope.data.name] = response.data;
            }, function(error) {
                console.log(error);
            })
        }

        $scope.editing = false;
        $scope.creating = false;
    };

    $scope.removeRegistry = function(registryName) {
        Registry.remove(registryName).then(function(response) {
            delete $scope.registries[registryName];
        }, function(error) {
            console.log(error);
        })
    };

    $scope.editRegistry = function(registry) {
        $scope.data = registry;
        $scope.editing = true;
        $scope.creating = false;
    };

    $scope.createRegistry = function() {
        $scope.data = {};
        $scope.editing = false;
        $scope.creating = true;
    };

    $scope.cancelEdit = function() {
        $scope.data = null;
        $scope.editing = false;
        $scope.creating = false;
    };

    $scope.link = function(token) {
        Hex.link(token).then(function(response) {
            refresh();
        }, function(error) {
            console.log(error);
        });
    };

    $scope.unlink = function() {
        Hex.unlink().then(function(response) {
            refresh();
        }, function(error) {
            console.log(error);
        });
    };

    function refresh() {
        Hex.get().then(function(hexConfiguration) {
            $scope.hexConfig = hexConfiguration.data;
            $scope.hiveLinkPart = determineHiveLinkPart($scope.hexConfig);
        });
    }

    function determineHiveLinkPart(hexConfig) {
        if (hexConfig && hexConfig['hive.token']) return 'app/settings/partials/linked.part.html';
        else return 'app/settings/partials/unlinked.part.html';
    }


    refresh();
}]);