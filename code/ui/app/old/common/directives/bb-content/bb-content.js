app.directive('bbContent', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            glue: '=?'
        },
        controller: function($scope) {
            if (! $scope.glue) $scope.glue = false;
        },
        template: '<div class="bb-content" scroll-glue="glue" ng-transclude></div>'
    };
});