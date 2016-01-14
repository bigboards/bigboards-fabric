app.directive('consoleViewer', function() {
    return {
        restrict: 'E',
        scope: {
        },
        controller: function($scope, $location, $sce) {
            //$scope.link = $sce.trustAsUrl('http://' + $location.host() + ':57575');
            $scope.link = 'http://' + $location.host() + ':57575';
        },
        templateUrl: 'app/tutorials/directives/console-viewer/view.html'
    };
});
