var express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    errorhandler = require('errorhandler'),
    path = require('path'),
    cors = require('cors');

var local = require('./local');

var log4js = require('log4js');
var logger = log4js.getLogger('node');

var settings = require('./settings');

// var membershipService = require('./membership/membership.service');

start();

function start() {
    var app = express();
    var server = require('http').Server(app);
    var io = require('socket.io')(server);

    app.set('port', settings.get('port', 7000));

    // -- initialize cors
    app.use(cors({
        origin: '*',
        methods: 'GET,PUT,POST,PATCH,DELETE'
    }));

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(express.static(path.join(__dirname, './ui')));

    if (app.get('env') == 'development') {
        app.use(morgan('combined'));
        app.use(errorhandler());
    }

    require('./api')(app, io);

    local.run().then(function() {
        app.listen(app.get('port'), function() {
            logger.info('Node API up and running on port ' + app.get('port'));
        });
    });

    return app;
}
