(function() {
    var __colors = {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        gray: [90, 39],
    };
    var Color = function(name) {
        if (!__colors[name]) {
            throw new Error('Invalid name: ' + name);
        }
        var fn = function(x) {
            var o = arguments.callee;
            return o.open + x + o.close;
        };
        fn.open = '\u001b[' + __colors[name][0] + 'm';
        fn.close = '\u001b[' + __colors[name][1] + 'm';
        return fn;
    };
    module.exports = Color;
    module.exports.make = function(theme) {
        var g = {}
        for (var key in theme) {
            g[key] = new Color(theme[key]);
        }
        return g;
    };
})();