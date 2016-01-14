var stackModule = angular.module('bb.tints.stack', ['ngResource']);

stackModule.controller('StackDetailController', function($scope, Stacks, $routeParams) {
    // -- load the stack from the server
    $scope.stack = Stacks.get({owner: $routeParams['owner'], id: $routeParams['id']});
});
