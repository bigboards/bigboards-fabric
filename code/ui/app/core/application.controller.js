angular.module('mmc').controller('ApplicationController', ApplicationController);

ApplicationController.$inject = ['$mdSidenav'];

function ApplicationController($mdSidenav) {
    var ac = this;

    ac.toggleList = toggleList;

    function toggleList() {
        $mdSidenav('left').toggle();
    }
}