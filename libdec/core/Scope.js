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


    _replace = function(scope, s) {
        return s.replace(scope.key, scope.value);
    };

    /*
     * defines the scope type of the block;
     */
    var Scope = function(loc) {
        this.loc = loc
        this.header = '{';
        this.trailer = '}';
        this.value = '';
        this.key = /#/;
        this.ident = cfg.ident;
        this.delimident = '';

        this.defined = function() {
            return (this.header || this.trailer) != null;
        }
        this.printHeader = function(p) {
            if (this.header) {
                p(this.delimident + _replace(this, this.header));
            }
        };
        this.printTrailer = function(p) {
            if (this.trailer) {
                p(this.delimident + _replace(this, this.trailer));
            }
        };
        this.increaseIdent = function() {
            this.ident += cfg.ident;
            this.delimident += cfg.ident;
        };
    };
    Scope.empty = function(loc) {
        var s = new Scope(loc);
        s.header = null;
        s.trailer = null;
        return s;
    };
    Scope.generate = function(loc, ident, value, header, trailer) {
        var s = new Scope(loc);
        s.value = value;
        s.header = header;
        s.trailer = trailer;
        s.ident = ident;
        s.delimident = s.ident.substr(cfg.ident.length, s.ident.length);
        return s;
    };
    return Scope;
})();