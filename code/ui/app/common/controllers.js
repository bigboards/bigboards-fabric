app.controller('MetricsController', ['$scope', '$interval', 'Status', 'HexMetrics', 'Metrics', 'socket', function($scope, $interval, Status, HexMetrics, Metrics, socket) {
    socket.on('send:metrics', function(data) {
        $scope.data = data;
    });

    $scope.refresh = function () {
//        $scope.hexMetricsDataPromise = HexMetrics.query(function (data) {
//            $scope.hexMetricsData = data;
//        });
//        $scope.metricsDataPromise = Metrics.query(function (data) {
//            $scope.metricsData = data;
//        });
    };

    // -- load the hex metric information
    $scope.refresh();

    // -- schedule automatic updating
    $scope.refreshPromise = $interval(function () {
        $scope.refresh();
    }, 5000);

    $scope.calculateCpuValue = function (metric) {
        return metric == undefined || metric.cpu == undefined || metric.cpu.idle == undefined
            ? undefined
            : metric.cpu.total == 0 ? 0 : ((metric.cpu.total - metric.cpu.idle) * 100 / metric.cpu.total); // CPU as percentage
    };

    $scope.calculateMemoryValue = function (metric) {
        return metric == undefined || metric.memory == undefined || metric.memory.used == undefined
            ? undefined
            : metric.memory.used;
    };

    $scope.calculateDiskValue = function (metric) {
        return metric == undefined || metric.disk == undefined || metric.disk.used == undefined
            ? undefined
            : metric.disk.used;
    };

    $scope.calculateCpuTotal = function (metric) {
        return metric == undefined || metric.cpu == undefined || metric.cpu.total == 0
            ? 0
            : 100.00; // CPU as percentage
    };

    $scope.calculateMemoryTotal = function (metric) {
        return metric == undefined || metric.memory == undefined || metric.memory.total == undefined ? 0 : metric.memory.total;
    };

    $scope.calculateDiskTotal = function (metric) {
        return metric == undefined || metric.disk == undefined || metric.disk.total == undefined ? 0 : metric.disk.total;
    };
}]);

app.controller('ConsoleController', ['$scope', 'socket'], function($scope, socket) {
    $scope.visible = false;

    socket.on('hex:update:started', function() {
        $scope.visible = true;
    });

    socket.on('hex:update:success', function(code) {
        alert("Successfully updated the hex!");
    });

    socket.on('hex:update:failed', function(error) {
        alert("The hex update failed! " + error);
    });

    socket.on('hex:update:busy', function(data) {
        console.log('updating: ' + data);
    });
});
