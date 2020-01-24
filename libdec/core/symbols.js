/* 
 * Copyright (C) 2018 deroad
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

(function() { // lgtm [js/useless-expression]
    const Long = require('libdec/long');
    const r2pipe = require('libdec/r2pipe');
    const Utils = require('libdec/core/utils');

    var _compare = function(a, b) {
        if (a.eq(b.location)) {
            return 0;
        } else if (a.lt(b.location)) {
            return 1;
        }
        return -1;
    };

    var _virtual_compare = function(a, b) {
        return a.vaddr.lt(b.vaddr) ? -1 : (a.vaddr.eq(b.vaddr) ? 0 : 1);
    };

    var _physical_compare = function(a, b) {
        return a.paddr.lt(b.paddr) ? -1 : (a.paddr.eq(b.paddr) ? 0 : 1);
    };

    var _sanitize = function(x) {
        return x.paddr || x.vaddr;
    };

    /*
     * Expects the isj json as input.
     */
    return function(isj) {
        this.data = isj.filter(_sanitize).sort(Global.evars.honor.paddr ? _physical_compare : _virtual_compare).map(function(x) {
            return {
                location: Global.evars.honor.paddr ? x.paddr : x.vaddr,
                value: (x.demname && x.demname.length > 0) ? x.demname : x.name,
            };
        });
        this.search = function(address) {
            if (address) {
                if (!Global.evars.extra.slow) {
                    var def = {
                        symbols: {}
                    };
                    var x = r2pipe.json64('is.j @ 0x' + address.toString(16), def).symbols;
                    var loc = (Global.evars.honor.paddr ? x.paddr : x.vaddr) || Long.MAX_UNSIGNED_VALUE;
                    return address.eq(loc) && !Long.MAX_UNSIGNED_VALUE.eq(loc) ? ((x.demname && x.demname.length > 0) ? x.demname : x.name) : null;
                }
                var r = Utils.search(address, this.data, _compare);
                return r ? r.value : null;
            }
            return null;
        };
    };
});