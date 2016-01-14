app.filter('bytes', function() {
    return function(bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
    }
});

app.filter('percentMetric', function() {
    return function(uft) {
        return (uft.total == 0) ? 0 : ((uft.used / uft.total) * 100);
    }
});

app.filter('temperature', function() {
    return function(temperature) {
        return (isNaN(temperature)) ? '-' : temperature;
    }
});

app.filter('loadMetric', function() {
    return function(load) {
        return (isNaN(load[0])) ? '-' : load[0];
    }
});

app.filter('externalIp', function($location) {
    return function(url) {
        var external_ip = $location.host();
        var result = url.replace('{{external_ip}}', external_ip);

        return  result;
    }
});

/**
 * Truncate Filter
 * @Param text
 * @Param length, default is 10
 * @Param end, default is "..."
 * @return string
 */
app.filter('truncate', function () {
    return function (text, length, end) {
        if (isNaN(length))
            length = 10;

        if (end === undefined)
            end = "...";

        if (!text) {
            return "";
        } else  if (text.length <= length || text.length - end.length <= length) {
            return text;
        } else {
            return String(text).substring(0, length-end.length) + end;
        }

    };
});

