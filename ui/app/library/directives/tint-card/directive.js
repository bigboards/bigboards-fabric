app.directive('tintCard', function() {
    return {
        restrict: 'E',
        scope: {
            tint: '=',
            bbClick: '=',
            format: '@',
            type: '@'
        },
        controller: function($scope) {
            $scope.additionalClasses = $scope.formFactor + ' ' + $scope.cardType;
        },
        templateUrl: 'app/library/directives/tint-card/view.html'
    };
});
