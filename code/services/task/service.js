var util = require("util"),
    EventEmitter = require('events').EventEmitter,
    winston = require('winston'),
    fs = require('fs'),
    uuid = require('node-uuid'),
    fsu = require('../../utils/fs-utils'),
    mkdirp = require('mkdirp'),
    Q = require('q');

var Errors = require('../../errors');

var TaskService = function(mmcConfig, hexConfig) {
    this.settings = mmcConfig;
    this.hexConfig = hexConfig;
    this.tasks = {};
    this.currentTask = null;

    mkdirp.sync(this.settings.dir.tasks);
};

util.inherits(TaskService, EventEmitter);

TaskService.prototype.current = function() {
    return Q(this.currentTask);
};

TaskService.prototype.get = function(code) {
    return Q(this.tasks[code]);
};

TaskService.prototype.listTasks = function() {
    return Q(this.tasks);
};

TaskService.prototype.removeAttempt = function(taskCode, attemptId) {
    return fsu.rmdir(this.settings.dir.tasks + '/' + taskCode + '/' + attemptId);
};

TaskService.prototype.removeAttempts = function(taskCode) {
    var self = this;
    return fsu
        .exists(this.settings.dir.tasks + '/' + taskCode)
        .then(function(exists) {
            if (exists) {
                return fsu.readDir(self.settings.dir.tasks + '/' + taskCode);
            } else {
                return Q([]);
            }
        }).then(function(attempts) {
            var promises = [];

            for (var i in attempts) {
                promises.push(fsu.rmdir(self.settings.dir.tasks + '/' + taskCode + '/' + attempts[i]));
            }

            return Q.all(promises);
        });
};

TaskService.prototype.listAttempts = function(taskCode) {
    var defer = Q.defer();
    var self = this;

    fs.exists(this.settings.dir.tasks + '/' + taskCode, function(exists) {
        if (exists) {
            fs.readdir(self.settings.dir.tasks + '/' + taskCode, function (err, files) {
                if (err) return defer.reject(err);

                var result = [];

                for (var file in files) {
                    var record = {
                        id: files[file]
                    };

                    var stats = fs.statSync(self.settings.dir.tasks + '/' + taskCode + "/" + files[file]);

                    record.started = stats.ctime;
                    record.ended = stats.mtime;

                    result.push(record);
                }

                return defer.resolve(result);
            });
        } else {
            defer.resolve([]);
        }
    });

    return defer.promise;
};

TaskService.prototype.registerDefaultTasks = function(hexConfig, services) {
    // -- dummy
    this.register(require('./tasks/dummy/dummy')(hexConfig));

    this.register(require('./tasks/system/halt')(hexConfig));

    // -- network
//    this.register(require('./tasks/network/network_internal')(configuration));

    // -- lxc tasks
//    this.register(require('./tasks/lxc/lxc_destroy')(configuration));
//    this.register(require('./tasks/lxc/lxc_restart')(configuration));

    // -- tint tasks
    this.register(require('./tasks/tints/stack_install')(hexConfig, services));
    this.register(require('./tasks/tints/stack_uninstall')(hexConfig, services));
    this.register(require('./tasks/tints/tutor_install')(hexConfig, services));
    this.register(require('./tasks/tints/tutor_uninstall')(hexConfig, services));

    // -- update / patch
//    this.register(require('./tasks/patch/update')(configuration));
//    this.register(require('./tasks/patch/patch_install')(configuration));
};

/**
 * Register the given task.
 *
 *   A registered task can be executed by the hex. We do this to prevent multiple instances of a task to
 *   execute at the same time.
 *
 *   A task has the following layout:
 *   {
 *      code: <the unique task code, used as a handle for invocation>,
 *      description: <a description of what the task actually does>,
 *      type: <currently only ansible is supported>,
 *      parameters: [
 *          {
 *             key: <the key for this parameter>,
 *             description: <a description of what should be passed>,
 *             required: <true or false where true indicates this parameter has to be set with every invocation>
 *          }
 *      ]
 *   }
 */
TaskService.prototype.register = function(taskDefinition) {
    if (! taskDefinition) throw new Error('Invalid task definition format!');
    if (! taskDefinition.code) throw new Error('Invalid task definition format!');
    if (! taskDefinition.description) throw new Error('Invalid task definition format!');

    this.tasks[taskDefinition.code] = taskDefinition;
    this.tasks[taskDefinition.code].running = false;

    if (! taskDefinition.parameters) this.tasks[taskDefinition.code].parameters = [];

    winston.log('info', '"%s" task registered', taskDefinition.code);
};

TaskService.prototype.output = function(taskCode, taskId) {
    var defer = Q.defer();

    fs.readFile(this.settings.dir.tasks + '/' + taskCode + '/' + taskId + '/output.log', "utf-8", function(err, content) {
        if (err) defer.reject(err);
        else defer.resolve({content: content});
    });

    return defer.promise;
};

TaskService.prototype.error = function(taskCode, taskId) {
    var defer = Q.defer();

    fs.readFile(this.settings.dir.tasks + '/' + taskCode + '/' + taskId + '/error.log', "utf-8", function(err, content) {
        if (err) defer.reject(err);
        else defer.resolve({content: content});
    });

    return defer.promise;
};

TaskService.prototype.createTaskEnvironment = function() {
    return {
        hostFile: this.settings.file.hosts,
        workdir: this.settings.dir.tasks,
        verbose: false,
        settings: this.settings,
        hexConfig: this.hexConfig
    }
};

/**
 * Invoke the task with the given code.
 *
 * @param taskCode      the unique code of the task
 * @param parameters    An object holding key/values for the parameters
 */
TaskService.prototype.invoke = function(taskCode, parameters) {
    var eventEmitter = this;
    var self = this;

    var deferred = Q.defer();

    if (!taskCode || !this.tasks[taskCode]) {
        deferred.reject(new Error('Invalid task code'));
    } else {
        var task = this.tasks[taskCode];

        var taskId = uuid.v4();

        try {
            var executionScope = buildTaskScope(task, parameters);
            var taskLogDir = this.settings.dir.tasks + '/' + taskCode + '/' + taskId;

            // -- create the output streams
            mkdirp.sync(this.settings.dir.tasks + '/' + taskCode + '/' + taskId);
            var errorStream = fs.createWriteStream(taskLogDir + '/error.log');
            var outputStream = fs.createWriteStream(taskLogDir + '/output.log');

            this.currentTask = {
                attempt: taskId,
                task: {
                    code: task.code,
                    description: task.description,
                    parameters: parameters
                }
            };

            // -- invoke the task
            winston.log('info', 'invoking task "%s": %s', taskCode, task.description);
            eventEmitter.emit('task:started', this.currentTask);

            try {
                var env = this.createTaskEnvironment();

                task.execute(env, executionScope).then(function (data) {
                    self.currentTask.data = data;
                    eventEmitter.emit('task:finished', self.currentTask);

                }, function (error) {
                    winston.log('info', 'Task invocation resulted in an error: ' + error);
                    winston.log('info', error.stack);

                    self.currentTask.error = error;
                    eventEmitter.emit('task:failed', self.currentTask);

                }, function (progress) {
                    if (progress.channel == 'output') outputStream.write(progress.data);
                    else if (progress.channel == 'error') errorStream.write(progress.data);

                    eventEmitter.emit('task:busy', { attempt: self.currentTask, data: progress.data });
                }).fin(function() {
                    outputStream.close();
                    errorStream.close();

                    self.currentTask = null;
                });

                deferred.resolve(self.currentTask);
            } catch (err) {
                deferred.reject(err);
                winston.log('info', 'Unable to invoke a task: ' + err);
                winston.log('info', err.stack);

                eventEmitter.emit('task:failed', { attempt: self.currentTask, error: err });
            }

        } catch (error) {
            deferred.reject(error);
        }
    }

    return deferred.promise;
};

function buildTaskScope(task, parameters) {
    // -- set an empty list for the parameters
    if (! parameters) parameters = {};

    var executionScope = {};
    task.parameters.forEach(function (parameter) {
        if (parameter.required && !parameters[parameter.key]) {
            throw new Errors.TaskParameterError('Executing ' + task.code + ' requires parameter ' + parameter.key + ' but it has not been provided');
        }

        executionScope[parameter.key] = parameters[parameter.key];
    });

    return executionScope;
}

module.exports = TaskService;