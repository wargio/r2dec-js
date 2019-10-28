/* 
 * Copyright (C) 2018 elicn
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = (function() {
    /** @type {number} */
    const NOT_FOUND = -1;

    // an alternate implementation of Map, it differs from the standard JS Map in
    // multiple aspects:
    //
    // - it retrieves items in linear time
    // - keys are compared using the '==' equality semantics rather than the '===' strict equality
    // - keys(), values() and entries() do not return generators, rather they return arrays

    function Map(pairs) {
        this.clear();

        if (pairs) {
            pairs.forEach(function(p) {
                this.set(p[0], p[1]);
            }, this);
        }

        Object.defineProperty(this, 'size', {
            get: function() {
                return this._keys.length;
            }
        });
    }

    // test whether two objects are equal, by comparing all their enumerable members.
    // this comes to replace the strict equality operator === when locating objects
    // in an array.
    var _equal = function(item0, item1) {
        if (Object.getPrototypeOf(item0) === Object.getPrototypeOf(item1)) {
            var keys0 = Object.keys(item0);
            var keys1 = Object.keys(item1);

            if (keys0.length === keys1.length) {
                // check that each key in keys0 is mapped to the same value on both objects.
                // this is sufficient for a naive implementation:
                //
                // if a key 'k' in keys0 does not exist in keys1, then items1[k] === undefined
                // adding that keys0 and keys1 have the same number of elements, we know there
                // are no additional keys in keys1 that were not checked
                return keys0.every(function(k) {
                    // note: consider replacing this with a recursive call to _equal, for a full effect
                    return item0[k] === item1[k];
                });
            }
        }

        return false;
    };

    // Array.protorype.indexOf uses the strict equality operator === to compare objects.
    // this Map implementation uses the == equality semantics instead.
    var _indexOf = function(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (_equal(arr[i], item)) {
                return i;
            }
        }

        return NOT_FOUND;
    };

    var _zip = function(arrays) {
        return arrays[0].map(function(_, i) {
            return arrays.map(function(array) {
                return array[i];
            });
        });
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

        return this;
    };

    Map.prototype.delete = function(k) {
        var i = _indexOf(this._keys, k);

        if (i !== NOT_FOUND) {
            this._keys.splice(i, 1);
            this._vals.splice(i, 1);

            return true;
        }

        return false;
    };

    Map.prototype.clear = function() {
        this._keys = [];
        this._vals = [];
    };

    // note: Duktape does not support generators, so passing an array; note this is not a copy
    Map.prototype.keys = function() {
        return this._keys;
    };

    // note: Duktape does not support generators, so passing an array; note this is not a copy
    Map.prototype.values = function() {
        return this._vals;
    };

    Map.prototype.entries = function() {
        return _zip([this._keys, this._vals]);
    };

    return Map;
})();