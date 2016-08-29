angular.module('mmc')
    .factory('Application', Application);

Application.$inject = ['NodeService'];

function Application(NodeService) {
    var isLoading = true;
    var isLinked = false;

    var pageTitle = null;
    var showNavigation = true;

    var loadListeners = [];

    NodeService.get().then(function(data) {
        linked(data.is_linked);

        loadListeners.forEach(function(ll) {
            ll();
        })
    });

    return {
        linked: linked,
        onLoad: registerLoadListener,
        page: {
            title: title,
            navigation: navigation
        }
    };

    function linked(value) {
        if (value) {
            isLinked = value;
            isLoading = false;
        } else return isLinked;
    }

    function registerLoadListener(fn) {
        loadListeners.push(fn);
    }

    function title(value) {
        if (value == null) return pageTitle;
        else pageTitle = value;
    }

    function navigation(value) {
        if (value == null) return showNavigation;
        else showNavigation = value;
    }
}
