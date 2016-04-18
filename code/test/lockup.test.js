var Docker = require('dockerode');

var docker = new Docker();

docker.listContainers(function (err, res) {
    if (err) {
        // - put a breakpoint on the next line
        console.log(err);
    } else {
        // - put a breakpoint on the next line
        console.log(res);
    }
});

setTimeout(function() {
    console.log("application completed");
}, 2000);