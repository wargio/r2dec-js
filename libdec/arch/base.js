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
        'fgets': {
            macro: ['#include <stdio.h>'],
            args: 3
        },
        'fwrite': {
            macro: ['#include <stdio.h>'],
            args: 4
        },
        'fread': {
            macro: ['#include <stdio.h>'],
            args: 4
        },
        'textdomain': {
            macro: ['#include <libintl.h>'],
            args: -1
        },
        'setlocale': {
            macro: ['#include <locale.h>'],
            args: -1
        },
        'wcscmp': {
            macro: ['#include <wchar.h>'],
            args: 2
        },
        'strcmp': {
            macro: ['#include <string.h>'],
            args: 2
        },
        'strncmp': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'msvcrt_dll_memset': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'xmalloc': {
            macro: ['#include <stdlib.h>'],
            args: 1
        },
        'memset': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'memcpy': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'strcpy': {
            macro: ['#include <string.h>'],
            args: 2
        },
        'puts': {
            macro: ['#include <stdio.h>'],
            args: 1
        },
        'printf': {
            macro: ['#include <stdio.h>'],
            args: -1
        },
        'scanf': {
            macro: ['#include <stdio.h>'],
            args: -1
        },
        'isoc99_scanf': {
            macro: ['#include <stdio.h>'],
            args: -1
        }
    };

    var _colorize = function(input, color) {
        if (!color) return input;
        return color.colorize(input);
    }

    var _dependency = function(macros, code) {
        this.macros = macros || [];
        this.code = code || '';
    }

    var _pseudocode = function(context, dependencies) {
        this.ctx = context;
        this.deps = dependencies || new _dependency();
        this.toString = function(color) {
            if (typeof this.ctx == 'string') {
                return _colorize(this.ctx.toString(), color);
            }
            return this.ctx.toString(color);
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
        this.toString = function(color) {
            if (this.srcA == this.dst) {
                return _colorize(this.dst, color) + ' ' + this.op + '= ' + _colorize(this.srcB, color);
            }
            return _colorize(this.dst, color) + ' = ' + _colorize(this.srcA, color) + ' ' + this.op + ' ' + _colorize(this.srcB, color);
        };
    };

    var _common_pre_op = function(op, destination, source) {
        this.op = op;
        this.dst = destination;
        this.src = source;
        this.toString = function(color) {
            return _colorize(this.dst, color) + ' = ' + this.op + _colorize(this.src, color);
        };
    };

    var _common_memory = function(bits, is_signed, pointer, register, is_write) {
        this.reg = register;
        this.pointer = pointer;
        this.bits = bits ? ((is_signed ? '' : 'u') + 'int' + bits + '_t') : null;
        if (is_write) {
            this.toString = function(color) {
                if (this.bits) {
                    return '*((' + _colorize(this.bits, color) + '*) ' + _colorize(this.pointer, color) + ') = ' + _colorize(this.reg, color);
                }
                return '*(' + _colorize(this.pointer, color) + ') = ' + _colorize(this.reg, color);
            };
        } else {
            this.toString = function(color) {
                if (this.bits) {
                    return this.reg + ' = *((' + _colorize(this.bits, color) + '*) ' + _colorize(this.pointer, color) + ')';
                }
                return this.reg + ' = *(' + _colorize(this.pointer, color) + ')';
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
        this.toString = function(color) {
            return this.a + _cmps[this.cmp][this.inverse] + this.b;
        };
    };

    var _common_rotate = function(destination, source_a, source_b, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.dst = destination;
        this.srcA = source_a;
        this.srcB = source_b;
        this.toString = function(color) {
            return this.dst + ' = ' + (color ? color.instance.callname(this.call) : this.call) + ' (' + _colorize(this.srcA, color) + ', ' + _colorize(this.srcB, color) + ')';
        };
    };

    var _common_assign = function(destination, source, bits) {
        this.dst = destination;
        this.bits = bits ? ('int' + bits + '_t') : null;
        this.src = source;
        this.toString = function(color) {
            if (this.bits) {
                return _colorize(this.dst, color) + ' = (' + _colorize(this.bits, color) + ') ' + _colorize(this.src, color);
            }
            return _colorize(this.dst, color) + ' = ' + _colorize(this.src, color);
        };
    };

    var _common_call = function(caller, args, is_pointer, returns) {
        this.caller = caller;
        this.args = args || [];
        this.is_pointer = is_pointer;
        this.returns = returns;
        this.toString = function(color) {
            var s = '';
            var caller = this.caller;
            var args = this.args.map(function(x) {
                return _colorize(x, color);
            });
            if (is_pointer) {
                caller = '(*(' + (color ? color.types('void') : 'void') + '(*)(' + (this.args.length > 0 ? '...' : '') + ')) ' + caller + ')';
            } else if (color) {
                caller = color.instance.callname(caller);
            }
            if (this.returns) {
                if (this.returns == 'return') {
                    s = (color ? color.instance.flow('return') : 'return') + ' ';
                } else {
                    s = _colorize(this.returns, color) + ' = ';
                }
            }
            return s + caller + ' (' + args.join(', ') + ')';
        };
    };

    var _common_goto = function(reg) {
        this.reg = reg;
        this.toString = function(color) {
            var r = color ? color.instance.flow('goto') : 'goto';
            r += ' ' + (color ? _colorize(this.reg, color) : this.reg);
            return r;
        };
    };

    var _common_return = function(reg) {
        this.reg = reg;
        this.toString = function(color) {
            var r = color ? color.instance.flow('return') : 'return';
            if (this.reg) {
                r += ' ' + (color ? _colorize(this.reg, color) : this.reg);
            }
            return r;
        };
    };

    return {
        call_args: function(name) {
            if (_call_common[name]) {
                return _call_common[name].args;
            }
            return -1;
        },
        increase: function(destination, source) {
            return new _pseudocode(new _common_math('+', destination, destination, source));
        },
        decrease: function(destination, source) {
            return new _pseudocode(new _common_math('-', destination, destination, source));
        },
        assign: function(destination, source) {
            return new _pseudocode(new _common_assign(destination, source, false));
        },
        extend: function(destination, source, bits) {
            return new _pseudocode(new _common_assign(destination, source, bits));
        },
        return: function(register) {
            return new _pseudocode(new _common_return(register));
        },
        goto: function(address) {
            if (typeof address != 'string') {
                address = '0x' + address.toString(16);
            }
            return new _pseudocode(new _common_goto(address));
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
            if (source_a == source_b) {
                return new _pseudocode(new _common_assign(destination, '0', false));
            }
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
        call: function(address, args, is_pointer, returns) {
            var macros = null;
            if (_call_common[address]) {
                macros = _call_common[address].macro;
                if (macros) {
                    macros = new _dependency(macros);
                }
            }
            return new _pseudocode(new _common_call(address, args, is_pointer, returns), macros);
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
        special: function(data) {
            return new _pseudocode(data);
        },
        unknown: function(data) {
            return new _pseudocode('_asm(\"' + data + '\")');
        }
    };
})();