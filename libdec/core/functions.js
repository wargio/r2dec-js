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
    var Utils = require('libdec/core/utils');

    var _compare = function(a, b) {
        if (a.eq(b.offset)) {
            return 0;
        } else if (a.lt(b.offset)) {
            return 1;
        }
        return -1;
    };

    /*
     * Expects the aflj json as input.
     */
    var Functions = function(aflj) {
        this.data = aflj.sort(function(a, b) {
            return a.offset.lt(b.offset) ? -1 : (a.offset.eq(b.offset) ? 0 : 1);
        }).map(function(x) {
            return {
                offset: x.offset,
                name: x.name,
                calltype: x.calltype,
                nargs: x.nargs
            };
        });

        this.search = function(offset) {
            return offset ? Utils.search(offset, this.data, _compare) : null;
        };
    };
    return Functions;
})();