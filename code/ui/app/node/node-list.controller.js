angular.module('mmc.node').controller('NodeListController', NodeListController);

NodeListController.$inject = ['NodeService', '$location'];

function NodeListController(NodeService, $location) {
    var vm = this;

    vm.nodes = [];
    vm.goto = goto;

    NodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    function goto(node) {
        $location.path('/nodes/' + node.deviceId);
    }
}