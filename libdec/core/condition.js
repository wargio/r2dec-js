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

module.exports = (function() {
    var Extra = require('libdec/core/extra');

    const _cmps = {
        CUST: ['', ''],
        INF: ['1', '0'],
        EQ: [' == ', ' != '],
        NE: [' != ', ' == '],
        LT: [' < ', ' >= '],
        LE: [' <= ', ' > '],
        GT: [' > ', ' <= '],
        GE: [' >= ', ' < '],
        LO: [' overflow ', ' !overflow '],
    };

    return {
        inf: function() {
            this.toString = function() {
                return Global.printer.theme.integers('1');
            };
        },
        convert: function(a, b, cond, invert) {
            this.condition = cond ? _cmps[cond][invert ? 1 : 0] : '';
            this.a = a;
            this.b = b || '';
            this.toString = function() {
                var a = Extra.is.string(this.a) ? Global.printer.auto(this.a) : this.a;
                var b = Extra.is.string(this.b) ? Global.printer.auto(this.b) : this.b;
                return a + this.condition + b;
            };
        },
    };
})();