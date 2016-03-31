angular.module('mmc').directive('bbTintView', function() {
    return {
        restrict: 'E',
        scope: {
            view: '='
        },
        templateUrl: 'app/core/view.directive.html',
        controller: TintViewController,
        controllerAs: 'vm',
        bindToController: true
    }
});

TintViewController.$inject = [];

function TintViewController() {
    var vm = this;

}