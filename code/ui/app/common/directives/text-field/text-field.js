app.directive('textField', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            name: '@',
            label: '@',
            model: '='
        },
        templateUrl: 'app/common/directives/text-field/text-field.html'
    };
});