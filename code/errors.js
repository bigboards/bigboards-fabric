function NotFoundError(message) {
    this.name = "NotFoundError";
    this.message = message;
    this.stack = Error().stack;
}
NotFoundError.prototype = Object.create(Error.prototype);
module.exports.NotFoundError = NotFoundError;

function IllegalParameterError(message) {
    this.name = "IllegalParameterError";
    this.message = message;
    this.stack = Error().stack;
}
IllegalParameterError.prototype = Object.create(Error.prototype);
module.exports.IllegalParameterError = IllegalParameterError;

function TasksRunnerBusyError(message) {
    this.name = "TasksRunnerBusyError";
    this.message = message;
    this.stack = Error().stack;
}
TasksRunnerBusyError.prototype = Object.create(Error.prototype);
module.exports.TasksRunnerBusyError = TasksRunnerBusyError;

function TaskAlreadyStartedError(message) {
    this.name = "TaskAlreadyStartedError";
    this.message = message;
    this.stack = Error().stack;
}
TaskAlreadyStartedError.prototype = Object.create(Error.prototype);
module.exports.TaskAlreadyStartedError = TaskAlreadyStartedError;

function TaskParameterError(message) {
    this.name = "TaskParameterError";
    this.message = message;
    this.stack = Error().stack;
}
TaskParameterError.prototype = Object.create(Error.prototype);
module.exports.TaskParameterError = TaskParameterError;

function TintInstallationError(message) {
    this.name = "TintInstallationError";
    this.message = message;
    this.stack = Error().stack;
}
TintInstallationError.prototype = Object.create(Error.prototype);
module.exports.TintInstallationError = TintInstallationError;