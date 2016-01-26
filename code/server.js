/**********************************************************************************************************************
 * Module dependencies
 *********************************************************************************************************************/
var express = require('express'),
    cors = require('cors'),
    params = require('express-params'),
    http = require('http'),
    os = require('os'),
    path = require('path'),
    Services = require('./services'),
    winston = require('winston'),
    Q = require('q'),
    Templater = require('./utils/templater');

var Cluster = require('./cluster');


var store = {
    kv: require('./store/kv'),
    session: require('./store/session')
};

var mmcConfig = initializeMMCConfiguration();

var consul = require('consul')();

Cluster.start(mmcConfig.port).then(function() {
    var app = initializeExpress();
    var server = initializeHttpServer(app);

    // -- get the runtime environment
    mmcConfig.environment = app.get('env');

    //var services = initializeServices(mmcConfig, app);

    //services.task.registerDefaultTasks(services);

    //var io = initializeSocketIO(server, services);

    require('./api')(app);

    server.listen(app.get('port'), function () {
        winston.info('BigBoards-mmc listening on port ' + app.get('port'));
    });
}).fail(function(error) {
    winston.log('error', error);
    winston.log('error', error.stack);
});

process.on('uncaughtException', function(err) {
    handleError(err);
});

function initializeMMCConfiguration() {
    var config = require('./config').lookupEnvironment();

    // -- read the environment variables which will allow configuration parameters to be overridden
    if (process.env.DOCKER_REGISTRY) config.docker.registry = process.env.DOCKER_REGISTRY;
    if (process.env.HIVE) config.docker.registry = process.env.HIVE;

    return config;
}

function initializeHttpServer(app) {
    return http.createServer(app);
}

function initializeExpress() {
    var app = express();

    params.extend(app);

    var corsOptions = {
        origin: '*',
        methods: 'GET,PUT,POST,DELETE'
    };

    app.set('port', mmcConfig.port);
    //app.use(function(req, res, next) {
    //    res.header("Access-Control-Allow-Origin", "*");
    //    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //    next();
    //});
    app.use(cors(corsOptions));
    app.use(express.bodyParser());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, './ui')));
    app.use(app.router);

    // development only
    if (mmcConfig.is_dev) {
        app.use(express.logger('dev'));
        app.use(express.errorHandler());
    }

    return app;
}

function initializeSocketIO(server, services) {
    var io = require('socket.io').listen(server);
    //io.set('log level', 1); // reduce logging

    // -- Initialize Socket.io communication
    io.sockets.on('connection', function(socket) {
        Services.Hex.io(socket, services);
        Services.Settings.io(socket, services);
        Services.Task.io(socket, services);
        Services.Tutorials.io(socket, services);
        Services.Registry.io(socket, services);
    });

    return io;
}

function initializeServices(mmcConfig, app) {
    var templater = new Templater();
    winston.log('info', 'Service Registration:');

    var services = {};

    services.task = new Services.Task.Service(mmcConfig);
    Services.Task.link(app, services);

    services.settings = new Services.Settings.Service(mmcConfig);
    Services.Settings.link(app, services);

    services.hex = new Services.Hex.Service(mmcConfig, templater, services);
    Services.Hex.link(app, services);

    services.tutorials = new Services.Tutorials.Service(mmcConfig, services, templater);
    Services.Tutorials.link(app, services);

    services.registry = new Services.Registry.Service(mmcConfig);
    Services.Registry.link(app, services);

    return services;
}

function handleError(error) {
    // TODO must we console-log the message? Or only winston-log it?
//    var msg = JSON.stringify(error);
    console.log(error.message);
    winston.log('error', error.message);

    if (error.code == 'EADDRINFO')
        return;

    switch (error.errorCode) {
        default:
            winston.log('error', error.stack);
    }
}

