/** 
 * Copyright (C) 2019 elicn
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

(function() {

    var _r2_get_fname = function(addr) {
        return Global.r2cmd('afn', '@', addr);
    };

    var _r2_get_flag = function(addr) {
        var fij = Global.r2cmdj('fij', '1', '@', addr);
        var flag = undefined;

        if ((fij instanceof Array) && (fij.length > 0)) {
            flag = fij.pop().name;
        }

        return flag;
    };

    var _r2_get_string = function(addr) {
        return Global.r2cmd('Cs.', '@', addr);
    };

    var _r2_get_libs_names = function() {
        var ilj = Global.r2cmdj('ilj');

        // for some reason r2 does not keep the name in its original case
        // so we have to canonicalize it for later
        return ilj.map(function(lname) {
            return lname.toLowerCase() + '_';
        });
    };

    /**
     * Resolving helper for xreferences in decompiled function.
     * @constructor
     */
    function Resolver() {
        // prefixes that should be trimmed
        this.prefixes = ['sym.', 'imp.'].concat(_r2_get_libs_names());

        // functions names cache
        this.fcalls = {};

        // strings cache
        this.data = {};

/*
        // prefetch all data and call references from function
        var axffj = Global.r2cmdj('axffj') || [];

        axffj.forEach(function(xref) {
            var key = xref.ref;
            var val = xref.name;

            if (xref.type === 'CALL') {
                this.fcalls[key] = this.demangle(val);
            }

            else if (xref.type === 'DATA') {
                val = _r2_get_string(val);

                this.data[key] = this.demangle(val);
            }
        }, this);
*/
    }

    Resolver.prototype.demangle = function(name) {
        var trimmed = name;

        if (trimmed) {
            this.prefixes.forEach(function(pref) {
                if (trimmed.toLowerCase().startsWith(pref)) {
                    trimmed = trimmed.substring(pref.length);
                }
            });
        }

        return trimmed;
    };

    /**
     * Resolve a callee function name
     * @param {Expr.Val} val Value expression of callee target address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_fname = function(val) {
        var key = val.value.toString();

        // if not cached, retrieve it from r2
        if (!(key in this.fcalls)) {
            this.fcalls[key] = this.demangle(_r2_get_fname(key) || _r2_get_flag(key));
        }

        return this.fcalls[key];
    };

    /**
     * Resolve a data reference
     * @param {Expr.Val} val Value expression of data address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_data = function(val, resolve_flags) {
        var key = val.value.toString();

        // if not cached, retrieve it from r2
        if (!(key in this.data)) {
            this.data[key] = this.demangle(_r2_get_string(key) || (resolve_flags && _r2_get_flag(key)));
        }

        return this.data[key];
    };

    return Resolver;
});