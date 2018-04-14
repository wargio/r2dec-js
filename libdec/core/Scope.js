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
    var cfg = require('libdec/config');
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
        this.printableHeader = function(printable, spacesize, ident) {
            if (this.header) {
                printable.appendSpacedPipe(spacesize);
                printable.append(ident);
                printable.appendPrintable(this.header.printable(spacesize));
                // printable.appendComment(this.toString()); // debug only
                printable.appendEndline();
            }
        };
        this.printableTrailer = function(printable, spacesize, ident) {
            if (this.trailer) {
                printable.appendSpacedPipe(spacesize);
                printable.append(ident);
                printable.appendPrintable(this.trailer.printable(spacesize));
                // printable.appendComment(this.toString()); // debug only
                printable.appendEndline();
            }
        };
        this.printHeader = function(printable, ident, options) {
            if (this.header) {
                p(ident + this.header.toString(options).trim());
            }
        };
        this.printTrailer = function(p, ident, options) {
            if (this.trailer) {
                p(ident + this.trailer.toString(options).trim());
            }
        };
        this.toString = function() {
            return ' // uid: ' + this.uid + '; level: ' + this.level;
        };
    };
    return Scope;
})();