angular.module('mmc.node').controller('NodeDetailController', NodeDetailController);

NodeDetailController.$inject = ['Page', 'node'];

function NodeDetailController(Page, node) {
    var vm = this;

    vm.node = node;

    Page.setTitle('Node ' + node.hostname);
}