angular.module('mmc').controller('BootstrapController', BootstrapController);

BootstrapController.$inject = ['$mdSidenav', '$location', 'Application'];

function BootstrapController($mdSidenav, $location, Application) {
    var vm = this;

    Application.page.title('');
    Application.page.navigation(false);

    vm.page = Application.page;

    vm.link = link;
    vm.connect = connect;

    function link() {
        if (vm.shortId) {

        }
    }

    function connect() {
        if (vm.nodeAddresses) {
            var addresses = vm.nodeAddresses.split(',').map(function(address) { return address.trim(); });



        }
    }
}