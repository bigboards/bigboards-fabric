angular.module('mmc').controller('DashboardController', DashboardController);

DashboardController.$inject = ['$mdSidenav', '$location', 'Page', 'NodeService', 'TintService', 'StatusService', 'ServiceService', 'EventService'];

function DashboardController($mdSidenav, $location, Page, NodeService, TintService, StatusService, ServiceService, EventService) {
    var vm = this;

    Page.setTitle('Dashboard');

    vm.page = Page;
    vm.nodes = [];
    vm.tints = [];
    vm.status = {};
    vm.services = {};
    vm.events = [];

    ServiceService.list().then(function(services) {
        vm.services = services;
    });

    NodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    TintService.list().then(function(nodes) {
        vm.tints = nodes;
    });

    StatusService.status().then(function(status) {
        vm.status = status;
    });

    EventService.list().then(function(events) {
        vm.events = events;
    });

    vm.goto = goto;

    function goto(path) {
        $location.path(path);
    }
}