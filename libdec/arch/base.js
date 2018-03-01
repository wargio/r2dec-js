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
        this.toString = function(options) {
            if (!options) {
                options = {};
            }
            if (typeof this.ctx == 'string') {
                return _colorize(this.ctx.toString(), options.color);
            }
            return this.ctx.toString(options);
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

    var _is_str = function(s) {
        return typeof s == 'string';
    };

    var _apply_bits = function(input, bits, options, is_signed, is_pointer, is_memory) {
        var pointer = is_pointer ? '*' : '';
        bits = bits ? ((is_signed ? '' : 'u') + 'int' + bits + '_t') : null;
        if (options.casts && bits) {
            return (is_memory ? '*(' : '') + '(' + _colorize(bits, options.color) + pointer + ') ' + _colorize(input, options.color) + (is_memory ? ')' : '');
        }
        return _colorize(input, options.color);
    }

    _bits_argument = function(value, bits, is_signed, is_pointer, is_memory) {
        this.bits = bits;
        this.value = value;
        this.is_signed = is_signed || false;
        this.is_pointer = is_pointer || false;
        this.is_memory = is_memory || false;
        this.is = function(x) {
            return x ? x.value == this.value : false;
        }
        this.toString = function(options) {
            return _apply_bits(this.value, this.bits, options, this.is_signed, this.is_pointer, this.is_memory);
        };
    };

    var _common_math = function(op, destination, source_a, source_b) {
        this.op = op;
        this.dst = _is_str(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.srcA = _is_str(source_a) ? new _bits_argument(source_a, false, false, false) : source_a;
        this.srcB = _is_str(source_b) ? new _bits_argument(source_b, false, false, false) : source_b;
        this.toString = function(options) {
            if (this.srcA.is(this.dst)) {
                return this.dst.toString(options) + ' ' + this.op + '= ' + this.srcB.toString(options);
            }
            return this.dst.toString(options) + ' = ' + this.srcA.toString(options) + ' ' + this.op + ' ' + this.srcB.toString(options);
        };
    };

    var _common_pre_op = function(op, destination, source) {
        this.op = op;
        this.dst = _is_str(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.src = _is_str(source) ? new _bits_argument(source, false, false, false) : source;
        this.toString = function(options) {
            return this.dst.toString(options) + ' = ' + this.op + this.src.toString(options);
        };
    };

    var _common_memory = function(bits, is_signed, pointer, register, is_write) {
        this.reg = _is_str(register) ? new _bits_argument(register, false, false, false, true) : register;
        this.pointer = _is_str(pointer) ? new _bits_argument(pointer, bits, is_signed, true, true) : pointer;
        this.is_signed = is_signed;
        this.bits = bits || null;
        if (is_write) {
            this.toString = function(options) {
                return this.pointer.toString(options) + ' = ' + this.reg.toString(options);
            };
        } else {
            this.toString = function(options) {
                return this.reg.toString(options) + ' = ' + this.pointer.toString(options);
            };
        }
    };

    var _common_data = function(data) {
        this.data = data;
        this.toString = function(options) {
            return _colorize(this.data, options.color);
        };
    };

    var _common_conditional = function(cmp, a, b, inverse) {
        this.a = a;
        this.b = b;
        this.cmp = cmp;
        this.inverse = inverse ? 1 : 0;
        this.setInverse = function(b) {
            this.inverse = b ? 1 : 0;
        }
        this.toString = function(options) {
            return this.a + _cmps[this.cmp][this.inverse] + this.b;
        };
    };

    var _common_rotate = function(destination, source_a, source_b, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.dst = _is_str(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.srcA = _is_str(source_a) ? new _bits_argument(source_a, false, false, false) : source_a;
        this.srcB = _is_str(source_b) ? new _bits_argument(source_b, false, false, false) : source_b;
        this.toString = function(options) {
            return this.dst.toString(options) + ' = ' + (options.color ? options.color.callname(this.call) : this.call) + ' (' + this.srcA.toString(options.color) + ', ' + this.srcB.toString(options.color) + ')';
        };
    };

    var _common_assign = function(destination, source) {
        this.dst = _is_str(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.src = _is_str(source) ? new _bits_argument(source, false, false, false) : source;
        this.toString = function(options) {
            return this.dst.toString(options) + ' = ' + this.src.toString(options);
        };
    };

    var _common_call = function(caller, args, is_pointer, returns) {
        this.caller = caller;
        this.args = args || [];
        this.is_pointer = is_pointer;
        this.returns = returns;
        this.toString = function(options) {
            var s = '';
            var caller = this.caller;
            var args = this.args.map(function(x) {
                return x.toString(options);
            });
            if (is_pointer) {
                caller = '(*(' + (options.color ? options.color.types('void') : 'void') + '(*)(' + (this.args.length > 0 ? '...' : '') + ')) ' + caller + ')';
            } else if (options.color) {
                caller = options.color.callname(caller);
            }
            if (this.returns) {
                if (this.returns == 'return') {
                    s = (options.color ? options.color.flow('return') : 'return') + ' ';
                } else {
                    s = _colorize(this.returns, options.color) + ' = ';
                }
            }
            return s + caller + ' (' + args.join(', ') + ')';
        };
    };

    var _common_goto = function(reg) {
        this.reg = reg;
        this.toString = function(options) {
            var r = options.color ? options.color.flow('goto') : 'goto';
            r += ' ' + (options.color ? _colorize(this.reg, options.color) : this.reg);
            return r;
        };
    };

    var _common_return = function(reg) {
        this.reg = reg;
        this.toString = function(options) {
            var r = options.color ? options.color.flow('return') : 'return';
            if (this.reg) {
                r += ' ' + (options.color ? _colorize(this.reg, options.color) : this.reg);
            }
            return r;
        };
    };

    var _common_asm = function(opcode) {
        this.opcode = opcode;
        this.toString = function(options) {
            return (options.color ? options.color.callname('_asm') : '_asm') + ' (\"' + this.opcode + '\")';
        };
    };

    return {
        bits_argument: _bits_argument,
        arguments: function(name) {
            if (_call_common[name]) {
                return _call_common[name].args;
            }
            return -1;
        },
        common: _common_data,
        branches: {
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
            }
        },
        instructions: {
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
                    new _dependency(['#include <stdint.h>', '#include <limits.h>'], 'uint###_t rotate_left### (uint###_t value, uint32_t count) {\n\tconst uint32_t mask = (CHAR_BIT * sizeof(value)) - 1;\n\tcount &= mask;\n\treturn (value << count) | (value >> (-count & mask));\n}\n'.replace(/###/g, bits.toString()))
                );
            },
            rotate_right: function(destination, source_a, source_b, bits) {
                return new _pseudocode(new _common_rotate(destination, source_a, source_b, bits, false),
                    new _dependency(['#include <stdint.h>', '#include <limits.h>'], 'uint###_t rotate_right### (uint###_t value, uint32_t count) {\n\tconst uint32_t mask = (CHAR_BIT * sizeof(value)) - 1;\n\tcount &= mask;\n\treturn (value >> count) | (value << (-count & mask));\n}'.replace(/###/g, bits.toString()))
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
            push: function(data) {
                return new _pseudocode(data);
            },
            special: function(data) {
                return new _pseudocode(data);
            },
            unknown: function(data) {
                return new _pseudocode(new _common_asm(data));
            }
        }
    };
})();