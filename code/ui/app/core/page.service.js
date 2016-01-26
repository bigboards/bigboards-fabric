angular.module('mmc')
    .factory('Page', PageService);

PageService.$inject = [];

function PageService() {
    var titleValue = null;

    return {
        setTitle: setTitle,
        title: getTitle
    };

    function setTitle(value) {
        titleValue = value;
    }

    function getTitle() {
        return titleValue;
    }
}
