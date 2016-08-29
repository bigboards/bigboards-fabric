angular.module('mmc').controller('DashboardController', DashboardController);

DashboardController.$inject = ['$mdSidenav', '$location', 'Application', 'StatusService', 'ClusterNodeService'];

function DashboardController($mdSidenav, $location, Application, StatusService, ClusterNodeService) {
    var vm = this;

    Application.page.title('Dashboard');

    vm.page = Application.page;
    vm.nodes = [];
    vm.tints = [];
    vm.status = {};
    vm.services = {};
    vm.events = [];

    ClusterNodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    StatusService.status().then(function(status) {
        vm.status = status;
    });

    vm.goto = goto;

    function goto(path) {
        $location.path(path);
    }
}