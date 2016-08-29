angular.module('mmc').run(Run);

Run.$inject = ['$rootScope', '$location', 'Application'];

function Run($rootScope, $location, Application) {
    Application.onLoad(function() {
        if (! Application.linked() ) {
            $location.path("/bootstrap");

            // register listener to watch route changes
            $rootScope.$on( "$routeChangeStart", function(event, next, current) {
                if ( next.templateUrl == "app/core/bootstrap.part.html" ) {
                    // already going to the bootstrap page, no redirect needed
                } else {
                    // not going to #bootstrap, we should redirect now
                    $location.path( "/bootstrap" );
                }
            });
        }
    });
}