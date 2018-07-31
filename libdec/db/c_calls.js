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
    var Printable = require('libdec/printable');

    var _printify = function(bits, name, returns, args, data, spacesize) {
        var p = new Printable();
        p.appendSpacedPipe(spacesize);
        p.appendTypes(returns.replace(/###/g, bits.toString()));
        p.append(' ');
        p.appendCallname(name.replace(/###/g, bits.toString()));
        p.append(' (');
        p.appendColorize(args.replace(/###/g, bits.toString()));
        p.append(') {\n');
        for (var i = 0; i < data.length; i++) {
            p.appendSpacedPipe(spacesize);
            p.appendColorize(data[i].replace(/###/g, bits.toString()));
            p.appendEndline();
        }
        p.appendSpacedPipe(spacesize);
        p.append('}\n');
        return p;
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
                    mident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;',
                    mident + 'count &= mask;',
                    mident + 'return (value << count) | (value >> (-count & mask));'
                ];
                this.printable = function(spacesize) {
                    return _printify(this.bits, this.name, this.returns, this.args, this.data, spacesize);
                };
                this.toString = function(){
                    return this.name.replace(/###/g, this.bits.toString());
                }
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
                    mident + 'const uint###_t mask = (CHAR_BIT * sizeof (value)) - 1;',
                    mident + 'count &= mask;',
                    mident + 'return (value >> count) | (value << (-count & mask));'
                ];
                this.printable = function(spacesize) {
                    return _printify(this.bits, this.name, this.returns, this.args, this.data, spacesize);
                };
                this.toString = function(){
                    return this.name.replace(/###/g, this.bits.toString());
                }
            }
        },
        bit_mask: {
            macros: [
                '#include <limits.h>',
                '#define BIT_MASK(t,v) ((t)(-((v)!= 0)))&(((t)-1)>>((sizeof(t)*CHAR_BIT)-(v)))'
            ],
            fcn: null
        }
    };

})();