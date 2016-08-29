angular.module('mmc').controller('ApplicationController', ApplicationController);

ApplicationController.$inject = ['$mdSidenav', '$location', 'Application'];

function ApplicationController($mdSidenav, $location, Application) {
    var ac = this;

    ac.page = Application.page;
    ac.toggleList = toggleList;
    ac.goto = goto;

    function toggleList() {
        $mdSidenav('right').toggle();
    }

    function goto(path) {
        $location.path(path);
    }
}