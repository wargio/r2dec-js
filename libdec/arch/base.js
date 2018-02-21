/* 
 * Copyright (C) 2017 deroad
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

    var _call_common = {
        'textdomain': ['#include <libintl.h>'],
        'setlocale': ['#include <locale.h>'],
        'wcscmp': ['#include <wchar.h>'],
        'strcmp': ['#include <string.h>'],
        'strncmp': ['#include <string.h>'],
        'msvcrt_dll_memset': ['#include <string.h>'],
        'xmalloc': ['#include <stdlib.h>'],
        'memset': ['#include <string.h>'],
        'memcpy': ['#include <string.h>'],
        'strcpy': ['#include <string.h>'],
        'puts': ['#include <stdio.h>'],
        'printf': ['#include <stdio.h>'],
        'scanf': ['#include <stdio.h>'],
        'isoc99_scanf': ['#include <stdio.h>']
    };

    var _dependency = function(macros, code) {
        this.macros = macros || [];
        this.code = code || '';
    }

    var _pseudocode = function(context, dependencies) {
        this.ctx = context;
        this.deps = dependencies || new _dependency();
        this.toString = function() {
            return this.ctx.toString();
        };
    };

    var _cmps = {
        CMP_INF: ['1', '0'],
        CMP_EQ: [' == ', ' != '],
        CMP_NE: [' != ', ' == '],
        CMP_LT: [' < ', ' >= '],
        CMP_LE: [' <= ', ' > '],
        CMP_GT: [' > ', ' <= '],
        CMP_GE: [' >= ', ' < ']
    };

    var _common_math = function(op, destination, source_a, source_b) {
        this.op = op;
        this.dst = destination;
        this.srcA = source_a;
        this.srcB = source_b;
        this.toString = function() {
            if (this.srcA == this.dst) {
                return this.dst + ' ' + this.op + '= ' + this.srcA;
            }
            return this.dst + ' = ' + this.srcA + ' ' + this.op + ' ' + this.srcB;
        };
    };

    var _common_pre_op = function(op, destination, source) {
        this.op = op;
        this.dst = destination;
        this.src = source;
        this.toString = function() {
            return this.dst + ' = ' + this.op + this.src;
        };
    };

    var _common_memory = function(bits, is_signed, pointer, register, is_write) {
        this.reg = register;
        this.pointer = pointer;
        this.bits = bits ? ('(' + (is_signed ? '' : 'u') + 'int' + bits + '_t*)') : '';
        if (is_write) {
            this.toString = function() {
                return '*(' + this.bits + ' ' + this.pointer + ') = ' + this.reg;
            };
        } else {
            this.toString = function() {
                return this.reg + ' = *(' + this.bits + ' ' + this.pointer + ')';
            };
        }
    };

    var _common_conditional = function(cmp, a, b, inverse) {
        this.a = a;
        this.b = b;
        this.cmp = cmp;
        this.inverse = inverse ? 1 : 0;
        this.setInverse = function(b) {
            this.inverse = b ? 1 : 0;
        }
        this.toString = function() {
            return this.a + _cmps[this.cmp][this.inverse] + this.b;
        };
    };

    var _common_rotate = function(destination, source_a, source_b, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.dst = destination;
        this.srcA = source_a;
        this.srcB = source_b;
        this.toString = function() {
            return this.dst + ' = ' + this.call + ' (' + this.srcA + ', ' + this.srcB + ')';
        };
    };

    var _common_assign = function(destination, source, bits) {
        this.dst = destination;
        this.bits = bits ? ('(int' + bits + '_t) ') : '';
        this.src = source;
        this.toString = function() {
            return this.dst + ' = ' + this.bits + this.src;
        };
    }

    return {
        increase: function(destination, source) {
            return new _pseudocode(new _common_math('+', destination, destination, source));
        },
        decrease: function(destination, source) {
            return new _pseudocode(new _common_math('+', destination, destination, source));
        },
        assign: function(destination, source) {
            return new _pseudocode(new _common_assign(destination, source, false));
        },
        extend: function(destination, source, bits) {
            return new _pseudocode(new _common_assign(destination, source, bits));
        },
        return: function(register) {
            if (register) {
                return new _pseudocode('return ' + register);
            }
            return new _pseudocode('return');
        },
        jump: function(address) {
            return new _pseudocode('goto address_' + address.toString(16));
        },
        nop: function(destination, source_a, source_b) {
            return null;
        },
        and: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('&', destination, source_a, source_b));
        },
        or: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('|', destination, source_a, source_b));
        },
        xor: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('^', destination, source_a, source_b));
        },
        add: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('+', destination, source_a, source_b));
        },
        subtract: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('-', destination, source_a, source_b));
        },
        multiply: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('*', destination, source_a, source_b));
        },
        divide: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('/', destination, source_a, source_b));
        },
        module: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('%', destination, source_a, source_b));
        },
        not: function(destination, source) {
            return new _pseudocode(new _common_pre_op('!', destination, source));
        },
        negate: function(destination, source) {
            return new _pseudocode(new _common_pre_op('-', destination, source));
        },
        inverse: function(destination, source) {
            return new _pseudocode(new _common_pre_op('~', destination, source));
        },
        shift_left: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('<<', destination, source_a, source_b));
        },
        shift_right: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_math('>>', destination, source_a, source_b));
        },
        rotate_left: function(destination, source_a, source_b, bits) {
            return new _pseudocode(new _common_rotate(destination, source_a, source_b, bits, true),
                new _dependency(['#include <stdint.h>', '#include <limits.h>'], 'uint###_t rotate_left### (uint###_t value, unsigned int count) {\n\tconst unsigned int mask = (CHAR_BIT * sizeof(value)) - 1;\n\tcount &= mask;\n\treturn (value << count) | (value >> (-count & mask));\n}\n'.replace(/###/g, bits.toString()))
            );
        },
        rotate_right: function(destination, source_a, source_b, bits) {
            return new _pseudocode(new _common_rotate(destination, source_a, source_b, bits, false),
                new _dependency(['#include <stdint.h>', '#include <limits.h>'], 'uint###_t rotate_right### (uint###_t value, unsigned int count) {\n\tconst unsigned int mask = (CHAR_BIT * sizeof(value)) - 1;\n\tcount &= mask;\n\treturn (value >> count) | (value << (-count & mask));\n}'.replace(/###/g, bits.toString()))
            );
        },
        read_memory: function(pointer, register, bits, is_signed) {
            return new _pseudocode(new _common_memory(bits, is_signed, pointer, register, false));
        },
        write_memory: function(pointer, register, bits, is_signed) {
            return new _pseudocode(new _common_memory(bits, is_signed, pointer, register, true));
        },
        call: function(address, args, is_pointer) {
            args = args || [];
            var macros = _call_common[address];
            if (macros) {
                macros = new _dependency(macros);
            }
            if (is_pointer) {
                address = '(*(void(*)(' + (args.length > 0 ? '...' : '') + ')) ' + address + ')'
            }
            return new _pseudocode(address + ' (' + args.join(', ') + ')', macros);
        },
        branch_equal: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_EQ', a, b, false));
        },
        branch_not_equal: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_NE', a, b, false));
        },
        branch_less: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_LT', a, b, false));
        },
        branch_less_equal: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_LE', a, b, false));
        },
        branch_greater: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_GT', a, b, false));
        },
        branch_greater_equal: function(a, b) {
            return new _pseudocode(new _common_conditional('CMP_GE', a, b, false));
        },
        push: function(data) {
            return new _pseudocode(data);
        },
        unknown: function(data) {
            return new _pseudocode('_asm(\"' + data + '\")');
        }
    };
})();