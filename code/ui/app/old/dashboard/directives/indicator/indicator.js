
dashboardModule.directive('indicator', function($window) {
    return {
        restrict: 'E',
        scope: {
            metric: '@',
            caption: '@',
            unit: '@'
        },
        controller: function ($scope, socket) {
            $scope.data = [];

            socket.on('metrics:' + $scope.metric, function(data) {
                if (data.node != 'hex') return;

                if ($scope.data.length == 5)
                    $scope.data.shift();

                $scope.data.push(data.value);
            });

            $scope.value = function() {
                if ($scope.data.length == 0) return 'n/a';
                else return $scope.data[$scope.data.length - 1];
            }
        },
        link: function(scope, element, attrs) {
            var graph = d3.select(element[0])
                    .select('svg')
                    .attr("width", "80px")
                    .attr("height", "80px");

            var width = d3.select(element[0]).node().offsetWidth;
            var height = d3.select(element[0]).node().offsetHeight;

            // X scale will fit values from 0-10 within pixels 0-100
            var x = d3.scale.linear().domain([0, 48]).range([-5, width]); // starting point is -5 so the first value doesn't show and slides off the edge as part of the transition
            // Y scale will fit values from 0-10 within pixels 0-100
            var y = d3.scale.linear().domain([0, 10]).range([0, height]);

            // Browser onresize event
            window.onresize = function() {
                scope.$apply();
            };

            // Watch for resize event
            scope.$watch(function() {
                return angular.element($window)[0].innerWidth;
            }, function() {
                scope.render(scope.data);
            });

            scope.render = function(data) {
                // create a line object that represents the SVN line we're creating
                var line = d3.svg.line()
                    // assign the X function to plot our line as we wish
                    .x(function(d,i) {
                        // verbose logging to show what's actually being done
                        //console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
                        // return the X coordinate where we want to plot this datapoint
                        return x(i);
                    })
                    .y(function(d) {
                        // verbose logging to show what's actually being done
                        //console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
                        // return the Y coordinate where we want to plot this datapoint
                        return y(d);
                    })
                    .interpolate('linear');

                // display the line by appending an svg:path element with the data line we created above
                graph.append("svg:path").attr("d", line(data));
                // or it can be done like this
                //graph.selectAll("path").data([data]).enter().append("svg:path").attr("d", line);

                function redrawWithAnimation() {
                    // update with animation
                    graph.selectAll("path")
                        .data([data]) // set the new data
                        .attr("transform", "translate(" + x(1) + ")") // set the transform to the right by x(1) pixels (6 for the scale we've set) to hide the new value
                        .attr("d", line) // apply the new data values ... but the new value is hidden at this point off the right of the canvas
                        .transition() // start a transition to bring the new value into view
                        .ease("linear")
                        .duration(750) // for this demo we want a continual slide so set this to the same as the setInterval amount below
                        .attr("transform", "translate(" + x(0) + ")"); // animate a slide to the left back to x(0) pixels to reveal the new value

                    /* thanks to 'barrym' for examples of transform: https://gist.github.com/1137131 */
                }

                scope.$on('metric:hex:' + scope.metric, function(data) {
                    if (data.length == 5) scope.data.shift();
                    scope.data.push(data);
                    redrawWithAnimation();
                });
            }
        },
        templateUrl: 'app/dashboard/directives/indicator/indicator.html'
    };
});
