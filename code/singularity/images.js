var fs = require('../utils/fs-utils'),
    net = require('../utils/net-utils');

var imageDownloadLocation = "./data/images/original";
var appsLocation = "./data/images/apps";
var server = "http://localhost:8080";

module.exports = {
    instance: {
        create: createInstanceImage,
        exists: instanceImageExists,
        remove: removeInstanceImage
    },
    downloadIfNeeded: downloadImageIfNeeded,
    download: downloadImage,
    isLocal: isImageLocally,
    list: listImages
};

function instanceImageExists(instanceId) {
    return fs.exists(appsLocation + "/" + instanceId + "/image.img");
}

function createInstanceImage(namespace, imageName, tag, instanceId) {
    // -- check if the image has already been downloaded
    return downloadImageIfNeeded(namespace, imageName, tag)
        .then(function() {
            return fs.cp(
                imageDownloadLocation + "/" + namespace + "/" + imageName + ":" + tag + ".img",
                appsLocation + "/" + instanceId + "/image.img"
            );
        });
}

function removeInstanceImage(instanceId) {
    return fs.rm(appsLocation + "/" + instanceId + "/image.img");
}

function isImageLocally(namespace, imageName, tag) {
    return fs.exists(imageDownloadLocation + "/" + namespace + "/" + imageName + ":" + tag + ".img");
}

function downloadImageIfNeeded(namespace, imageName, tag) {
    if (! isImageLocally(namespace, imageName, tag)) {
        return downloadImage(namespace, imageName, tag);
    } else {
        return Q();
    }
}

function downloadImage(namespace, imageName, tag) {
    // -- make sure the image download location exists
    fs.mkdir(imageDownloadLocation);

    // -- download the image to the local image location
    return net
        .download(server + "/" + namespace + '/' + imageName + ":" + tag + ".img.gz", "/tmp/" + namespace + "." + imageName + "." + tag + ".img.gz")
        .then(function() {
            if (! exists(imageDownloadLocation + "/" + namespace))
                fs.mkdir(imageDownloadLocation + "/" + namespace);

            return fs.unzip("/tmp/" + namespace + "." + imageName + "." + tag + ".img.gz", imageDownloadLocation + "/" + namespace + "/" + imageName + ":" + tag + ".img")
        });
}

function listImages() {
    var result = [];

    var namespaces = fs.readDir(imageDownloadLocation + "/");

    if (namespaces) {
        namespaces.forEach(function (namespace) {
            var images = fs.readDir(imageDownloadLocation + "/" + namespace);
            if (images) {
                images.forEach(function (image) {
                    result.push({id: namespace + "/" + image, namespace: namespace, name: image})
                });
            }
        });
    }

    return results;
}