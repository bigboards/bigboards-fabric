/**********************************************************************************************************************
 * Module dependencies
 *********************************************************************************************************************/
var express = require('express'),
    cors = require('cors'),
    params = require('express-params'),
    http = require('http'),
    os = require('os'),
    path = require('path'),
    Container = require('./container'),
    Services = require('./services'),
    winston = require('winston'),
    Serfer = require('serfer/src/'),
    Q = require('q'),
    Templater = require('./utils/templater'),
    KV = require('./kv'),
    ObjStore = require('./obj');

mmcConfig = initializeMMCConfiguration();

var serfer = new Serfer();
serfer.connect().then(function() {
    var app = initializeExpress();
    var server = initializeHttpServer(app);

    // -- get the runtime environment
    mmcConfig.environment = app.get('env');

    var hexConfig = new KV(mmcConfig.file.hex);
    var registryStore = new ObjStore(mmcConfig.file.registry);

    var services = initializeServices(mmcConfig, hexConfig, registryStore, serfer, app);

    services.task.registerDefaultTasks(hexConfig, services);

    var io = initializeSocketIO(server, services);

    server.listen(app.get('port'), function () {
        winston.info('BigBoards-mmc listening on port ' + app.get('port'));
    });
}).fail(function(error) {
    handleError(error);
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
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(express.static(path.join(__dirname, '../client')));
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

function initializeServices(mmcConfig, hexConfig, registryStore, serf, app) {
    var templater = new Templater(hexConfig);
    winston.log('info', 'Service Registration:');

    var services = {};

    services.task = new Services.Task.Service(mmcConfig, hexConfig);
    Services.Task.link(app, services);

    services.settings = new Services.Settings.Service(mmcConfig, hexConfig);
    Services.Settings.link(app, services);

    services.hex = new Services.Hex.Service(mmcConfig, hexConfig, templater, services, serf);
    Services.Hex.link(app, services);

    services.tutorials = new Services.Tutorials.Service(mmcConfig, hexConfig, services, templater);
    Services.Tutorials.link(app, services);

    services.registry = new Services.Registry.Service(mmcConfig, hexConfig, registryStore);
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