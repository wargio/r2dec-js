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

    var Base = require('libdec/core/base');

    var _common_math = function(e, op, reversed) {
        if (e[2] == '0') {
            return Base.instructions.nop();
        }
        if (reversed) {
            return op(e[2], e[1], e[2]);
        }
        return op(e[2], e[2], e[1]);
    };

    var _compare = function(instr, context) {
        context.cond.a = instr.parsed[2];
        context.cond.b = instr.parsed[1];
        return Base.instructions.nop();
    }

    var _conditional = function(instr, context, type, zero) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.instructions.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var load_bits = function(register, pointer, bits, signed) {
        //pointer, register, bits, is_signed
        return Base.instructions.read_memory(pointer, register, bits, signed);
    };

    var store_bits = function(register, pointer, bits, signed) {
        //pointer, register, bits, is_signed
        return Base.instructions.write_memory(pointer, register, bits, signed);
    };

    var _setf_v850_cond = {
        'lt': {
            cond: 'LT',
            arg1: null,
        },
        'le': {
            cond: 'LE',
            arg1: null,
        },
        'ge': {
            cond: 'GE',
            arg1: null,
        },
        'gt': {
            cond: 'GT',
            arg1: null,
        },
        'nh': {
            cond: 'LE',
            arg1: null,
        },
        'h': {
            cond: 'GT',
            arg1: null,
        },
        'nz': {
            cond: 'NE',
            arg1: '0',
        },
        'z': {
            cond: 'GT',
            arg1: '0',
        }
    };

    return {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.instructions.add);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
            },
            b: function() {
                return Base.instructions.nop();
            },
            bne: function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            beq: function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            bgt: function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            bnh: function(instr, context) {
                //branch not higher = LE
                return _conditional(instr, context, 'GT');
            },
            bh: function(instr, context) {
                //branch higher = GT
                return _conditional(instr, context, 'LE');
            },
            bge: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bz: function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            bnz: function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            cmp: _compare,
            jarl: function(instr, context, instructions) {
                var ret = null;
                if (instr.parsed[2] == '0') {
                    instr.comments.push('link pointer is lost. (used r0)');
                    ret = 'return';
                } else {
                    instr.comments.push(instr.parsed[2] + ' = PC + 4;');
                    if ((instructions.length - 1) == instructions.indexOf(instr)) {
                        ret = 'return';
                    }
                }
                return Base.instructions.call(instr.parsed[1], [], instr.parsed[1].indexOf('0x') == 0, ret, null);
            },
            jmp: function(instr, context, instructions) {
                if ((instructions.length - 1) == instructions.indexOf(instr)) {
                    //name, args, is_pointer, returns, bits
                    return Base.instructions.call(instr.parsed[1], [], true, 'return');
                }
                return Base.instructions.nop();
            },
            jr: function() {
                return Base.instructions.nop();
            },
            'ld.b': function(instr) {
                // ld.X 0x6c36[r4], r14
                // ["ld.X","0x6c36","r4","r14"]
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 8, true);
                }
                return load_bits(dst, src + ' + ' + addr, 8, true);
            },
            'ld.bu': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 8, false);
                }
                return load_bits(dst, src + ' + ' + addr, 8, false);
            },
            'ld.h': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 16, true);
                }
                return load_bits(dst, src + ' + ' + addr, 16, true);
            },
            'ld.hu': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 16, false);
                }
                return load_bits(dst, src + ' + ' + addr, 16, false);
            },
            'ld.w': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 32, false);
                }
                return load_bits(dst, src + ' + ' + addr, 32, false);
            },
            mov: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.assign(instr.parsed[2], instr.parsed[1]);
            },
            movea: function(instr) {
                if (instr.parsed[3] == '0') {
                    return Base.instructions.nop();
                }
                if (instr.parsed[2] == '0') {
                    return Base.instructions.assign(instr.parsed[3], instr.parsed[1]);
                }
                if (instr.parsed[1] == '0') {
                    return Base.instructions.assign(instr.parsed[3], instr.parsed[2]);
                }
                return Base.instructions.add(instr.parsed[3], instr.parsed[2], instr.parsed[1]);
            },
            movhi: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                var a = instr.parsed[1];
                if (a.indexOf('0x') != 0) {
                    a = '0x' + parseInt(a).toString(16);
                }
                return Base.instructions.assign(instr.parsed[2], a + '0000');
            },
            mul: function(instr) {
                if (instr.parsed[3] == '0') {
                    return Base.instructions.nop();
                }
                //value, bits, is_signed, is_pointer, is_memory
                var n = Base.bits_argument(instr.parsed[1], 32, true, false, false)
                return Base.instructions.multiply(instr.parsed[3], instr.parsed[2], n);
            },
            mulh: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.multiply(instr.parsed[2], instr.parsed[2], instr.parsed[1]);
            },
            mulhi: function(instr) {
                if (instr.parsed[3] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.multiply(instr.parsed[3], instr.parsed[2], instr.parsed[1]);
            },
            not: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.not(instr.parsed[2], instr.parsed[1]);
            },
            nop: function(instr) {
                return Base.instructions.nop();
            },
            or: function(instr) {
                return _common_math(instr.parsed, Base.instructions.or);
            },
            ori: function(instr) {
                if (instr.parsed[3] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.or(instr.parsed[3], instr.parsed[2], instr.parsed[1]);
            },
            satadd: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.instructions.add);
            },
            satsub: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.instructions.subtract, false);
            },
            satsubi: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.instructions.subtract, true);
            },
            satsubr: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.instructions.subtract, true);
            },
            shl: function(instr) {
                return _common_math(instr.parsed, Base.instructions.shift_left);
            },
            shr: function(instr) {
                //logically shift right
                return _common_math(instr.parsed, Base.instructions.shift_right);
            },
            setf: function(instr, context) {
                var e = instr.parsed;
                if (e[2] == '0') {
                    return Base.instructions.nop();
                }
                if (e[1] == 'v' || e[1] == 'nv') {
                    var m = new Base.macro((e[1] == 'nv' ? '!' : '') + 'IS_OVERFLOW(' + context.cond.a + ', ' + context.cond.b + ')');
                    var op = Base.instructions.conditional_assign(e[2], m, null, 'CUST', '1', '0');
                    Base.add_macro(op, '#define IS_OVERFLOW(a,b) (((a<0)&&(b<0)&&(a+b>0))||((a>0)&&(b>0)&&(a+b<0)))');
                    return op;
                }
                var o = _setf_v850_cond[e[1]];
                if (!o) {
                    instr.comments.push('unhandled use-case. please report it.');
                    instr.comments.push(instr.assembly);
                    return Base.instructions.nop();
                }
                return Base.instructions.conditional_assign(e[2], context.cond.a, o.arg1 || context.cond.b, o.cond, '1', '0');
            },
            'sld.b': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 8, true);
                }
                return load_bits(dst, src + ' + ' + addr, 8, true);
            },
            'sld.bu': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 8, false);
                }
                return load_bits(dst, src + ' + ' + addr, 8, false);
            },
            'sld.h': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 16, true);
                }
                return load_bits(dst, src + ' + ' + addr, 16, true);
            },
            'sld.hu': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 16, false);
                }
                return load_bits(dst, src + ' + ' + addr, 16, false);
            },
            'sld.w': function(instr) {
                var addr = instr.parsed[1];
                var src = instr.parsed[2];
                var dst = instr.parsed[3];
                if (src == '0') {
                    return load_bits(dst, addr, 32, false);
                }
                return load_bits(dst, src + ' + ' + addr, 32, false);
            },
            'sst.b': function(instr) {
                // st.X , r14, 0x6c36[r4]
                // ["st.X","r14","0x6c36","r4"]
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 8, true);
                }
                return store_bits(dst, src + ' + ' + addr, 8, true);
            },
            'sst.bu': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 8, false);
                }
                return store_bits(dst, src + ' + ' + addr, 8, false);
            },
            'sst.h': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 16, true);
                }
                return store_bits(dst, src + ' + ' + addr, 16, true);
            },
            'sst.hu': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 16, false);
                }
                return store_bits(dst, src + ' + ' + addr, 16, false);
            },
            'sst.w': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 32, false);
                }
                return store_bits(dst, src + ' + ' + addr, 32, false);
            },
            'st.b': function(instr) {
                // st.X , r14, 0x6c36[r4]
                // ["st.X","r14","0x6c36","r4"]
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 8, true);
                }
                return store_bits(dst, src + ' + ' + addr, 8, true);
            },
            'st.bu': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 8, false);
                }
                return store_bits(dst, src + ' + ' + addr, 8, false);
            },
            'st.h': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 16, true);
                }
                return store_bits(dst, src + ' + ' + addr, 16, true);
            },
            'st.hu': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 16, false);
                }
                return store_bits(dst, src + ' + ' + addr, 16, false);
            },
            'st.w': function(instr) {
                var dst = instr.parsed[1];
                var addr = instr.parsed[2];
                var src = instr.parsed[3];
                if (src == '0') {
                    return store_bits(dst, addr, 32, false);
                }
                return store_bits(dst, src + ' + ' + addr, 32, false);
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.instructions.subtract);
            },
            subr: function(instr) {
                return _common_math(instr.parsed, Base.instructions.subtract, true);
            },
            sxb: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.extend(instr.parsed[2], instr.parsed[1], 32);
            },
            sxh: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.extend(instr.parsed[2], instr.parsed[1], 32);
            },
            tst: function(instr, context, instructions) {
                var e = instr.parsed;
                context.cond.a = (e[1] == e[2]) ? e[2] : "(" + e[2] + " & " + e[1] + ")";
                context.cond.b = '0';
                return Base.instructions.nop();
            },
            xor: function(instr) {
                return _common_math(instr.parsed, Base.instructions.xor);
            },
            xori: function(instr) {
                if (instr.parsed[3] == '0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.xor(instr.parsed[3], instr.parsed[2], instr.parsed[1]);
            },
            zxb: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                var a = Base.bits_argument(instr.parsed[1], 32, false, false, false);
                return Base.instructions.assign(instr.parsed[2], a);
            },
            zxh: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                var a = Base.bits_argument(instr.parsed[1], 32, false, false, false);
                return Base.instructions.assign(instr.parsed[2], a);
            },
            invalid: function() {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var ret = asm.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            return ret.trim().replace(/\br0\b/g, '0').split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: '?',
                    b: '?'
                },
                leave: false,
                vars: []
            }
        },
        localvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return 'void';
        }
    };
})();