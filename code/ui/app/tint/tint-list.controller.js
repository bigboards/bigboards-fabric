angular.module('mmc.node').controller('TintListController', TintListController);

TintListController.$inject = ['Page', 'TintService', '$location'];

function TintListController(Page, TintService, $location) {
    var vm = this;

    vm.tints = [];
    vm.goto = goto;

    Page.setTitle('Tints');

    TintService.list().then(function(nodes) {
        vm.tints = nodes;
    });

    function goto(tint) {
        $location.path('/tints/' + tint.owner + '/' + tint.slug);
    }
}