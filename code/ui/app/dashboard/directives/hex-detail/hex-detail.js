dashboardModule.directive('hexDetail', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            type: '@',
            history: '@'
        },
        controller: function ($scope, Nodes, socket) {
            $scope.nodes = Nodes.query();
            if (! $scope.history) $scope.history = 20;

            $scope.data = {
                load: [],
                temperature: [],
                memory: [],
                osDisk: [],
                dataDisk: []
            };

            $scope.colorFunction = function() {
                return function(d, i) {
                    return '#008888';
                };
            };

            listenForMetric('load', $scope.history);
            listenForMetric('temperature', $scope.history);
            listenForMetric('memory', $scope.history);
            listenForMetric('osDisk', $scope.history);
            listenForMetric('dataDisk', $scope.history);

            socket.on('nodes:attached', function(node) {
                $scope.nodes[node.name] = node;
            });
            socket.on('nodes:detached', function(node) {
                delete $scope.nodes[node.name];
            });

            function listenForMetric(metric, history) {
                socket.on('metrics:' + metric, function(data) {
                    if (data.node != 'hex') return;

                    pushData(metric, data.value, history);
                });
            }

            function pushData(metric, value, history) {
                if (!value) return;

                if ($scope.data[metric].length >= history) $scope.data[metric].shift();
                $scope.data[metric].push({x: new Date().getTime(), y: value});
            }
        },
        templateUrl: 'app/dashboard/directives/hex-detail/hex-detail.html'
    };
});
