
module.exports = (function() {
    const NOT_FOUND = -1;

    function Map() {
        this._keys = [];
        this._vals = [];

        Object.defineProperty(this, 'size', { get() { return this._keys.length; }});
    }

    Map.prototype.has = function(k) {
        return this._keys.indexOf(k) !== NOT_FOUND;
    };

    Map.prototype.get = function(k) {
        return this._vals[this._keys.indexOf(k)];
    };

    Map.prototype.set = function(k, v) {
        var i = this._keys.indexOf(k);

        if (i === NOT_FOUND) {
            this._keys.push(k);
            this._vals.push(v);
        } else {
            this._vals[i] = v;
        }
    };

    return Map;
})();