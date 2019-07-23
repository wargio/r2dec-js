/* 
 * Copyright (C) 2019 deroad
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
    // https://www.rockbox.org/wiki/pub/Main/DataSheets/sh1_2p.pdf
    // http://www.shared-ptr.com/sh_insns.html


    const Instruction = require('libdec/core/instruction');
    const Base = require('libdec/core/base');
    const Variable = require('libdec/core/variable');
    //const Extra = require('libdec/core/extra');

    const _s = 's';
    const _carry = 'c';
    const _mac = 'mac';

    const _size_map = {
        "b": 8,
        "w": 16,
        "l": 32
    };

    const _compare_map = {
        'eq': 'EQ',
        'hi': 'GT',
        'hs': 'GE',
        'ge': 'GE',
        'gt': 'GT',
        'pl': 'GT',
        'pz': 'GE',
        'str': 'str',
    };

    const _reverse_map = {
        'EQ': 'NE',
        'GT': 'LE',
        'GE': 'LT',
    };

    const _branch_list = [
        'bra',
        'braf',
        'bsr',
        'bsrf',
        'jmp',
        'jsr',
        'rte',
        'rts'
    ];

    function _set_conditional(instr, context, cmp, invert) {
        if (invert) {
            cmp = _reverse_map[cmp];
        }
        instr.conditional(context.cond.a, context.cond.b, cmp);
        return Base.nop();
    }

    function _require_composed(instr, idx) {
        var e = instr.parsed;
        return e.opd[idx].increment || e.opd[idx].decrement;
    }

    function _handle_pointer(instr, idx, ops) {
        var e = instr.parsed;
        var size = e.size || 32;
        if (e.opd[idx].increment) {
            ops.push(Base.increase(e.opd[idx].token, size / 8));
        } else if (e.opd[idx].decrement) {
            ops.unshift(Base.decrease(e.opd[idx].token, size / 8));
        }
    }

    function _arg(instr, idx) {
        var e = instr.parsed;
        if (e.opd[idx].pointer) {
            // a great way to fix PC + N
            if (e.opd[idx].token.startsWith('pc +')) {
                var n = parseInt(e.opd[idx].token.substr('pc +'.length));
                var p = instr.location.add(n);
                e.opd[idx].token = '0x' + p.toString(16);
            }
            return Variable.pointer(e.opd[idx].toString(), e.size || 32, true);
        }
        return e.opd[idx].toString();
    }

    function _op_move(instr) {
        var ops = [];
        var dst = _arg(instr, 0);
        var src = _arg(instr, 1);
        if (instr.parsed.size) {
            ops.push(Base.cast(dst, src, 'int' + instr.parsed.size + '_t'));
        } else {
            ops.push(Base.assign(dst, src));
        }
        if (_require_composed(instr, 0) || _require_composed(instr, 1)) {
            if (_require_composed(instr, 0)) {
                _handle_pointer(instr, 0, ops);
            } else {
                _handle_pointer(instr, 1, ops);
            }
            return Base.composed(ops);
        }
        return ops[0];
    }

    return {
        instructions: {
            mov: _op_move,
            mova: _op_move,
            movt: function(instr, context, instructions) {
                instr.parsed.opd[0].token = _carry;
                return _op_move(instr);
            },
            swap: function(instr, context, instructions) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.swap(dst, src);
            },
            /*
            xtrct: function(instr, context, instructions) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.?????(dst, src);
            },
             */
            add: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.add(dst, dst, src);
            },
            addc: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.add(dst, dst, src + ' + ' + _carry);
            },
            addv: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                instr.comments.push('if overflows, then ' + _carry + ' = 1.');
                return Base.add(dst, dst, src + ' + ' + _carry);
            },
            cmp: function(instr, context) {
                var a = _arg(instr, 0);
                var b = _arg(instr, 1);
                if (instr.parsed.cmp != 'str') {
                    context.cond.a = a;
                    context.cond.b = b;
                    context.cond.cmp = instr.parsed.cmp;
                } else {
                    context.cond.a = (a === b) ? a : '(' + a + ' & ' + b + ')';
                    context.cond.b = '0';
                    context.cond.cmp = 'EQ';
                }
            },
            tst: function(instr, context) {
                var a = _arg(instr, 0);
                var b = _arg(instr, 1);
                context.cond.a = (a === b) ? a : '(' + a + ' & ' + b + ')';
                context.cond.b = '0';
                context.cond.cmp = 'EQ';
            },
            div1: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.divide(dst, dst, src);
            },
            dmuls: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.multiply(dst, dst, src);
            },
            dt: function(instr) {
                var dst = _arg(instr, 1);
                return Base.decrease(dst, dst, 1);
            },
            exts: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.cast(dst, src, 'int' + instr.parsed.size + '_t');
            },
            extu: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.cast(dst, src, 'uint' + instr.parsed.size + '_t');
            },
            mul: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.multiply(_mac, dst, src);
            },
            muls: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.multiply(_mac, dst, src);
            },
            mulu: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.multiply(_mac, dst, src);
            },
            neg: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.negate(dst, src);
            },
            negc: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.composed([
                    Base.negate(dst, src),
                    Base.subtract(dst, dst, _carry),
                ]);
            },
            sub: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.subtract(dst, dst, src);
            },
            subc: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.composed([
                    Base.subtract(dst, dst, src),
                    Base.subtract(dst, dst, _carry),
                ]);
            },
            subv: function(instr) {
                instr.comments.push('if underflows, then ' + _carry + ' = 1.');
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.subtract(dst, dst, src);
            },
            and: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.and(dst, dst, src);
            },
            not: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.not(dst, src);
            },
            or: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.or(dst, dst, src);
            },
            xor: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.xor(dst, dst, src);
            },
            rotl: function(instr) {
                var src = _arg(instr, 1);
                return Base.rotate_left(src, src, 1, 32);
            },
            rotr: function(instr) {
                var src = _arg(instr, 1);
                return Base.rotate_right(src, src, 1, 32);
            },
            rotcl: function(instr) {
                var src = _arg(instr, 1);
                return Base.rotate_left(src, src, 1, 32);
            },
            rotcr: function(instr) {
                var src = _arg(instr, 1);
                return Base.rotate_right(src, src, 1, 32);
            },
            shal: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_left(src, src, 1);
            },
            shar: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_right(src, src, 1);
            },
            shll: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_left(src, src, 1);
            },
            shlr: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_right(src, src, 1);
            },
            shll2: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_left(src, src, 2);
            },
            shlr2: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_right(src, src, 2);
            },
            shll8: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_left(src, src, 8);
            },
            shlr8: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_right(src, src, 8);
            },
            shll16: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_left(src, src, 16);
            },
            shlr16: function(instr) {
                var src = _arg(instr, 1);
                return Base.shift_right(src, src, 16);
            },
            ldc: _op_move,
            lds: _op_move,
            stc: _op_move,
            sts: _op_move,
            clrt: function(instr) {
                return Base.assign(_carry, '0');
            },
            clrs: function(instr) {
                return Base.assign(_s, '0');
            },
            sett: function(instr) {
                return Base.assign(_carry, '1');
            },
            sets: function(instr) {
                return Base.assign(_s, '1');
            },
            fmov: _op_move,
            flds: _op_move,
            fsts: _op_move,
            fldi0: function(instr) {
                var src = _arg(instr, 1);
                return Base.assign(src, '0.0');
            },
            fldi1: function(instr) {
                var src = _arg(instr, 1);
                return Base.assign(src, '1.0');
            },
            fabs: function(instr) {
                var src = _arg(instr, 1);
                return Base.and(src, src, '0x7FFFFFFF');
            },
            fneg: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.negate(dst, src);
            },
            fadd: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.add(dst, dst, src);
            },
            fsub: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.subtract(dst, dst, src);
            },
            fmul: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.multiply(dst, dst, src);
            },
            fdiv: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.divide(dst, dst, src);
            },
            fsqrt: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.assign(dst, Base.call('sqrt', [src]));
            },
            fcmp: function(instr, context) {
                var a = _arg(instr, 0);
                var b = _arg(instr, 1);
                context.cond.a = a;
                context.cond.b = b;
                context.cond.cmp = instr.parsed.cmp;
            },
            float: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.cast(dst, src, 'float');
            },
            ftrc: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.cast(dst, src, 'int32_t');
            },
            fsrra: function(instr) {
                var dst = _arg(instr, 0);
                var src = _arg(instr, 1);
                return Base.special(dst + ' = 1.0 / sqrt (' + src + ')');
            },
            fsca: function(instr) {
                var dst1 = _arg(instr, 0);
                var dst2 = 'fr' + (parseInt(dst1.substr(2)) + 1).toString(16);
                var src = _arg(instr, 1);
                return Base.composed([
                    Base.assign(dst1, Base.call('sin', [src])),
                    Base.assign(dst2, Base.call('cos', [src]))
                ]);
            },
            bt: function(instr, context, instructions) {
                return _set_conditional(instr, context, 'EQ');
            },
            bf: function(instr, context, instructions) {
                return _set_conditional(instr, context, 'NE');
            },
            jsr: function(instr, context, instructions) {
                var e = instr.parsed.opd;
                return Base.call(Variable.functionPointer(e[1].token), []);
            },
            bra: function(instr) {
                var callname = _arg(instr, 1);
                if (callname.startsWith('0x')) {
                    callname = Variable.functionPointer(callname);
                }
                return Base.call(callname, []);
            },
            braf: function(instr) {
                var src = _arg(instr, 1);
                return Base.call(Variable.functionPointer(src), []);
            },
            rte: function() {
                return Base.return();
            },
            rts: function() {
                return Base.return();
            },
            nop: function() {
                return Base.nop();
            },
            invalid: function(instr, context, instructions) {
                return Base.nop();
            }
        },
        parse: function(assembly) {
            assembly = assembly.trim().toLowerCase();
            assembly = assembly.replace(/,/g, ' ');
            assembly = assembly.replace(/\s+/g, ' ');

            /*
               Regex explaination:
                ^
                  (\w+)
                  \.?
                  ([wlb])? // word/long/byte
                  ([sn])?  // delayed branch
                  \/?
                  (hi|eq|hs|pl|pz|str)? // compare flags
                   ?       // space might not exists (aka no 1st and 2nd param)
                  (
                    (
                        (@)? // Indirect or Direct access
                        (
                            (\(\w+\s\w+\)) A + B value
                              |
                                (-)?  Pre-decrement
                                ([\w._]+) register
                                (\+)? Post-increment
                        )
                    )
                  )?
                   ?       // space might not exists (aka no 2nd param)
                  (
                    (
                        (@)? // Indirect or Direct access
                        (
                            (\(\w+\s\w+\)) A + B value
                              |
                                (-)?  Pre-decrement
                                ([\w._]+) register
                                (\+)? Post-increment
                        )
                    )
                  )?
                $
            */
            var tokens = assembly.match(/^(\w+)\.?([wlb])?([sn])?\/?(hi|eq|hs|pl|pz|str)? ?(((@)?((\(\w+\s\w+\))|(-)?([\w._]+)(\+)?)))? ?(((@)?((\(\w+\s\w+\))|(-)?([\w._]+)(\+)?)))?$/);
            var mnem = tokens[1];
            var size = _size_map[tokens[2]];
            var delayed = tokens[3] == 's';
            var cmp = _compare_map[tokens[4]];
            var opd = [{
                pointer: tokens[7] == '@',
                decrement: tokens[10] == '-',
                increment: tokens[12] == '+',
                token: tokens[11] || (tokens[9] ? tokens[9].replace(/\((\w+)\s(\w+)\)/g, '$2 + $1') : null),
                toString: function() {
                    return this.token || '(null)';
                }
            }, {
                pointer: tokens[15] == '@',
                decrement: tokens[18] == '-',
                increment: tokens[20] == '+',
                token: tokens[19] || (tokens[17] ? tokens[17].replace(/\((\w+)\s(\w+)\)/g, '$2 + $1') : null),
                toString: function() {
                    return this.token || '(null)';
                }
            }];

            return {
                mnem: mnem,
                delayed: delayed,
                cmp: cmp,
                size: size,
                opd: opd.reverse()
            };
        },
        context: function() {
            return {
                cond: {
                    cmp: null,
                    a: '?',
                    b: '?'
                }
            };
        },
        preanalisys: function(instructions, context) {
            /* delayed branch fix */
            for (var i = 0; i < (instructions.length - 1); i++) {
                var op = instructions[i].parsed.mnem;
                if (_branch_list.indexOf(op) >= 0 && instructions[i + 1].parsed.mnem != 'nop') {
                    Instruction.swap(instructions, i, i + 1);
                    ++i;
                } else if (instructions[i].parsed.delayed && instructions[i + 1].parsed.mnem != 'nop') {
                    Instruction.swap(instructions, i, i + 1);
                    ++i;
                }
            }
        },
        postanalisys: function(instructions, context) {},
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