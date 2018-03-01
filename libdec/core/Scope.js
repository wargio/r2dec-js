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
    var cfg = require('../config');
    var uniq_counter = 0;

    var _colorize = function(input, color) {
        if (!color) return input;
        return color.colorize(input);
    }

    /*
     * defines the scope type of the block;
     */
    var Scope = function(lvl) {
        this.header = null;
        this.trailer = null;
        this.level = lvl || 0;
        this.uid = uniq_counter++;
        this.printHeader = function(p, ident, options) {
            if (this.header) {
                p(ident + _colorize(this.header, options.color));
            }
        };
        this.printTrailer = function(p, ident, options) {
            if (this.trailer) {
                p(ident + _colorize(this.trailer, options.color));
            }
        };
        this.toString = function() {
            return this.uid + ' ' + this.level + ' ' + this.header + ' ' + this.trailer;
        };
    };
    return Scope;
})();