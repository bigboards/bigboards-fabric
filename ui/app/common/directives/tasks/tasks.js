app.directive('tasks', function() {
    return {
        restrict: 'E',
        scope: {
            type: '@',
            helpRef: '@',
            bbClick: '='
        },
        controller: function ($scope, Tasks, socket, $window) {
            $scope.message = "";
            $scope.visible = false;
            $scope.state = 'running';
            $scope.output = null;

            Tasks.get().$promise.then(function(task) {
                if (task == null) return;

                $scope.task = task;
                $scope.visible = true;
                $scope.message = "I'm " + task.description;
            }, function(error) {
                // -- disregard the error
            });

            $scope.hide = function() {
                $scope.visible = false;
                $scope.task = null;
            };

            $scope.iconClass = function() {
                if ($scope.state == 'running') return 'fa-spin fa-refresh';
                else if ($scope.state == 'failed') return 'fa-exclamation-triangle';
                else if ($scope.state == 'finished') return 'fa-check';
                else return '';
            };

            socket.on('task:started', function(task) {
                $scope.task = task;
                $scope.visible = true;
                $scope.output = '';
                $scope.message = "I'm " + task.description;

                $scope.state = 'running';
            });

            socket.on('task:finished', function(task) {
                $scope.state = 'finished';
                $scope.message = "Hooray!";
            });

            socket.on('task:failed', function(task) {
                $scope.state = 'failed';
                $scope.message = "Whoops!";
            });

            socket.on('task:busy', function(progress) {
                $scope.output += progress.data;
                $window.scrollTo(0,document.body.scrollHeight);
            });
        },
        templateUrl: 'app/common/directives/tasks/tasks.html'
    };
});
