var Container = {
    errors: require('./errors'),

    Configuration: require('./configuration'),
    Firmware: require('./mods/firmware'),
    Health: require('./mods/health'),
    Library: require('./mods/library'),
    Metrics: require('./mods/metrics')
};

module.exports = Container;