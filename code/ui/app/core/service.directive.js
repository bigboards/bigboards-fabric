angular.module('mmc').directive('bbService', function() {
    return {
        restrict: 'E',
        scope: {
            serviceName: '=',
            serviceData: '='
        },
        templateUrl: 'app/core/service.directive.html',
        controller: ServiceController,
        controllerAs: 'vm',
        bindToController: true
    }
});

ServiceController.$inject = ['$scope'];

function ServiceController($scope) {
    var vm = this;

    vm.count = {
        passing: 0,
        warning: 0,
        critical: 0,
        unknown: 0
    };

    calculate(vm.serviceData);

    $scope.$watch('serviceData', function(newVal) {
        if (newVal) calculate(vm.serviceData)
    });

    function calculate(serviceData) {
        vm.count = {
            passing: 0,
            warning: 0,
            critical: 0,
            unknown: 0
        };

        for (var node in serviceData) {
            if (! serviceData.hasOwnProperty(node)) continue;

            vm.count[serviceData[node].status]++
        }
    }



}