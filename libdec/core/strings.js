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

(function() {
    var r2pipe = require('libdec/r2pipe');
    var Utils = require('libdec/core/utils');

    var _compare = function(a, b) {
        if (a.eq(b.location)) {
            return 0;
        } else if (a.lt(b.location)) {
            return 1;
        }
        return -1;
    };

    var _str_compare_location = function(a, b) {
        return a.location.lt(b.location) ? -1 : (a.location.eq(b.location) ? 0 : 1);
    };

    var _sanitize = function(x) {
        return x.paddr || x.vaddr || x.offset;
    };

    /*
     * Expects the izj json as input.
     */
    return function(izj) {
        this.data = izj.filter(_sanitize).map(function(x) {
            return {
                location: Global.evars.honor.paddr ? x.paddr : x.vaddr || x.offset,
                value: (new TextDecoder().decode(Duktape.dec('base64', x.string || x.name))).replace(/\\\\/g, '\\')
            };
        }).sort(_str_compare_location);
        this.search = function(address) {
            if (address) {
                if (!Global.evars.extra.slow) {
                    var x = r2pipe.string('Cs. @ 0x' + address.toString(16));
                    if (x) {
                        x = x.substr(1);
                        return x.substr(0, x.length - 1);
                    }
                }
                var r = Utils.search(address, this.data, _compare);
                return r ? r.value : null;
            }
            return null;
        };
    };
});