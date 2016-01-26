app.directive('bbHeader', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            title: '=title'
        },
        controller: function ($scope, $location, socket, TaskManager) {
            $scope.task = TaskManager.currentAttempt();

            $scope.busy = function() {
                return TaskManager.busy
            };

            $scope.goto = function() {
                var attempt = TaskManager.currentAttempt();
                if (! attempt || ! attempt.task) $location.path('/tasks');
                else $location.path('/tasks/' + attempt.task.code + '/attempts/' + attempt.attempt + '/output');
            };
        },
        templateUrl: 'app/common/directives/bb-header/bb-header.html'
    };
});