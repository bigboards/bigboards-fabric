angular.module('mmc').directive('terminal', function() {
    return {
        restrict: 'E',
        scope: {
            name: '@'
        },
        template: '<span>Hello {{name}}<div class="term"></div></span>',
        link: function(scope, elem, attrs) {
            var socket = io.connect();
            socket.on('connect', function() {
                var term = new Terminal({
                    cols: 80,
                    rows: 24,
                    screenKeys: true
                });

                term.on('data', function(data) {
                    socket.emit('data', data);
                });

                term.on('title', function(title) {
                    document.title = title;
                });

                term.open(elem.find("div")[0]);

                term.write('\x1b[31mWelcome to term.js!\x1b[m\r\n');

                socket.on('data', function(data) {
                    term.write(data);
                });

                socket.on('disconnect', function() {
                    term.destroy();
                });
            });
        }
    }
});