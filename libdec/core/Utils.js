/* 
 * Copyright (C) 2017 deroad
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
    var _default_cmp = function(a, b) {
        return a - b;
    }

    var _slow = function(a, b, cmp) {
        for (var i = 0; i < b.length; i++) {
            if (cmp(a, b[i]) == 0) return i;
        }
        return -1;
    }

    return {
        indexOf: function(value, array, compare) {
            if (!compare) {
                compare = _default_cmp;
            }
            return _slow(value, array, compare);
            /* FIXME: bin search doesn't work for reasons.. */
            var m = 0;
            var n = array.length - 1;
            while (m <= n) {
                var k = (n + m) >>> 1;
                var cmp = compare(value, array[k]);
                if (cmp > 0) {
                    m = k + 1;
                } else if (cmp < 0) {
                    n = k - 1;
                } else {
                    return k;
                }
            }
            return -1;
        },
        search: function(value, array, compare) {
            var pos = this.indexOf(value, array, compare);
            return pos >= 0 ? array[pos] : null;
        }
    };
})();