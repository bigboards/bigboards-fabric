app.controller('NavigationController', function($scope, $location, Tints) {
    $scope.tints = Tints.get();

    $scope.isActiveView = function (viewLocation) {
        var path = $location.path();
        var index = path.indexOf(viewLocation);
        return index != -1;
    }
});

app.controller('MmcController', function(keyboardManager, $rootScope) {
    // -- keyboard bindings
//    keyboardManager.bind('f', function() {
//
//    });
});

