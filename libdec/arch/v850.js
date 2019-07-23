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

    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');

    var _common_math = function(e, op, reversed) {
        if (e.opd[1] == '0') {
            return Base.nop();
        }
        if (reversed) {
            return op(e.opd[1], e.opd[0], e.opd[1]);
        }
        return op(e.opd[1], e.opd[1], e.opd[0]);
    };

    var _compare = function(instr, context) {
        context.cond.a = instr.parsed.opd[1];
        context.cond.b = instr.parsed.opd[0];
        return Base.nop();
    };

    var _conditional = function(instr, context, type, zero) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var load_bits = function(register, pointer, bits, signed) {
        //pointer, register, bits, is_signed
        return Base.read_memory(pointer, register, bits, signed);
    };

    var store_bits = function(register, pointer, bits, signed) {
        //pointer, register, bits, is_signed
        return Base.write_memory(pointer, register, bits, signed);
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
            cond: 'EQ',
            arg1: '0',
        }
    };

    return {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.add);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.and);
            },
            b: function() {
                return Base.nop();
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
                if (instr.parsed.opd[1] == '0') {
                    instr.comments.push('link pointer is lost. (used r0)');
                } else {
                    instr.comments.push(instr.parsed.opd[1] + ' = PC + 4;');
                }
                var arg = instr.parsed.opd[0];
                if (instr.parsed.opd[0].indexOf('0x') == 0) {
                    arg = Variable.functionPointer(arg);
                }
                return Base.call(arg, []);
            },
            jmp: function(instr, context, instructions) {
                if ((instructions.length - 1) == instructions.indexOf(instr)) {
                    //name, args, is_pointer, returns, bits
                    return Base.call(instr.parsed.opd[0], [], true, 'return');
                }
                return Base.nop();
            },
            jr: function() {
                return Base.nop();
            },
            'ld.b': function(instr) {
                // ld.X 0x6c36[r4], r14
                // ["ld.X","0x6c36","r4","r14"]
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 8, true);
                }
                return load_bits(dst, src + ' + ' + addr, 8, true);
            },
            'ld.bu': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 8, false);
                }
                return load_bits(dst, src + ' + ' + addr, 8, false);
            },
            'ld.h': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 16, true);
                }
                return load_bits(dst, src + ' + ' + addr, 16, true);
            },
            'ld.hu': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 16, false);
                }
                return load_bits(dst, src + ' + ' + addr, 16, false);
            },
            'ld.w': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 32, false);
                }
                return load_bits(dst, src + ' + ' + addr, 32, false);
            },
            mov: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                return Base.assign(instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            movea: function(instr) {
                if (instr.parsed.opd[2] == '0') {
                    return Base.nop();
                }
                if (instr.parsed.opd[1] == '0') {
                    return Base.assign(instr.parsed.opd[2], instr.parsed.opd[0]);
                }
                if (instr.parsed.opd[0] == '0') {
                    return Base.assign(instr.parsed.opd[2], instr.parsed.opd[1]);
                }
                return Base.add(instr.parsed.opd[2], instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            movhi: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                var a = instr.parsed.opd[0];
                if (a.indexOf('0x') != 0) {
                    a = '0x' + parseInt(a).toString(16);
                }
                return Base.assign(instr.parsed.opd[1], a + '0000');
            },
            mul: function(instr) {
                if (instr.parsed.opd[2] == '0') {
                    return Base.nop();
                }
                //value, bits, is_signed, is_pointer, is_memory
                var n = Variable.local(instr.parsed.opd[0], 32, true);
                return Base.multiply(instr.parsed.opd[2], instr.parsed.opd[1], n);
            },
            mulh: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                return Base.multiply(instr.parsed.opd[1], instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            mulhi: function(instr) {
                if (instr.parsed.opd[2] == '0') {
                    return Base.nop();
                }
                return Base.multiply(instr.parsed.opd[2], instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            not: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                return Base.not(instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            nop: function(instr) {
                return Base.nop();
            },
            or: function(instr) {
                return _common_math(instr.parsed, Base.or);
            },
            ori: function(instr) {
                if (instr.parsed.opd[2] == '0') {
                    return Base.nop();
                }
                return Base.or(instr.parsed.opd[2], instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            satadd: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.add);
            },
            satsub: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.subtract, false);
            },
            satsubi: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.subtract, true);
            },
            satsubr: function(instr) {
                // add with previous carry
                return _common_math(instr.parsed, Base.subtract, true);
            },
            shl: function(instr) {
                return _common_math(instr.parsed, Base.shift_left);
            },
            shr: function(instr) {
                //logically shift right
                return _common_math(instr.parsed, Base.shift_right);
            },
            setf: function(instr, context) {
                var e = instr.parsed;
                if (e.opd[1] == '0') {
                    return Base.nop();
                }
                if (e.opd[0] == 'v' || e.opd[0] == 'nv') {
                    var m = new Variable.macro((e.opd[0] == 'nv' ? '!' : '') + 'IS_OVERFLOW(' + context.cond.a + ', ' + context.cond.b + ')');
                    var op = Base.conditional_assign(e.opd[1], m, null, 'CUST', '1', '0');
                    Global.context.addMarcro('#define IS_OVERFLOW(a,b) (((a<0)&&(b<0)&&(a+b>0))||((a>0)&&(b>0)&&(a+b<0)))');
                    return op;
                }
                var o = _setf_v850_cond[e.opd[0]];
                if (!o) {
                    instr.comments.push('unhandled use-case. please report it.');
                    instr.comments.push(instr.assembly);
                    return Base.nop();
                }
                return Base.conditional_assign(e.opd[1], context.cond.a, o.arg1 || context.cond.b, o.cond, '1', '0');
            },
            'sld.b': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 8, true);
                }
                return load_bits(dst, src + ' + ' + addr, 8, true);
            },
            'sld.bu': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 8, false);
                }
                return load_bits(dst, src + ' + ' + addr, 8, false);
            },
            'sld.h': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 16, true);
                }
                return load_bits(dst, src + ' + ' + addr, 16, true);
            },
            'sld.hu': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 16, false);
                }
                return load_bits(dst, src + ' + ' + addr, 16, false);
            },
            'sld.w': function(instr) {
                var addr = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var dst = instr.parsed.opd[2];
                if (src == '0') {
                    return load_bits(dst, addr, 32, false);
                }
                return load_bits(dst, src + ' + ' + addr, 32, false);
            },
            'sst.b': function(instr) {
                // st.X , r14, 0x6c36[r4]
                // ["st.X","r14","0x6c36","r4"]
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 8, true);
                }
                return store_bits(dst, src + ' + ' + addr, 8, true);
            },
            'sst.bu': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 8, false);
                }
                return store_bits(dst, src + ' + ' + addr, 8, false);
            },
            'sst.h': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 16, true);
                }
                return store_bits(dst, src + ' + ' + addr, 16, true);
            },
            'sst.hu': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 16, false);
                }
                return store_bits(dst, src + ' + ' + addr, 16, false);
            },
            'sst.w': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 32, false);
                }
                return store_bits(dst, src + ' + ' + addr, 32, false);
            },
            'st.b': function(instr) {
                // st.X , r14, 0x6c36[r4]
                // ["st.X","r14","0x6c36","r4"]
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 8, true);
                }
                return store_bits(dst, src + ' + ' + addr, 8, true);
            },
            'st.bu': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 8, false);
                }
                return store_bits(dst, src + ' + ' + addr, 8, false);
            },
            'st.h': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 16, true);
                }
                return store_bits(dst, src + ' + ' + addr, 16, true);
            },
            'st.hu': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 16, false);
                }
                return store_bits(dst, src + ' + ' + addr, 16, false);
            },
            'st.w': function(instr) {
                var dst = instr.parsed.opd[0];
                var addr = instr.parsed.opd[1];
                var src = instr.parsed.opd[2];
                if (src == '0') {
                    return store_bits(dst, addr, 32, false);
                }
                return store_bits(dst, src + ' + ' + addr, 32, false);
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            subr: function(instr) {
                return _common_math(instr.parsed, Base.subtract, true);
            },
            sxb: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                return Base.extend(instr.parsed.opd[1], instr.parsed.opd[0], 32);
            },
            sxh: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                return Base.extend(instr.parsed.opd[1], instr.parsed.opd[0], 32);
            },
            tst: function(instr, context, instructions) {
                var e = instr.parsed;
                context.cond.a = (e.opd[0] == e.opd[1]) ? e.opd[1] : "(" + e.opd[1] + " & " + e.opd[0] + ")";
                context.cond.b = '0';
                return Base.nop();
            },
            xor: function(instr) {
                return _common_math(instr.parsed, Base.xor);
            },
            xori: function(instr) {
                if (instr.parsed.opd[2] == '0') {
                    return Base.nop();
                }
                return Base.xor(instr.parsed.opd[2], instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            zxb: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                var a = Variable.local(instr.parsed.opd[0], 32, false);
                return Base.assign(instr.parsed.opd[1], a);
            },
            zxh: function(instr) {
                if (instr.parsed.opd[1] == '0') {
                    return Base.nop();
                }
                var a = Variable.local(instr.parsed.opd[0], 32, false);
                return Base.assign(instr.parsed.opd[1], a);
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(assembly) {
            var ret = assembly.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            ret = ret.trim().replace(/\br0\b/g, '0').split(' ');

            return {
                mnem: ret.shift(),
                opd: ret
            };
        },
        context: function() {
            return {
                cond: {
                    a: '?',
                    b: '?'
                },
                leave: false,
                vars: []
            };
        },
        localvars: function(context) {
            return [];
        },
        globalvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return 'void';
        }
    };
});