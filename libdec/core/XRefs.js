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
    Utils = require('./Utils');

    var _compare = function(a, b) {
        if (a.eq(b.loc)) {
            return 0;
        } else if (a.lt(b.loc)) {
            return 1;
        }
        return -1;
    }

    /*
     * Expects the isj json as input.
     */
    var XRefs = function(isj) {
        this.data = isj.sort(function(a, b) {
            return a.vaddr.lte(b.vaddr) ? -1 : 1;
        }).map(function(x) {
            var name = x.name.indexOf('imp.') === 0 ? x.name.replace(/imp\./, '') : x.name;
            return {
                loc: x.vaddr,
                type: x.type,
                value: name
            };
        });

        this.search = function(address) {
            return Utils.search(address, this.data, _compare);
        };
    };
    return XRefs;
})();