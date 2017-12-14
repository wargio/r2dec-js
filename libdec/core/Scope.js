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
    var Scope = function() {
        this.header = '{';
        this.trailer = '}';
        this.value = '';
        this.key = /#/;
        this.scope = [];

        this.print = function(p, ident) {
            p(ident + _replace(this, this.header));
            for (var i = 0; i < this.scope.length; i++) {
                this.scope[i].print(p, ident + cfg.ident);
            }
            p(ident + _replace(this, this.trailer));
        };
    };
    Scope.generate = function(key, value, header, trailer) {
        var s = new Scope();
        s.key = key;
        s.value = value;
        s.header = header;
        s.trailer = trailer;
        return s;
    }
    return Scope;
})();