app.directive('tutorialViewer', function() {
    return {
        restrict: 'E',
        scope: {
            tutorial: '=',
            bookmark: '='
        },
        controller: function($scope, $localStorage, Tutorials) {
            $scope.currentView = null;
            $scope.currentItem = null;

            $scope.selectTocItem = function(tocItem) {
                if (tocItem.type == 'content') {
                    $scope.content = null;
                    $scope.error = null;

                    $scope.navigateTo(tocItem.path);
                }
            };

            $scope.showToc = function() {
                $scope.currentView = 'toc';
            };

            $scope.hideToc = function() {
                $scope.currentView = 'content';
            };

            $scope.hasNextPage = function() {
                return $scope.currentItem.next !== undefined;
            };

            $scope.nextPage = function() {
                if (! $scope.hasNextPage()) return;

                return $scope.navigateTo($scope.currentItem.next.path);
            };

            $scope.hasPreviousPage = function() {
                return $scope.currentItem.previous !== undefined;
            };

            $scope.previousPage = function() {
                if (! $scope.hasPreviousPage()) return;

                return $scope.navigateTo($scope.currentItem.previous.path);
            };

            $scope.navigateTo = function(path) {
                Tutorials
                    .page($scope.tutorial.owner, $scope.tutorial.slug, path.join('/'))
                    .success(function(data, status, headers, config) {
                        $scope.currentItem = data;
                        $scope.currentView = 'content';
                        $localStorage[$scope.tutorial.owner + '-' + $scope.tutorial.slug] = path;
                    })
                    .error(function(data, status, headers, config) {
                        $scope.error = data;
                        $scope.currentView = 'error';
                    });
            };

            $scope.viewUrl = function(view) {
                if (view == 'toc') return 'app/tutorials/directives/tutorial-viewer/toc.html';
                else if (view == 'content') return 'app/tutorials/directives/tutorial-viewer/content.html';
                else return 'app/tutorials/directives/tutorial-viewer/error.html';
            };

            var currentPath = $localStorage[$scope.tutorial.owner + '-' + $scope.tutorial.slug];
            if (!currentPath) {
                Tutorials
                    .toc($scope.tutorial.owner, $scope.tutorial.slug)
                    .success(function (data, status, headers, config) {
                        $scope.currentView = 'toc';
                        $scope.toc = data;
                    })
                    .error(function (data, status, headers, config) {
                        $scope.error = data;
                        $scope.currentView = 'error';
                    });
            } else {
                $scope.navigateTo(currentPath);
            }
        },
        templateUrl: 'app/tutorials/directives/tutorial-viewer/view.html'
    };
});
