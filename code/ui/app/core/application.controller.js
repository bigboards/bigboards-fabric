angular.module('mmc').controller('ApplicationController', ApplicationController);

ApplicationController.$inject = ['$mdSidenav', '$location', 'Page'];

function ApplicationController($mdSidenav, $location, Page) {
    var ac = this;

    ac.page = Page;
    ac.toggleList = toggleList;
    ac.goto = goto;

    function toggleList() {
        $mdSidenav('left').toggle();
    }

    function goto(path) {
        $location.path(path);
    }
}