angular.module('mmc.node').controller('NodeDetailController', NodeDetailController);

NodeDetailController.$inject = ['node'];

function NodeDetailController(node) {
    var vm = this;

    vm.node = node;
}