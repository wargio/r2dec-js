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
    return {
        search: function(value, array, compare) {
            var left = 0;
            var right = array.length - 1;
            var position = 0;
            var element = null;
            while (left <= right) {
                position = Math.floor((left + right) / 2);
                element = array[position];
                var cmp = compare(value, element);
                if (cmp < 0) {
                    left = position + 1;
                } else if (cmp > 0) {
                    right = position - 1;
                } else {
                    return element;
                }
            }
            return null;
        },
        indexOf: function(value, array, compare) {
            var left = 0;
            var right = array.length - 1;
            var position = 0;
            var element = null;
            while (left <= right) {
                position = Math.floor((left + right) / 2);
                element = array[position];
                var cmp = compare(value, element);
                if (cmp < 0) {
                    left = position + 1;
                } else if (cmp > 0) {
                    right = position - 1;
                } else {
                    return position;
                }
            }
            return -1;
        }
    };
})();