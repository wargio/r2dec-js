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
    /*
     * Expects the izj json as input.
     */
    var Strings = function (izj) {
        this.data = izj.sort(function (a, b) {
            return a.vaddr.lte(b.vaddr) ? -1 : 1;
        }).map(function (x) {
            return {
                loc: x.vaddr,
                value: Buffer.from(x.string, 'base64').toString()
            };
        });

        this.search = function (address) {
            var left = 0;
            var right = this.data.length - 1;
            var position = 0;
            var element = null;
            while (left <= right) {
                position = Math.floor((left + right) / 2);
                element = this.data[position];
                if (element.loc.lt(address)) {
                    left = position + 1;
                } else if (element.loc.gt(address)) {
                    right = position - 1;
                } else {
                    return element;
                }
            }
            return null;
        };
    };
    return Strings;
})();
