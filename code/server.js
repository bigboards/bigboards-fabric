var express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    errorhandler = require('errorhandler'),
    path = require('path'),
    cors = require('cors');

var log4js = require('log4js');
var logger = log4js.getLogger('node');

var settings = require('./settings');

var membershipService = require('./membership/membership.service');

start();

function start() {
    var app = express();

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

    require('./api')(app);

    // -- start the node if it has been configured
    if (membershipService.status().joined) {
        logger.info("The node is already a member of the cluster. We can proceed with starting the cluster link");
        membershipService.start();
    }

    app.listen(app.get('port'), function() {
        logger.info('Node API up and running on port ' + app.get('port'));
    });

    return app;
}
