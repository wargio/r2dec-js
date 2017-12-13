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


module.exports = (function () {
    var List = function (d) {
        this.data = d;
        this.used = false;
        this.next = null;
    };

    return function (blocks) {
        var array = blocks.map(function (b) {
            return new List(b);
        });
        var list = array[0];
        var current = list;
        for (var i = 1; i < array.length; i++) {
            if (current.data.fail && current.data.fail.eq(array[i].data.loc)) {
                current.next = array[i];
                current = array[i];
                continue;
            } else if (current.data.jump && current.data.jump.eq(array[i].data.loc)) {
                current.next = array[i];
                current = array[i];
                continue;
            } else {
                break;
            }
        }
        return list;
    };
})();