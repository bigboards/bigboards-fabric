var dashboardModule = angular.module('bb.dashboard', ['ngResource']);

dashboardModule.controller('DashboardController', ['$scope', 'Hex', 'Nodes', 'Tints', 'Tasks', 'socket', 'ApiFeedback', '$location',
                                          function ($scope,   Hex,   Nodes,   Tints,   Tasks,   socket,   ApiFeedback,   $location) {
    $scope.nodes = Nodes.list();

    Hex.getInstalledTints().then(function(installedTints) {
        $scope.tints = installedTints;
    });

    Hex.getIdentity().then(function(identity) {
        $scope.deviceName = identity.name;
    });

    $scope.model = {
        metrics: {}
    };

    socket.on('metrics', function(data) {
        $scope.model.metrics = data;
    });

    socket.on('task:started', function(task) {
        //if (! task) return;
        //
        //$scope.task = task;
        //$scope.url = '#/tasks/' + $scope.task.task.code + '/attempts/' + $scope.task.attempt + '/output';
    });

    socket.on('task:finished', function(task) {
        $scope.tints = Hex.getInstalledTints();
    });

    socket.on('task:failed', function(task) {
        $scope.tints = Hex.getInstalledTints();
    });

    $scope.getMetric = function(node, metric) {
        if (! $scope.model.metrics) return 'na';
        if (! $scope.model.metrics[node.name]) return 'na';
        if (! $scope.model.metrics[node.name][metric]) return 'na';

        return $scope.model.metrics[node.name][metric];
    };

    $scope.hasInstalledTints = function() {
        return $scope.tints && Object.keys($scope.tints).length > 0;
    };

    $scope.update = function() {
        Firmware.save(
            ApiFeedback.onSuccess("Successfully updated the hex to the latest version"),
            ApiFeedback.onError()
        );
    };

    $scope.powerOff = function() {
        Hex.halt(function(attempt) {
                $location.path('/tasks/' + attempt.task.code + '/attempts/' + attempt.attempt + '/output');
            },
            ApiFeedback.onError()
        );
    };
}]);
