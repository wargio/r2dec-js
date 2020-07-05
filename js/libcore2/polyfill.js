/* 
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
    var _Object_fromEntries = function(entries) {
        var obj = {};

        entries.forEach(function(ent) {
            var key = ent[0];
            var val = ent[1];

            obj[key] = val;
        });

        return obj;
    };

    var _Array_fill = function(value, start, end) {
        if (start == undefined) {
            start = 0;
        } else if (start < 0) {
            start += this.length;
        }

        if (end === undefined) {
            end = this.length;
        } else if (end < 0) {
            end += this.length;
        }

        for (var i = start; (i < end) && (i < this.length); i++) {
            this[i] = value;
        }

        return this;
    };

    var _Array_findIndex = function(predicate) {
        for (var i = 0; i < this.length; i++) {
            if (predicate(this[i])) {
                return i;
            }
        }

        return (-1);
    };

    var _Array_find = function(predicate) {
        for (var i = 0; i < this.length; i++) {
            if (predicate(this[i])) {
                return this[i];
            }
        }

        return undefined;
    };

    var __pad = function(s, n, p) {
        p = p || ' ';

        var padlen = n - s.length;
        var padblk = p.repeat(padlen / p.length);
        var padrem = p.substr(0, padlen % p.length);

        return (padlen > 0 ? padblk + padrem : '');
    };

    var _String_padStart = function(n, p) {
        var s = this.toString();

        return __pad(s, n, p) + s;
    };

    var _String_padEnd = function(n, p) {
        var s = this.toString();

        return s + __pad(s, n, p);
    };

    var _String_trimStart = function() {
        var s = this.toString();

        return s.replace(/\s*/, '');
    };

    var _String_trimEnd = function() {
        var s = this.toString();

        return s.replace(/\s*$/, '');
    };

    // --------------------------------------------------

    var polyfills = [
        { proto: Object,           name: 'fromEntries', func: _Object_fromEntries },
        { proto: Array.prototype,  name: 'fill',        func: _Array_fill         },
        { proto: Array.prototype,  name: 'findIndex',   func: _Array_findIndex    },
        { proto: Array.prototype,  name: 'find',        func: _Array_find         },
        { proto: String.prototype, name: 'padStart',    func: _String_padStart    },
        { proto: String.prototype, name: 'padEnd',      func: _String_padEnd      },
        { proto: String.prototype, name: 'trimStart',   func: _String_trimStart   },
        { proto: String.prototype, name: 'trimEnd',     func: _String_trimEnd     }
    ];

    polyfills.forEach(function(pobj) {
        if (!(Object.hasOwnProperty(pobj.proto, pobj.name))) {
            Object.defineProperty(pobj.proto, pobj.name, { value: pobj.func, enumerable: false });
        }
    });

    return true;
});