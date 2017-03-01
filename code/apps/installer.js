var Singularity = require('../singularity'),
    Expression = require('../utils/expression-utils'),
    ConsulCatalog = require('../store/catalog'),
    ConsulKV = require('../store/kv'),
    log4js = require('log4js');

var logger = log4js.getLogger("app-installer");

module.exports = {
    install: installApp
};

/**
 * Example Definition:
 * {
 *      "namespace": "bigboards",
 *      "name": "test",
 *      "tag": "master",
 *      "services": [
 *         {
 *           "name": "Jupyter",
 *           "jobs": [
 *              {
 *                  "name": "jupyter-daemon",
 *                  "placementExpression": "",
 *                  "image": {
 *                      "namespace": "singularityhub",
 *                      "name": "jupyter",
 *                      "tag": "master"
 *                  },
 *                  "command": "/bin/bash"
 *              }
 *           ]
 *         }
 *      ]
 * }
 * @param definition
 */
function installApp(definition) {
    return _downloadImages(definition)
        .then(function() {
            // -- get the list of current nodes to determine where to put the information
            return ConsulCatalog.nodes();
        }).then(function(nodes) {
            // -- once the images have been downloaded, we need to determine which images will receive which jobs. Therefor
            // -- each placement expression has to be evaluated.
            definition.services.forEach(function(service) {
                service.jobs.forEach(function(job) {
                    // -- update the job description
                    job.nodes = {};

                    Expression.evaluate(job.placement.expression, nodes).forEach(function(nodeId) {
                        job.nodes[nodeId] = { status: "ABSENT", expected: "PRESENT", pid: -1, msg: "" };
                    });
                });
            });

            // -- generate the startup and shutdown plans
            definition.plans.startup = generateStartupPlan(definition);
            definition.plans.shutdown = generateShutdownPlan(definition);

            // -- write the app to consul
            return ConsulKV.set("/bigboards/apps/" + definition.namespace + "." + definition.image, definition);
        });
}

function _downloadImages(definition) {
    // -- run through all the service jobs and create a list of all the images we should have available locally
    var images = [];
    definition.services.forEach(function(service) {
        service.jobs.forEach(function(job) {
            if (images.indexOf(job.image) == -1) {
                logger.info("Discovered image " + JSON.stringify(job.image) + " in the app definition");
                images.push(job.image);
            }
        });
    });

    // -- iterate over all the images and download them
    var promises = [];
    images.forEach(function(image) {
        promises.push(Singularity.images.download(image.namespace, image.name, image.tag));
    });

    // -- download the images
    return Q.all(promises);
}

function generateStartupPlan(definition) {
    var startupPlan = [];

    definition.startup.forEach(function(startupStep) {
        var service = definition.services[startupStep.service];
        if (! service) throw new Error("Invalid service '" + startupStep.service + "' referenced in the startup plan");

        var job = service.jobs[startupStep.job];
        if (! job) throw new Error("Invalid job '" + startupStep.job + "' referenced in the startup plan");

        startupStep.nodes = job.nodes;

        startupPlan.push(startupStep);
    });

    return startupPlan;
}

function generateShutdownPlan(definition) {
    var shutdownPlan = [];

    definition.shutdown.forEach(function(shutdownStep) {
        var service = definition.services[shutdownStep.service];
        if (! service) throw new Error("Invalid service '" + shutdownStep.service + "' referenced in the shutdown plan");

        var job = service.jobs[shutdownStep.job];
        if (! job) throw new Error("Invalid job '" + shutdownStep.job + "' referenced in the shutdown plan");

        shutdownStep.nodes = job.nodes;

        shutdownPlan.push(shutdownStep);
    });

    return shutdownPlan;
}