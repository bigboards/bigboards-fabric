angular.module('mmc.node').controller('NodeListController', NodeListController);

NodeListController.$inject = ['Page', 'NodeService', '$location'];

function NodeListController(Page, NodeService, $location) {
    var vm = this;

    vm.nodes = [];
    vm.goto = goto;

    Page.setTitle('Nodes');

    NodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    function goto(node) {
        $location.path('/nodes/' + node.deviceId);
    }
}