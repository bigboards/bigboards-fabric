var Q = require('q'),
    ConsulSession = require('../store/session'),
    ConsulAgent = require('../store/agent'),
    ConsulKv = require('../store/kv'),
    ps = require('ps-node'),
    log4js = require('log4js');

var logger = log4js.getLogger('local');
var tickerLog = log4js.getLogger('ticker');

var fabricSessionId = null;
var ticker = null;

module.exports = {
    run: run
};

function run() {
    return ConsulAgent.identity()
        .then(function(identity) {
            return ConsulSession.create("bigboards-fabric", "delete")
                .then(function(sessionId) {
                    logger.trace('Start ticking');

                    ticker = setInterval(function() {
                        session.renew(fabricSessionId).then(function() {
                            tickerLog.trace("Renewed the fabric session");
                        }, function (error) {
                            tickerLog.warn("Unable to renew the fabric session: " + error);
                        });
                    }, 15 * 1000);

                    logger.info('created the fabric session with id ' + sessionId);
                }).then(function() {
                    // -- running through services
                    logger.info("looking at which services are currently running");
                });
        }).fail(function(error) {
            logger.error('Fabric session creation failed!');
            logger.error(error);
        });
}

function jobsForNode(nodeId) {
    return ConsulKv.get.prefix("/bigboards/apps/").then(function(apps) {
        var result = [];

        if (apps) {
            apps.forEach(function(app) {
                for (var serviceId in app.services) {
                    if (! app.services.hasOwnProperty(serviceId)) continue;

                    for (var jobId in app.services[serviceId].jobs) {
                        if (! app.services[serviceId].jobs.hasOwnProperty(jobId)) continue;

                        var job = app.services[serviceId].jobs[jobId];
                        if (job.nodes[nodeId]) result.push(job);
                    }
                }
            });
        }

        return result;
    });

}

function sync(nodeId) {
    return jobsForNode(nodeId)
        .then(function(jobs) {
            jobs.forEach(function(job) {

            });
        });
}

function syncJob(job) {
    var shouldBeInstalled = (job.expected == "PRESENT" || job.expected == "STARTED" || job.expected == "STOPPED");
    var pidIsRunning = _isJobRunning(job);

    if (job.expected == "PRESENT") {

    } else if (job.expected == "ABSENT") {

    } else if (job.expected == "STARTED") {

    } else if (job.expected == "STOPPED") {

    }
}

function _isJobInstalled(job) {

}

function _isJobRunning(job) {
    var defer = Q.defer();

    if (job.pid == -1) defer.resolve(false);
    else {
        ps.lookup({pid: job.pid}, function(err, psData) {
            if (err) defer.reject(err);

            if (psData.command.indexOf("singularity/sexec") != -1 && psData.args == job.command) {
                defer.resolve(true);
            } else {
                return false;
            }
        });
    }

    return defer.promise;
}