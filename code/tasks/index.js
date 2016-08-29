var Q = require('q'),
    kv = require('../store/kv'),
    fsUtils = require('../utils/fs-utils-sync'),
    settings = require('../settings'),
    introspect = require('../introspecter'),
    errors = require('../errors'),
    fs = require('fs'),
    uuid = require('node-uuid');

var log4js = require('log4js'),
    logger = log4js.getLogger('tasks');

var taskTypes = {
    halt: require('./types/system/halt'),
    app_install: require('./types/apps/app_install'),
    app_uninstall: require('./types/apps/app_uninstall')
};

module.exports = {
    current: current,
    invoke: invoke,
    types: {
        list: listTaskTypes,
        get: getTaskType,
        clear: removeAllAttempts
    },
    attempts: {
        list: listTaskAttempts,
        get: getAttempt,
        remove: removeAttempt,
        output: outputStream,
        error: errorStream
    }
};

function listTaskTypes() {
    var result = [];

    for (var taskTypeCode in taskTypes) {
        if (! taskTypes.hasOwnProperty(taskTypeCode)) continue;

        result.push({
            code: taskTypeCode,
            description: taskTypes[taskTypeCode].description
        });
    }

    return Q(result);
}

function getTaskType(taskTypeCode) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");

    return (taskTypes.hasOwnProperty(taskTypeCode)) ? Q(taskTypes[taskTypeCode]) : Q.reject(errors.NotFoundError("No such task type"));
}

function listTaskAttempts(taskTypeCode) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");

    return kv.children("tasks/archive/" + taskTypeCode).then(function(attemptIds) {
        return attemptIds;
    }, function(error) {
        throw new Error("Unable to get the task attempts for task type " + taskTypeCode + ": " + error.message);
    });
}

function current() {
    return kv.get.key("tasks/current").then(function(data) {
        return kv.get.key("tasks/archive/" + data);
    }, function() {
        return null;
    });
}

function getAttempt(taskTypeCode, attemptId) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");
    if (! attemptId) throw new errors.MissingArgumentError("attemptId");

    return kv.get.key("tasks/archive/" + taskTypeCode + "/" + attemptId)
}

function removeAttempt(taskTypeCode, attemptId) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");
    if (! attemptId) throw new errors.MissingArgumentError("attemptId");

    return kv.remove.key("tasks/archive/" + taskTypeCode + "/" + attemptId);
}

function removeAllAttempts(taskTypeCode) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");

    return kv.remove.prefix("tasks/archive/" + taskTypeCode);
}

function outputStream(taskTypeCode, attemptId) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");
    if (! attemptId) throw new errors.MissingArgumentError("attemptId");

    var defer = Q.defer();

    fs.readFile(settings.get("data.dir") + '/tasks/' + taskTypeCode + '/' + attemptId + '/output.log', "utf-8", function(err, content) {
        if (err) defer.reject(err);
        else defer.resolve({content: content});
    });

    return defer.promise;
}

function errorStream(taskTypeCode, attemptId) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");
    if (! attemptId) throw new errors.MissingArgumentError("attemptId");

    var defer = Q.defer();

    fs.readFile(settings.get("data.dir") + '/tasks/' + taskTypeCode + '/' + attemptId + '/error.log', "utf-8", function(err, content) {
        if (err) defer.reject(err);
        else defer.resolve({content: content});
    });

    return defer.promise;
}

/**
 * Invoke the task with the given code.
 *
 * @param taskTypeCode  the code of the type of task to invoke
 * @param parameters    An object holding key/values for the parameters
 */
function invoke(taskTypeCode, parameters) {
    if (! taskTypeCode) throw new errors.MissingArgumentError("taskTypeCode");

    if (!taskTypeCode || ! taskTypes[taskTypeCode]) return Q.reject(errors.NotFoundError("No task type with code '" + taskTypeCode + "' could be found"));

    var taskType = taskTypes[taskTypeCode];
    var taskAttemptId = uuid.v4();

    return kv.exists("tasks/current").then(function(isTaskRunning) {
        if (isTaskRunning)
            return Q.reject("A task is already running");

        return introspect().then(function(deviceData) {
            var taskAttemptDetails = {
                taskType: taskTypeCode,
                attemptId: taskAttemptId,
                description: taskType.description,
                parameters: parameters,
                node: deviceData.deviceId,
                timestamp: new Date(),
                status: "STARTED"
            };

            var consulAttemptKey = "tasks/archive/" + taskTypeCode + "/" + taskAttemptId;

            return kv
                .set(consulAttemptKey, taskAttemptDetails)
                .set("tasks/current", { taskTypeCode: taskTypeCode, taskAttemptId: taskAttemptId })
                .then(function() {
                    logger.info("task " + taskAttemptId + " of type " + taskTypeCode + " RUNNING");

                    var deferred = Q.defer();

                    // -- create the task log facilities
                    var taskLogDir = settings.get("data.dir") + '/tasks/' + taskTypeCode + '/' + taskAttemptId;
                    fsUtils.mkdir(taskLogDir);
                    logger.trace("Created the task log directory " + taskLogDir);

                    // -- create the output streams
                    var errorStream = fs.createWriteStream(taskLogDir + '/error.log');
                    var outputStream = fs.createWriteStream(taskLogDir + '/output.log');

                    // -- create the execution scope and the task context
                    var executionScope = createTaskScope(task, parameters);
                    var context = createTaskContext();

                    try {
                        taskType
                            .execute(context, executionScope)
                            .then(function () {
                                taskAttemptDetails.status = "FINISHED";
                                logger.info("task " + taskAttemptId + " of type " + taskTypeCode + " FINISHED");

                                return kv.set(consulAttemptKey, taskAttemptDetails)

                            }, function (error) {
                                logger.error('Task invocation resulted in an error: ' + error);
                                logger.error(error.stack);

                                taskAttemptDetails.status = "FAILED";
                                logger.info("task " + taskAttemptId + " of type " + taskTypeCode + " FAILED");

                                return kv.set(consulAttemptKey, taskAttemptDetails)

                            }, function (progress) {
                                if (progress.channel == 'output') outputStream.write(progress.data);
                                else if (progress.channel == 'error') errorStream.write(progress.data);

                            }).fin(function() {
                                outputStream.close();
                                errorStream.close();

                                return kv.remove.key("tasks/current");
                            });

                        deferred.resolve(taskAttemptDetails);
                    } catch (err) {
                        deferred.reject(err);
                        logger.error('Unable to invoke a task: ' + err);
                        logger.error(err.stack);
                        logger.info("task " + taskAttemptId + " of type " + taskTypeCode + " FAILED");
                    }

                    return deferred.promise;
                });
        });
    });
}

function createTaskContext() {
    return {
        workdir: settings.get("data.dir") + "/tasks",
        verbose: false,
        settings: settings
    }
}

function createTaskScope(taskType, parameters) {
    // -- set an empty list for the parameters
    if (! parameters) parameters = {};

    var executionScope = {};
    taskType.parameters.forEach(function (parameter) {
        if (parameter.required && !parameters[parameter.key]) {
            throw new errors.TaskParameterError('Executing ' + taskType.code + ' requires parameter ' + parameter.key + ' but it has not been provided');
        }

        executionScope[parameter.key] = parameters[parameter.key];
    });

    return executionScope;
}

