angular.module('mmc.node').controller('NodeDetailController', NodeDetailController);

NodeDetailController.$inject = ['Application', 'node'];

function NodeDetailController(Application, node) {
    var vm = this;

    vm.node = node;

    Application.page.title('Node ' + node.hostname);
}