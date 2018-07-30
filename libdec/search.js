/* 
 * Copyright (C) 2017-2018 deroad
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

    return {
        indexOf: function(value, array, compare) {
            if (!compare) {
                compare = _default_cmp;
            }
            var min = 0;
            var max = array.length - 1;
            var index;
            while (min <= max) {
                index = (min + max) >> 1;
                var cmp = compare(value, array[index]);
                if (cmp === 0) {
                    return index;
                } else {
                    if (cmp < 0) {
                        min = index + 1;
                    } else {
                        max = index - 1;
                    }
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