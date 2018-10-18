
module.exports = (function() {
    const NOT_FOUND = -1;

    function Map() {
        this._keys = [];
        this._vals = [];

        Object.defineProperty(this, 'size', {
            get: function() {
                return this._keys.length;
            }
        });
    }

    // Array.protorype.indexOf uses strict equality === to compare objects. this implementation
    // mimic the same operation but with an ordinary equality ==.
    var _indexOf = function(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            var aitem = arr[i];

            if ((Object.getPrototypeOf(aitem) === Object.getPrototypeOf(item)) &&
                Object.keys(aitem).every(function(k) {
                    return aitem[k] === item[k];
                })) {
                return i;
            }
        }

        return NOT_FOUND;
    };

    /**
     * Test whether map holds a certain key `k` or not.
     * @param {*} k Key to test
     * @returns {boolean} `true` iff map has a key that equals to `k`, `false` otherwise
     */
    Map.prototype.has = function(k) {
        return _indexOf(this._keys, k) !== NOT_FOUND;
    };

    /**
     * Get the value stored for key `k`.
     * @param {*} k Key to use
     * @returns {*} Value stored for key `k`, or `undefined` if map has no key `k`
     */
    Map.prototype.get = function(k) {
        return this._vals[_indexOf(this._keys, k)];
    };

    /**
     * Bind key `k` to a value `v`. If `k` already exists in map, its value will be
     * replaced by the newly specified one.
     * @param {*} k Key to bind
     * @param {*} v Value to bind to
     */
    Map.prototype.set = function(k, v) {
        var i = _indexOf(this._keys, k);

        if (i === NOT_FOUND) {
            this._keys.push(k);
            this._vals.push(v);
        } else {
            this._vals[i] = v;
        }
    };

    return Map;
})();