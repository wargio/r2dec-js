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
    const Extra = require('libdec/core/extra');
    const Anno = require('libdec/annotation');

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
        NO: [' !overflow ', ' overflow '],
        INSTANCEOF: [' instanceof ', null],
    };

    return {
        inf: function() {
            this.toString = function() {
                return Global.printer.theme.integers('1');
            };
        },
        convert: function(a, b, cond, invert) {
            this.invert = invert;
            this.condition = cond; // ? _cmps[cond][invert ? 1 : 0] : '';
            this.a = a;
            this.b = b || '';
            /* main method */
            this.toString = function() {
                var a = Extra.is.string(this.a) ? Global.printer.auto(this.a) : this.a;
                var b = Extra.is.string(this.b) ? Global.printer.auto(this.b) : this.b;
                if (this.invert && _cmps[this.condition][1]) {
                    return a + _cmps[this.condition][1] + b;
                } else if (this.invert) {
                    return '!(' + a + Global.printer.theme.flow(_cmps[this.condition][0]) + b + ')';
                }
                return a + _cmps[this.condition][0] + b;
            };
            this.toAnnotation = function(location) {
                return Anno.auto(this.toString(), location);
            };
        },
    };
});