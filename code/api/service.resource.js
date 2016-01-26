
module.exports = {
    list: listServices,
    get: getService
};

function listServices(req, res) {
    res.status(200).json([{name: 'node-1'}]);
}

function getService(req, res) {
    res.status(200).json([{name: 'node-1'}]);
}

