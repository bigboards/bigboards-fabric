var kv = require('../store/kv'),
    uuid = require('node-uuid'),
    log4js = require('log4js'),
    shu = require('../utils/sh-utils');

var logger = log4js.getLogger('tasks');
var config = require('../config').lookupEnvironment();

module.exports = {

};

function listTasks() {
    return kv.list('tasks/');
}

/**
 * Invoke the task with the given code.
 *
 * @param taskCode      the unique code of the task
 * @param parameters    An object holding key/values for the parameters
 */
function invoke(taskCode, parameters) {
    // -- get the task
    var task = tasks[taskCode];
    if (! task) return Q.reject(new Error('Invalid task code'));

    var executionId = uuid.v4();
    logger.info('Invoking new task with code ' + taskCode + ' and execution id ' + executionId);

    var taskLogDir = config.dir.tasks + '/' + executionId;
    logger.debug('Creating a new execution log directory at ' + taskLogDir);
    shu.mkdir(taskLogDir, { sudo: config.sudo, flags: 'p' });

    logger.debug('Creating streams to the stderr and stdout files');
    var taskErrorStream = fs.createWriteStream(taskLogDir + '/stderr.log');
    var taskOutputStream = fs.createWriteStream(taskLogDir + '/stdout.log');





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
}
