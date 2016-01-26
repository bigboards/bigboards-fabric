var tutorModule = angular.module('bb.tints.tutor', ['ngResource']);

tutorModule.controller('TutorListController', function($scope, Tutors, $routeParams) {
    // -- load the tutor tints from the server
    $scope.tutors = Tutors.list();
});

tutorModule.controller('TutorDetailController', function($scope, tint, $routeParams) {
    $scope.tint = tint;
});
