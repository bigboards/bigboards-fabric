angular.module('mmc.node').controller('NodeListController', NodeListController);

NodeListController.$inject = ['Application', 'ClusterNodeService', '$location'];

function NodeListController(Application, ClusterNodeService, $location) {
    var vm = this;

    vm.nodes = [];
    vm.goto = goto;

    Application.page.title('Nodes');

    ClusterNodeService.list().then(function(nodes) {
        vm.nodes = nodes;
    });

    function goto(node) {
        $location.path('/nodes/' + node.deviceId);
    }
}