var app = angular.module( 'mmc', [
    'ngRoute',
    'bb.dashboard',
    'bb.tints',
    'bb.tints.stack',
    'bb.library',
    'bb.tasks',
    'bb.update',
    'bb.tints.tutor',
    'btford.socket-io',
    'btford.markdown',
    'ui.bootstrap',
    'ngAnimate',
    'toaster',
    'webStorageModule'
]);

app.factory('settings', ['webStorage', function(webStorage) {
    return webStorage.session.get('settings');
}]);

app.config(['$routeProvider', '$sceProvider', function($routeProvider, $sceProvider) {
    $sceProvider.enabled(false);

    $routeProvider
        .when('/dashboard', {
            title: 'Dashboard',
            templateUrl: 'app/dashboard/dashboard.html',
            controller: 'DashboardController'
        })
        .when('/stacks/:owner/:id', {
            title: 'Tint',
            templateUrl: 'app/stacks/detail.html',
            controller: 'StackDetailController'
        })

        .when('/tutorials', {
            title: 'Tutorials',
            templateUrl: 'app/tutorials/list.html',
            controller: 'TutorListController'
        })
        .when('/tutorials/:owner/:slug', {
            title: 'Tutorials',
            templateUrl: 'app/tutorials/detail.html',
            controller: 'TutorDetailController',
            resolve : {
                tint: ['$route', 'Tints', function($route, Tints) {
                    return Tints.get({type: 'tutor', owner: $route.current.params.owner, slug: $route.current.params.slug});
                }]
            }
        })

        .when('/tasks', {
            title: 'Tasks',
            templateUrl: 'app/tasks/tasks.html',
            controller: 'TaskListController'
        })
        .when('/tasks/:code', {
            title: 'Tasks',
            templateUrl: 'app/tasks/detail.html',
            controller: 'TaskDetailController'
        })
        .when('/tasks/:code/attempts/:attempt/:channel', {
            title: 'Tasks',
            templateUrl: 'app/tasks/attempt.html',
            controller: 'TaskAttemptController'
        })

        .when('/settings', {
            title: 'Settings',
            templateUrl: 'app/settings/view.html',
            controller: 'SettingsController'
        })

        .when('/library', {
            title: 'Library',
            templateUrl: 'app/library/library.html',
            controller: 'LibraryController'
        })

        .when('/library/:type/:owner/:slug', {
            title: 'Library',
            templateUrl: 'app/library/view.html',
            controller: 'LibraryItemViewController',
            resolve : {
                tint: ['$route', 'Hex', 'Library', function($route, Hex, Library) {
                    var type = $route.current.params.type;
                    var owner = $route.current.params.owner;
                    var slug = $route.current.params.slug;

                    return Hex.isInstalled(type, owner, slug).then(function(isInstalled) {
                        if (isInstalled) {
                            return Hex.getTint(type, owner, slug);
                        } else {
                            return Library.get(type, owner, slug).then(function(tint) {
                                return tint.data;
                            });
                        }
                    });

                }]
            }
        })

        .otherwise({
            redirectTo: '/dashboard'
        });
}]);

app.run(['$rootScope', '$http', 'Hex', 'settings', function($rootScope, $http, Hex, settings) {


    $http.defaults.headers.common['BB-Firmware'] = settings.firmware;
    $http.defaults.headers.common['BB-Architecture'] = settings.arch;

    $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
        if (current.$$route) {
            $rootScope.title = current.$$route.title;
        }
    });
}]);

app.controller('ApplicationController', ['$scope', '$location', 'Hex', 'socket', 'Firmware', function($scope, $location, Hex, socket, Firmware) {
    $scope.currentItem = null;
    $scope.hex = Hex;

    $scope.menu = [
        {
            label: 'Dashboard',
            icon: 'fa-dashboard',
            path: '/dashboard'
        },
        {
            label: 'Library',
            icon: 'fa-tint',
            path: '/library'
        },
        {
            label: 'Tasks',
            icon: 'fa-tasks',
            path: '/tasks'
        },
        //{
        //    label: 'Tutor',
        //    icon: 'fa-graduation-cap',
        //    path: '/tutors'
        //},
        {
            label: 'Settings',
            icon: 'fa-cog',
            path: '/settings'
        },
        {
            label: 'Stats',
            icon: 'fa-area-chart',
            url: $location.protocol() + '://' + $location.host() + '/ganglia'
        },
        {
            label: 'Docs',
            icon: 'fa-book',
            url: 'http://docs.bigboards.io'
        }

    ];

    //$scope.firmware = Firmware.get();

    $scope.$on('$routeChangeSuccess', function(event, current, previous) {
        $scope.menu.forEach(function(item) {
            if (item.path && current.$$route && current.$$route.originalPath.indexOf(item.path) == 0)
                $scope.currentItem = item;
        });
    });

    $scope.invokeMenuItem = function(item) {
        if (item.handler) {
            item.handler($scope);
        } else if (item.path) {
            $location.path(item.path);
            $scope.$emit('navigate', item);
        } else if (item.url) {
            console.log('goto ' + item.url);
            window.open(item.url,'_blank');
        }
    };
}]);
