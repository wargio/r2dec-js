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
    var base64 = require('libdec/base64');
    var Utils = require('libdec/core/Utils');

    var _compare = function(a, b) {
        if (a.eq(b.loc)) {
            return 0;
        } else if (a.lt(b.loc)) {
            return 1;
        }
        return -1;
    }

    /*
     * Expects the izj json as input.
     */
    var Strings = function(izj) {
        this.data = izj.sort(function(a, b) {
            return a.vaddr.lt(b.vaddr) ? -1 : (a.vaddr.eq(b.vaddr) ? 0 : 1);
        }).map(function(x) {
            return {
                loc: x.vaddr,
                value: base64.atob(x.string).replace(/\\\\/g, '\\')
            };
        });

        this.search = function(address) {
            return Utils.search(address, this.data, _compare);
        };
    };
    return Strings;
})();