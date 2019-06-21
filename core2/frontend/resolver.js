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

module.exports = (function() {

    /**
     * Resolving helper for xreferences in decompiled function.
     * @param {*} afij JSON object representing output of 'afij' r2 command
     * @constructor
     */
    function Resolver(afij) {
        var call_xrefs = {};

        // cache information for functions called in the scope of decompilation
        (afij.callrefs || []).forEach(function(cref) {
            if ((cref.type === 'CALL') && !(cref.addr in call_xrefs)) {
                var afcfj = Global.r2cmdj('afcfj', '@', cref.addr);

                // input is undefined on indirect calls
                if (afcfj) {
                    var fname = afcfj.pop().name;

                    // strip 'sym.' prefix
                    if (fname.startsWith('sym.')) {
                        fname = fname.substring('sym.'.length);
                    }

                    // strip 'imp.' prefix
                    if (fname.startsWith('imp.')) {
                        fname = fname.substring('imp.'.length);
                    }

                    call_xrefs[cref.addr] = fname;
                }
            }
        });

        var data_xrefs = {};

        // cache information for data referred in the scope of decompilation
        (afij.datarefs || []).forEach(function(dref) {
            if (!(dref in call_xrefs)) {
                data_xrefs[dref] = JSON.stringify(Global.r2cmdj('Cs.', '@', dref));
            }
        });

        this.xref = {
            'data'   : data_xrefs,
            'fcalls' : call_xrefs
        };
    }

    /**
     * Resolve a callee function name
     * @param {Expr.Val} val Value expression of callee target address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_fname = function(val) {
        return this.xref.fcalls[val.value];
    };

    /**
     * Resolve a data reference
     * @param {Expr.Val} val Value expression of data address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_data = function(val) {
        return this.xref.data[val.value];
    };

    return Resolver;
})();