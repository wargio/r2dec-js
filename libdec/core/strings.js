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

(function() { // lgtm [js/useless-expression]
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

    var r2flag_filter = function(x) {
        var ch = x.charAt(0);
        if ((ch >= 'a'.charAt(0) && ch <= 'z'.charAt(0)) || (ch >= 'A'.charAt(0) && ch <= 'Z'.charAt(0)) || (ch >= '0'.charAt(0) && ch <= '9'.charAt(0))) {
            return x;
        }
        switch (ch) {
            case '\\'.charAt(0):
            case ':'.charAt(0):
            case '.'.charAt(0):
            case '_'.charAt(0):
                return x;
        }
        return '_';
    };

    /*
     * Expects the Csj json as input.
     */
    return function(Csj) {
        this.data = Csj.filter(_sanitize).map(function(x) {
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
        this.search_by_flag = function(flag) {
            if (flag && flag.startsWith('str.')) {
                if (!Global.evars.extra.slow) {
                    var address = r2pipe.string('s @ ' + flag);
                    var x = r2pipe.string('Cs. @ ' + address.toString(16));
                    if (x) {
                        x = x.substr(1);
                        return x.substr(0, x.length - 1);
                    }
                }
                for (var i = 0; i < this.data.length; i++) {
                    var r2flag = 'str.' + this.data[i].value.split('').map(r2flag_filter).join('').trim();
                    r2flag = r2flag.replace(/\\[abnrtv]/g, '_').replace(/\\/g, '_');
                    r2flag = r2flag.replace(/^str._+/, 'str.');
                    r2flag = r2flag.replace(/_+$/, '');
                    if (r2flag == flag) {
                        return this.data[i].value;
                    }
                }
            }
            return null;
        };
    };
});