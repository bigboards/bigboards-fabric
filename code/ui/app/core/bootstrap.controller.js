angular.module('mmc').controller('BootstrapController', BootstrapController);

BootstrapController.$inject = ['$mdSidenav', '$location', 'Page'];

function BootstrapController($mdSidenav, $location, Page) {
    var vm = this;

    Page.setTitle('Bootstrap');

    vm.page = Page;

    vm.link = link;

    function link() {
        if (vm.shortId) {

        }
    }
}