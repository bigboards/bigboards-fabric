tintModule.controller('TintDetailController', function($scope, Tints, $routeParams) {
    $scope.tint = Tints.get({id: $routeParams.id, type: $routeParams.type});
});
