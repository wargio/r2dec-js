var include = function(x) {
    return ___internal_load(x);
};
var require = function(x) {
    try {
        if (arguments.callee.loaded[x]) {
            return arguments.callee.loaded[x];
        }
        var module = {
            exports: null
        };
        var src = ___internal_require(x);
        eval(src);
        arguments.callee.src[x] = src.split('\n');
        arguments.callee.loaded[x] = module.exports;
        return module.exports;
    } catch (ee) {
        console.log('Exception from ' + x);
        console.log(ee.stack);
    }
};
require.loaded = {};
require.src = {};