angular.module('mmc').directive('bbContainer', function() {
    return {
        restrict: 'E',
        scope: {
            container: '=',
            status: '=containerStatus'
        },
        templateUrl: 'app/core/container.directive.html',
        controller: ContainerController,
        controllerAs: 'vm',
        bindToController: true
    }
});

ContainerController.$inject = [];

function ContainerController() {
}