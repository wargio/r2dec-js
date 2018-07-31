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
    var Printable = require('libdec/printable');
    var Branch = require('libdec/core/Branch');
    const _call_c = require('libdec/db/c_calls');
    const _call_common = require('libdec/db/macros');

    var _internal_variable_cnt = 0;

    var _is_address = function(value) {
        return typeof value == 'string' && value.indexOf('0x') == 0;
    };

    var _dependency = function(macros, code) {
        this.macros = macros || [];
        this.code = code || [];
    }

    var _pseudocode = function(context, dependencies) {
        this.ctx = context;
        this.deps = dependencies || new _dependency();
        this.printable = function(p, spacesize, ident) {
            if (typeof this.ctx == 'string') {
                p.appendColorize(this.ctx);
            } else {
                this.ctx.printable(p, spacesize, ident);
            }
        }
        this.toString = function(options) {
            if (!options) {
                options = {};
            }
            if (typeof this.ctx == 'string') {
                return this.ctx;
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

    var _is_str_or_num = function(s) {
        return typeof s == 'string' || typeof s == 'number';
    };

    var _castme = function(bits, is_signed) {
        return bits ? ((is_signed ? '' : 'u') + 'int' + bits + '_t') : null;
    }

    var _apply_bits = function(input, bits, is_signed, is_pointer, is_memory, options) {
        var pointer = is_pointer ? '*' : '';
        if (options && options.casts) {
            bits = _castme(bits, is_signed);
        } else if (!options) {
            bits = _castme(bits, is_signed);
        } else {
            bits = '';
        }
        if (bits) {
            return (is_memory ? '*(' : '') + '(' + bits + pointer + ') ' + input + (is_memory ? ')' : '');
        }
        return (is_memory ? '*(' : '') + input + (is_memory ? ')' : '');
    }

    var _bits_argument = function(value, bits, is_signed, is_pointer, is_memory) {
        this.bits = bits;
        this.value = value;
        this.is_signed = is_signed || false;
        this.is_pointer = is_pointer || false;
        this.is_memory = is_memory || false;
        this.is = function(x) {
            return x ? x.value == this.value : false;
        }
        this.printable = function(p) {
            p.appendObject(this);
        };
        this.toString = function(options) {
            return _apply_bits(this.value, this.bits, this.is_signed, this.is_pointer, this.is_memory, options);
        };
    };

    var _common_math_opt = function(op, destination) {
        this.op = op;
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(this.op);
        };
        this.toString = function() {
            return this.dst.toString() + this.op;
        };
    };

    var _common_math = function(op, destination, source_a, source_b) {
        this.op = op;
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.srcA = _is_str_or_num(source_a) ? new _bits_argument(source_a, false, false, false) : source_a;
        this.srcB = _is_str_or_num(source_b) ? new _bits_argument(source_b, false, false, false) : source_b;
        this.printable = function(p) {
            if (this.srcA.is(this.dst)) {
                this.dst.printable(p);
                p.append(' ' + this.op + '= ');
                this.srcB.printable(p);
            } else {
                this.dst.printable(p);
                p.append(' = ');
                this.srcA.printable(p);
                p.append(' ' + this.op + ' ');
                this.srcB.printable(p);
            }
        };
        this.toString = function() {
            if (this.srcA.is(this.dst)) {
                return this.dst.toString() + ' ' + this.op + '= ' + this.srcB.toString();
            }
            return this.dst.toString() + ' = ' + this.srcA.toString() + ' ' + this.op + ' ' + this.srcB.toString();
        };
    };

    var _common_pre_op = function(op, destination, source) {
        this.op = op;
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.src = _is_str_or_num(source) ? new _bits_argument(source, false, false, false) : source;
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ' + this.op);
            this.src.printable(p);
        };
        this.toString = function() {
            return this.dst.toString() + ' = ' + this.op + this.src.toString();
        };
    };

    var _common_memory = function(bits, is_signed, pointer, register, is_write) {
        this.reg = _is_str_or_num(register) ? new _bits_argument(register, false, false, false, false) : register;
        this.pointer = _is_str_or_num(pointer) ? new _bits_argument(pointer, bits, is_signed, true, true) : pointer;
        this.is_signed = is_signed;
        this.bits = bits || null;
        if (is_write) {
            this.printable = function(p) {
                this.pointer.printable(p);
                p.append(' = ');
                this.reg.printable(p);
            };
            this.toString = function() {
                return this.pointer.toString() + ' = ' + this.reg.toString();
            };
        } else {
            this.printable = function(p) {
                this.reg.printable(p);
                p.append(' = ');
                this.pointer.printable(p);
            };
            this.toString = function() {
                return this.reg.toString() + ' = ' + this.pointer.toString();
            };
        }
    };

    var _common_data = function(data) {
        this.data = data;
        this.printable = function(p) {
            p.appendColorize(data);
        };
        this.toString = function() {
            return this.data;
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

    var _common_bitmask = function(destination, source_a, source_b) {
        this.call = 'BIT_MASK';
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.srcA = _is_str_or_num(source_a) ? new _bits_argument(source_a, false, false, false) : source_a;
        this.srcB = _is_str_or_num(source_b) ? new _bits_argument(source_b, false, false, false) : source_b;
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ');
            p.appendCallname(this.call);
            p.append(' (');
            this.srcA.printable(p);
            p.append(', ');
            this.srcB.printable(p);
            p.append(')');
        };
        this.toString = function() {
            return this.dst.toString() + ' = ' + this.call + ' (' + this.srcA.toString() + ', ' + this.srcB.toString() + ')';
        };
    };

    var _common_rotate = function(destination, source_a, source_b, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.srcA = _is_str_or_num(source_a) ? new _bits_argument(source_a, false, false, false) : source_a;
        this.srcB = _is_str_or_num(source_b) ? new _bits_argument(source_b, false, false, false) : source_b;
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ');
            p.appendCallname(this.call);
            p.append(' (');
            this.srcA.printable(p);
            p.append(', ');
            this.srcB.printable(p);
            p.append(')');
        };
        this.toString = function() {
            return this.dst.toString() + ' = ' + this.call + ' (' + this.srcA.toString() + ', ' + this.srcB.toString() + ')';
        };
    };

    var _common_assign = function(destination, source, bits, define_dst) {
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination, false, false, false) : destination;
        this.src = _is_str_or_num(source) ? new _bits_argument(source, bits || false, true, false) : source;
        this.def = define_dst ? true : false;
        this.printable = function(p) {
            if (this.def && this.dst.bits) {
                var d = _castme(this.dst.bits, this.dst.is_signed);
                p.append(d + (this.dst.is_pointer ? '* ' : ' '));
            }
            this.dst.printable(p);
            p.append(' = ');
            this.src.printable(p);
        };
        this.toString = function() {
            return this.dst.toString() + ' = ' + this.src.toString();
        };
    };

    var _cast_object = function(bits, is_signed) {
        this.bits = bits;
        this.is_signed = is_signed;
        this.toString = function(options) {
            if (options.casts) {
                return _castme(this.bits, this.is_signed) + ' ';
            }
            return '';
        };
    }

    var _common_call = function(caller, args, is_pointer, returns, bits, is_signed) {
        this.caller = caller;
        this.args = args || [];
        this.is_pointer = is_pointer;
        this.returns = returns;
        this.bits = bits;
        this.is_signed = is_signed;
        this.printable = function(p) {
            var caller = this.caller;
            if (this.returns) {
                if (this.returns == 'return') {
                    p.appendFlow('return');
                    p.append(' ');
                } else {
                    if (this.bits) {
                        p.appendObject(new _cast_object(this.bits, this.is_signed));
                    }
                    if (typeof this.returns == 'string') {
                        p.appendColorize(this.returns + ' = ');
                    } else {
                        this.returns.printable(p);
                        p.append(' = ');
                    }
                }
            }
            if (typeof caller == 'string') {
                if (is_pointer) {
                    p.appendColorize('(*(void(*)(' + (this.args.length > 0 ? '...' : '') + ')) ' + caller + ')');
                } else {
                    p.appendCallname(caller);
                }
            } else {
                caller.printable(p);
            }
            p.append(' (');
            for (var i = 0; i < this.args.length; i++) {
                var x = this.args[i]
                if (i > 0) {
                    p.append(', ');
                }
                if (_is_str_or_num(x)) {
                    p.appendColorize(x);
                } else {
                    x.printable(p);
                }
            }
            p.append(')');
        };
        this.toString = function() {
            var s = '';
            var caller = this.caller;
            var args = this.args;
            if (is_pointer) {
                caller = '(*(void(*)(' + (this.args.length > 0 ? '...' : '') + ')) ' + caller + ')';
            }
            if (this.returns) {
                if (this.returns == 'return') {
                    s = 'return ';
                } else {
                    var cast = this.bits ? (_castme(this.bits, this.is_signed) + ' ') : '';
                    s = this.returns + ' = ' + cast;
                }
            }
            return s + caller + ' (' + args.join(', ') + ')';
        };
    };

    var _common_goto = function(reg) {
        this.reg = reg;
        this.printable = function(p) {
            p.appendFlow('goto');
            p.append(' ');
            p.appendColorize(this.reg);
        };
        this.toString = function(options) {
            return 'goto ' + this.reg;
        };
    };

    var _common_return = function(reg) {
        this.reg = reg;
        this.printable = function(p) {
            p.appendFlow('return');
            if (this.reg) {
                p.append(' ');
                if (typeof this.reg == 'string') {
                    p.appendColorize(this.reg);
                } else {
                    this.reg.printable(p);
                }
            }
        };
        this.toString = function(options) {
            var r = 'return';
            if (this.reg) {
                r += ' ' + this.reg;
            }
            return r;
        };
    };

    var _common_macro_c = function(macro, data) {
        this.macro = macro;
        this.data = data;
        this.printable = function(p) {
            p.appendMacro(this.macro);
            p.appendColorize(this.data);
        };
        this.toString = function(options) {
            return this.macro + (this.data ? this.data : '');
        };
    };

    var _common_asm = function(opcode) {
        this.opcode = opcode;
        this.printable = function(p) {
            p.appendCallname('__asm');
            p.append(' (' + this.opcode + ')');
        };
        this.toString = function(options) {
            return '__asm (' + this.opcode + ')';
        };
    };

    var _composed_extended_op = function(extended) {
        this.extended = extended;
        this.printable = function(p, spacesize, ident) {
            for (var i = 0; i < this.extended.length; i++) {
                if (i > 0) {
                    p.append(';');
                    p.appendEndline();
                    p.appendSpacedPipe(spacesize);
                    p.append(ident);
                }
                this.extended[i].printable(p, spacesize);
            }
        };
        this.toString = function() {
            var s = this.extended[0].toString();
            for (var i = 1; i < this.extended.length; i++) {
                s += ';\n' + this.extended[i].toString();
            }
            return s;
        };
    };

    var _macro_call = function(macro, args, returns) {
        this.macro = macro;
        this.args = args;
        this.returns = returns;
        this.printable = function(p) {
            p.append(this.returns + ' = ');
            p.appendMacro(this.macro);
            p.appendColorize(this.args);
        };
        this.toString = function(options) {
            return this.returns + ' = ' + this.macro + this.args;
        };
    };

    var _inline_assign_if = function(destination, source_a, source_b, cond, src_true, src_false) {
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination.toString()) : destination;
        this.srcA = _is_str_or_num(src_true) ? new _bits_argument(src_true.toString()) : src_true;
        this.srcB = _is_str_or_num(src_false) ? new _bits_argument(src_false.toString()) : src_false;
        this.condition = Branch.generate(source_a, source_b, cond, Branch.FLOW_DEFAULT, _base);
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ');
            p.appendObject(this.condition);
            p.append(' ? ');
            this.srcA.printable(p);
            p.append(' : ');
            this.srcB.printable(p);
        };
        this.toString = function() {
            var s = this.dst.toString();
            s += ' = ' + this.condition.toString() + ' ? ' + this.srcA.toString() + ' : ' + this.srcB.toString();
            return s;
        };
    };

    var _inline_add_if = function(destination, cond_a, cond_b, cond, addend_a, addend_b) {
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination.toString()) : destination;
        this.addA = _is_str_or_num(addend_a) ? new _bits_argument(addend_a.toString()) : addend_a;
        this.addB = _is_str_or_num(addend_b) ? new _bits_argument(addend_b.toString()) : addend_b;
        this.condition = Branch.generate(cond_a, cond_b, cond, Branch.FLOW_DEFAULT, _base);
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ');
            p.appendObject(this.condition);
            p.append(' ? (');
            this.addA.printable(p);
            p.append(' + ');
            this.addB.printable(p);
            p.append(') : ');
            this.dst.printable(p);
        };
        this.toString = function() {
            var s = this.dst.toString();
            s += ' = ' + this.condition.toString() + ' ? (' + this.subA.toString() + ' + ' + this.subB.toString() + ') : ' + s;
            return s;
        };
    };

    var _inline_subtract_if = function(destination, cond_a, cond_b, cond, minuend, subtrahend) {
        this.dst = _is_str_or_num(destination) ? new _bits_argument(destination.toString()) : destination;
        this.subA = _is_str_or_num(minuend) ? new _bits_argument(minuend.toString()) : minuend;
        this.subB = _is_str_or_num(subtrahend) ? new _bits_argument(subtrahend.toString()) : subtrahend;
        this.condition = Branch.generate(cond_a, cond_b, cond, Branch.FLOW_DEFAULT, _base);
        this.printable = function(p) {
            this.dst.printable(p);
            p.append(' = ');
            p.appendObject(this.condition);
            p.append(' ? (');
            this.subA.printable(p);
            p.append(' - ');
            this.subB.printable(p);
            p.append(') : ');
            this.dst.printable(p);
        };
        this.toString = function() {
            var s = this.dst.toString();
            s += ' = ' + this.condition.toString() + ' ? (' + this.subA.toString() + ' - ' + this.subB.toString() + ') : ' + s;
            return s;
        };
    };

    var _base = {
        swap_instructions: function(instructions, index) {
            var a = instructions[index];
            var b = instructions[index + 1];
            var oldloc = a.loc;
            var oldjmp = a.jmp;
            var oldfail = a.fail;
            a.loc = b.loc;
            a.jmp = b.jmp;
            a.fail = b.fail;

            b.loc = oldloc;
            b.jmp = oldjmp;
            b.fail = oldfail;
            instructions[index] = b;
            instructions[index + 1] = a;
        },
        variable: function(bits, is_signed, is_pointer) {
            return 'value' + (_internal_variable_cnt++);
        },
        bits_argument: _bits_argument,
        arguments: function(name) {
            if (_call_common[name]) {
                return _call_common[name].args;
            }
            return -1;
        },
        common: _common_data,
        composed: function(extended) {
            var macros = [];
            var codes = [];
            for (var i = 0; i < extended.length; i++) {
                macros = macros.concat(extended[i].deps.macros);
                codes = codes.concat(extended[i].deps.code);
            }
            return new _pseudocode(new _composed_extended_op(extended), new _dependency(macros, codes));
        },
        string: function(value) {
            this.value = value;
            this.printable = function(p) {
                p.appendText(this.value);
            };
            this.toString = function(options) {
                return (options && options.color ? options.color.text(this.value) : this.value);
            };
        },
        macro: function(value, extra) {
            this.value = value;
            this.extra = extra;
            this.printable = function(p) {
                p.appendMacro(this.value);
                p.appendColorize(this.extra);
            };
            this.toString = function(options) {
                return this.value + (this.extra ? this.extra : '');
            };
        },
        add_macro: function(op, macro) {
            if (op && op.deps.macros.indexOf(macro) < 0) {
                op.deps.macros.push(macro);
            }
        },
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
                if (source == '1') {
                    return new _pseudocode(new _common_math_opt('++', destination));
                }
                return new _pseudocode(new _common_math('+', destination, destination, source));
            },
            decrease: function(destination, source) {
                if (source == '1') {
                    return new _pseudocode(new _common_math_opt('--', destination));
                }
                return new _pseudocode(new _common_math('-', destination, destination, source));
            },
            conditional_assign: function(destination, source_a, source_b, cond, src_true, src_false) {
                return new _pseudocode(new _inline_assign_if(destination, source_a, source_b, cond, src_true, src_false));
            },
            conditional_add: function(destination, cond_a, cond_b, cond, addend_a, addend_b) {
                return new _pseudocode(new _inline_add_if(destination, cond_a, cond_b, cond, addend_a, addend_b));
            },
            conditional_subtract: function(destination, cond_a, cond_b, cond, minuend, subtrahend) {
                return new _pseudocode(new _inline_subtract_if(destination, cond_a, cond_b, cond, minuend, subtrahend));
            },
            assign: function(destination, source) {
                return new _pseudocode(new _common_assign(destination, source, false));
            },
            assign_variable: function(destination, source) {
                return new _pseudocode(new _common_assign(destination, source, false, true));
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
                    return _base.instructions.call(address, [], true, null, null);
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
                if (source_a == '0' && source_b != destination) {
                    return new _pseudocode(new _common_assign(destination, source_b, false));
                } else if (source_b == '0' && source_a != destination) {
                    return new _pseudocode(new _common_assign(destination, source_a, false));
                }
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
                    new _dependency(_call_c.rotate_left.macros, [new _call_c.rotate_left.fcn(bits)])
                );
            },
            rotate_right: function(destination, source_a, source_b, bits) {
                return new _pseudocode(new _common_rotate(destination, source_a, source_b, bits, false),
                    new _dependency(_call_c.rotate_right.macros, [new _call_c.rotate_right.fcn(bits)])
                );
            },
            bit_mask: function(destination, source_a, source_b) {
                return new _pseudocode(new _common_bitmask(destination, source_a, source_b),
                    new _dependency(_call_c.bit_mask.macros, [])
                );
            },
            read_memory: function(pointer, register, bits, is_signed) {
                return new _pseudocode(new _common_memory(bits, is_signed, pointer, register, false));
            },
            write_memory: function(pointer, register, bits, is_signed) {
                return new _pseudocode(new _common_memory(bits, is_signed, pointer, register, true));
            },
            call: function(name, args, is_pointer, returns, bits) {
                var macros = null;
                if (_call_common[name]) {
                    macros = _call_common[name].macro;
                    if (macros) {
                        macros = new _dependency(macros);
                    }
                }
                return new _pseudocode(new _common_call(name, args, is_pointer || _is_address(name), returns, bits), macros);
            },
            push: function(data) {
                return new _pseudocode(data);
            },
            macro: function(macro_name, data, macro) {
                return new _pseudocode(new _common_macro_c(macro_name, data), new _dependency([macro], []));
            },
            special: function(data) {
                return new _pseudocode(data);
            },
            swap_endian: function(value, returns, bits) {
                var macro = [];
                if (bits == 16) {
                    macro.push('#define SWAP16(n) ((uint16_t) (((n & 0x00ff) << 8) | \\');
                    macro.push('                               ((n & 0xff00) >> 8)))');
                } else if (bits == 32) {
                    macro.push('#define SWAP32(n) ((uint32_t) (((n & 0x000000ff) << 24) | \\');
                    macro.push('                               ((n & 0x0000ff00) <<  8) | \\');
                    macro.push('                               ((n & 0x00ff0000) >>  8) | \\');
                    macro.push('                               ((n & 0xff000000) >> 24)))');
                } else {
                    bits = 64;
                    macro.push('#define SWAP64(val) ((uint64_t) (((val & 0x00000000000000ffull) << 56) | \\');
                    macro.push('                                 ((val & 0x000000000000ff00ull) << 40) | \\');
                    macro.push('                                 ((val & 0x0000000000ff0000ull) << 24) | \\');
                    macro.push('                                 ((val & 0x00000000ff000000ull) <<  8) | \\');
                    macro.push('                                 ((val & 0x000000ff00000000ull) >>  8) | \\');
                    macro.push('                                 ((val & 0x0000ff0000000000ull) >> 24) | \\');
                    macro.push('                                 ((val & 0x00ff000000000000ull) >> 40) | \\');
                    macro.push('                                 ((val & 0xff00000000000000ull) >> 56)))');
                }
                return new _pseudocode(new _macro_call('SWAP' + bits, ' (' + value + ')', returns), new _dependency(macro, []));
            },
            unknown: function(data) {
                return new _pseudocode(new _common_asm(data));
            }
        }
    };
    return _base;
})();