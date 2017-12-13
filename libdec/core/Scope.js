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
     * defines the scope type of the block;
     */
    var Scope = function () {
        this.header = '{';
        this.trailer = '}';
        this.value = null;
        this.key = null;

        this.gen = function () {
            return {
                header: this.key ? this.header.replace(this.key, this.value) : this.header,
                trailer: this.key ? this.trailer.replace(this.key, this.value) : this.trailer
            };
        };
    };
    return Scope;
})();