angular.module('mmc').controller('ApplicationController', ApplicationController);

ApplicationController.$inject = ['$mdSidenav', '$location', 'Page', 'nodeInfo'];

function ApplicationController($mdSidenav, $location, Page, nodeInfo) {
    var ac = this;

    ac.isMinimal = !nodeInfo.is_linked;
    ac.page = Page;
    ac.toggleList = toggleList;
    ac.goto = goto;

    function toggleList() {
        $mdSidenav('right').toggle();
    }

    function goto(path) {
        $location.path(path);
    }
}