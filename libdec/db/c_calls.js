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
    var mident = '    ';
    var _unique_print = {
        rotate_left: [],
        rotate_right: [],
        bit_mask: false,
        swap_endian: [],
    };

    return {
        rotate_left: {
            macros: ['#include <stdint.h>', '#include <limits.h>'],
            fcn: function(bits) {
                this.bits = '' + bits;
                this.name = 'rotate_left###';
                this.returns = 'uint###_t';
                this.args = 'uint###_t value, uint32_t count';
                this.data = [
                    mident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;',
                    mident + 'count &= mask;',
                    mident + 'return (value << count) | (value >> (-count & mask));'
                ];
                this.print = function() {
                    if (_unique_print.rotate_left.indexOf(this.bits) >= 0) {
                        return;
                    }
                    _unique_print.rotate_left.push(this.bits);
                    var call = this.name.replace(/###/g, this.bits);
                    var type = this.returns.replace(/###/g, this.bits);
                    var args = this.args.replace(/###/g, this.bits);
                    var a = Global.printer.auto;
                    var h = Global.printer.html;
                    var t = Global.printer.theme;
                    console.log(Global.context.identfy() + t.types(type) + h(' ') + t.callname(call) + h(' (') + args + h(' ) {'));
                    for (var i = 0; i < this.data.length; i++) {
                        console.log(Global.context.identfy() + a(this.data[i].replace(/###/g, this.bits)));
                    }
                    console.log(Global.context.identfy() + h('}'));
                };
            }
        },
        rotate_right: {
            macros: ['#include <stdint.h>', '#include <limits.h>'],
            fcn: function(bits) {
                this.bits = '' + bits;
                this.name = 'rotate_right###';
                this.returns = 'uint###_t';
                this.args = 'uint###_t value, uint32_t count';
                this.data = [
                    mident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;',
                    mident + 'count &= mask;',
                    mident + 'return (value >> count) | (value << (-count & mask));'
                ];
                this.print = function() {
                    if (_unique_print.rotate_right.indexOf(this.bits) >= 0) {
                        return;
                    }
                    _unique_print.rotate_right.push(this.bits);
                    var call = this.name.replace(/###/g, this.bits);
                    var type = this.returns.replace(/###/g, this.bits);
                    var args = this.args.replace(/###/g, this.bits);
                    var a = Global.printer.auto;
                    var h = Global.printer.html;
                    var t = Global.printer.theme;
                    console.log(Global.context.identfy() + t.types(type) + h(' ') + t.callname(call) + h(' (') + args + h(' ) {'));
                    for (var i = 0; i < this.data.length; i++) {
                        console.log(Global.context.identfy() + a(this.data[i].replace(/###/g, this.bits)));
                    }
                    console.log(Global.context.identfy() + h('}'));
                };
            }
        },
        bit_mask: {
            macros: [
                '#include <limits.h>',
            ],
            fcn: function() {
                this.print = function() {
                    if (_unique_print.bit_mask) {
                        return;
                    }
                    _unique_print.bit_mask = true;
                    var t = Global.printer.theme;
                    console.log(Global.context.identfy() + t.macro('#define BIT_MASK(t,v) ((t)(-((v)!= 0)))&(((t)-1)>>((sizeof(t)*CHAR_BIT)-(v)))'));
                };
            }
        },
        swap_endian: {
            macros: [],
            fcn: function(bits) {
                this.bits = bits;
                this.data = [];
                if (bits == 16) {
                    this.data.push('#define SWAP16(n) ((uint16_t) (((n & 0x00ff) << 8) | \\');
                    this.data.push('                               ((n & 0xff00) >> 8)))');
                } else if (bits == 32) {
                    this.data.push('#define SWAP32(n) ((uint32_t) (((n & 0x000000ff) << 24) | \\');
                    this.data.push('                               ((n & 0x0000ff00) <<  8) | \\');
                    this.data.push('                               ((n & 0x00ff0000) >>  8) | \\');
                    this.data.push('                               ((n & 0xff000000) >> 24)))');
                } else {
                    bits = 64;
                    this.data.push('#define SWAP64(val) ((uint64_t) (((val & 0x00000000000000ffull) << 56) | \\');
                    this.data.push('                                 ((val & 0x000000000000ff00ull) << 40) | \\');
                    this.data.push('                                 ((val & 0x0000000000ff0000ull) << 24) | \\');
                    this.data.push('                                 ((val & 0x00000000ff000000ull) <<  8) | \\');
                    this.data.push('                                 ((val & 0x000000ff00000000ull) >>  8) | \\');
                    this.data.push('                                 ((val & 0x0000ff0000000000ull) >> 24) | \\');
                    this.data.push('                                 ((val & 0x00ff000000000000ull) >> 40) | \\');
                    this.data.push('                                 ((val & 0xff00000000000000ull) >> 56)))');
                }
                this.print = function() {
                    if (_unique_print.swap_endian.indexOf(this.bits) >= 0) {
                        return;
                    }
                    _unique_print.swap_endian.push(this.bits);
                    var t = Global.printer.theme;
                    for (var i = 0; i < this.data.length; i++) {
                        console.log(Global.context.identfy() + t.macro(this.data[i]));
                    }
                };
            }
        }
    };

})();