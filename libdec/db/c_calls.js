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
    var cfg = require('../config');

    var _colorize = function(input, color) {
        if (!color) return input;
        return color.colorize(input);
    }

    var _colorize_call = function(input, color) {
        if (!color) return input;
        return color.callname(input);
    }

    var _colorize_define = function(input, color) {
        if (!color) return input;
        return color.text(input);
    }

    return {
        rotate_left: {
            macros: ['#include <stdint.h>', '#include <limits.h>'],
            fcn: function(bits) {
                this.bits = bits;
                this.name = 'rotate_left###';
                this.returns = 'uint###_t';
                this.args = 'uint###_t value, uint32_t count';
                this.data = [
                    cfg.ident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;\n',
                    cfg.ident + 'count &= mask;\n',
                    cfg.ident + 'return (value << count) | (value >> (-count & mask));\n',
                    '}\n'
                ];
                this.toString = function(options) {
                    var s = _colorize(this.returns.replace(/###/g, this.bits.toString()), options.color);
                    s += ' ' + _colorize_call(this.name.replace(/###/g, this.bits.toString()), options.color);
                    s += ' (' + _colorize(this.args.replace(/###/g, this.bits.toString()), options.color) + ') {\n';
                    for (var i = 0; i < this.data.length; i++) {
                        s += _colorize(this.data[i].replace(/###/g, this.bits.toString()), options.color);
                    }
                    return s;
                };
            }
        },
        rotate_right: {
            macros: ['#include <stdint.h>', '#include <limits.h>'],
            fcn: function(bits) {
                this.bits = bits;
                this.name = 'rotate_right###';
                this.returns = 'uint###_t';
                this.args = 'uint###_t value, uint32_t count';
                this.data = [
                    cfg.ident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;\n',
                    cfg.ident + 'count &= mask;\n',
                    cfg.ident + 'return (value >> count) | (value << (-count & mask));\n',
                    '}'
                ];
                this.toString = function(options) {
                    var s = _colorize(this.returns.replace(/###/g, this.bits.toString()), options.color);
                    s += ' ' + _colorize_call(this.name.replace(/###/g, this.bits.toString()), options.color);
                    s += ' (' + _colorize(this.args.replace(/###/g, this.bits.toString()), options.color) + ') {\n';
                    for (var i = 0; i < this.data.length; i++) {
                        s += _colorize(this.data[i].replace(/###/g, this.bits.toString()), options.color);
                    }
                    return s;
                };
            }
        },
        bit_mask: {
            macros: ['#include <limits.h>', '#define BIT_MASK(__TYPE__, __ONE_COUNT__) \\\n    ((__TYPE__) (-((__ONE_COUNT__) != 0))) \\\n    & (((__TYPE__) -1) >> ((sizeof(__TYPE__) * CHAR_BIT) - (__ONE_COUNT__)))'],
            fcn: null
        }
    };

})();