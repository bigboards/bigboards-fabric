angular.module('mmc.node').controller('NodeListController', NodeListController);

NodeListController.$inject = ['NodeService'];

function NodeListController(NodeService) {
    var vm = this;

    vm.nodes = [];

    NodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });
}