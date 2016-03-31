angular.module('mmc').controller('DashboardController', DashboardController);

DashboardController.$inject = ['$mdSidenav', '$location', 'Page', 'NodeService', 'TintService', 'StatusService'];

function DashboardController($mdSidenav, $location, Page, NodeService, TintService, StatusService) {
    var vm = this;

    Page.setTitle('Dashboard');

    vm.page = Page;
    vm.nodes = [];
    vm.tints = [];
    vm.status = {};

    NodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    TintService.list().then(function(nodes) {
        vm.tints = nodes;
    });

    StatusService.status().then(function(status) {
        vm.status = status;
    });

    vm.goto = goto;

    function goto(path) {
        $location.path(path);
    }
}