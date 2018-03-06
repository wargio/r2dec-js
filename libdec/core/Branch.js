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

module.exports = (function() {
    var _is_str = function(s) {
        return typeof s == 'string';
    };

    var _condition = function(a, b, compare, base) {
        this.a = _is_str(a) ? new base.common(a) : a;
        this.b = _is_str(b) ? new base.common(b) : b;
        this.compare = compare;
        this.toString = function(options) {
            return '(' + this.a.toString(options) + (this.compare ? (this.compare + this.b.toString(options)) : '') + ')';
        };
    };

    return {
        TYPE_INF: ['1', '0'],
        TYPE_EQ: [' == ', ' != '],
        TYPE_NE: [' != ', ' == '],
        TYPE_LT: [' < ', ' >= '],
        TYPE_LE: [' <= ', ' > '],
        TYPE_GT: [' > ', ' <= '],
        TYPE_GE: [' >= ', ' < '],
        FLOW_DEFAULT: 0,
        FLOW_INVERTED: 1,
        generate: function(a, b, type, as, base) {
            if (type == 'INF') {
                return new _condition(this.TYPE_INF[as], null, null, base);
            }
            return new _condition(a, b, this['TYPE_' + type][as], base);
        },
        true: function(base) {
            return new _condition(this.TYPE_INF[this.FLOW_DEFAULT], null, null, base);
        },
        false: function(base) {
            return new _condition(this.TYPE_INF[this.FLOW_INVERTED], null, null, base);
        }
    };
})();