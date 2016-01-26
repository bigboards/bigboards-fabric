
module.exports = {
    get: getCluster
};

function getCluster(req, res) {
    res.status(200).json([{name: 'node-1'}]);
}

