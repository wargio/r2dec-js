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

    /*
     * defines the scope type of the block;
     */
    var Scope2 = function() {
        this.header = null;
        this.identht = '';
        this.ident = cfg.ident;
        this.scoped = 0;
        this.printHeader = function(p) {
            if (this.header) {
                p(this.identht + this.header);
            }
        };
        this.increaseIdent = function() {
            this.ident += cfg.ident;
            this.identht += cfg.ident;
            this.scoped++;
        };
    };
    Scope2.generate = function(value, ident) {
        var s = new Scope2();
        s.value = value;
        s.ident = ident;
        return s;
    };
    return Scope2;
})();