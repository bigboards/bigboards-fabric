angular.module('mmc').run(Run);

Run.$inject = ['$rootScope', '$location', 'nodeInfo'];

function Run($rootScope, $location, nodeInfo) {
    // register listener to watch route changes
    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
        if ( ! nodeInfo.is_linked ) {
            // not linked, go to the bootstrap page

            if ( next.templateUrl == "app/core/bootstrap.part.html" ) {
                // already going to the bootstrap page, no redirect needed
            } else {
                // not going to #bootstrap, we should redirect now
                $location.path( "/bootstrap" );
            }
        }
    });
}