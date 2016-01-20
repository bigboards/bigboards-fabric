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
    Q = require('q'),
    Templater = require('./utils/templater'),
    KV = require('./kv'),
    ObjStore = require('./obj');
var disk = require('diskusage');

mmcConfig = initializeMMCConfiguration();

var consul = require('consul')();

// -- create a session on consul
registerNode('wlp2s0', '/tmp').then(function(sessionId) {
    winston.info('Consul session created with id ' + sessionId);

    var app = initializeExpress();
    var server = initializeHttpServer(app);

// -- get the runtime environment
    mmcConfig.environment = app.get('env');

    var services = initializeServices(mmcConfig, app);

    services.task.registerDefaultTasks(services);

    var io = initializeSocketIO(server, services);

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

function registerNode(nic, dataDir) {
    var defer = Q.defer();

    consul.session.create({behaviour: 'delete', name: 'Fabric'}, function(err, result) {
        if (err) return defer.reject(err);

        var sessionId = result.ID;

        // -- check if the nic is available
        var nics = os.networkInterfaces();
        if (! nics[nic]) {
            console.log('Unable to find details about the ' + nic + ' network interface. Does it have an ip?');
            return 1;
        }

        var data = {
            deviceId: null,
            hostname: os.hostname(),
            arch: getArch(),
            memory: os.totalmem(),
            cpus: [],
            disks: [],
            ipv4: null,
            mac: null
        };

        // -- read the disk data
        Q.all([
            getDiskInfo('/'),
            getDiskInfo(dataDir)
        ]).then(function(disks) {
            data.disks.push({ type: 'os', mount: '/', size: disks[0].total});
            data.disks.push({ type: 'os', mount: '/', size: disks[1].total});
        }).then(function() {
            // -- format the cpu's
            os.cpus().forEach(function (cpu) {
                data.cpus.push(cpu['model']);
            });

            nics[nic].forEach(function (address) {
                if (address['family'] == 'IPv4') {
                    data.ipv4 = address.address;
                    data.mac = address.mac;
                    data.deviceId = address.mac.replace(/\:/g, '').toLowerCase()
                }
            });

            consul.kv.set({
                key: 'nodes/' + data.deviceId,
                value: JSON.stringify(data, null, 2),
                acquire: sessionId
            }, function(err, result) {
                if (err) return defer.reject(err);
                return defer.resolve(sessionId);
            });
        });
    });

    return defer.promise;
}

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

function getArch() {
    var arch = os.arch();

    if (arch == 'x64') return 'x86_64';
    if (arch == 'arm') return 'armv7l';
    if (arch == 'ia32') return 'x86';
    return 'unknown';
}

function getDiskInfo(path) {
    var defer = Q.defer();

    disk.check(path, function(err, disk) {
        if (err) return defer.reject(err);
        return defer.resolve(disk);
    });

    return defer.promise;
}