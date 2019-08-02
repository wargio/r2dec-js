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
    const Base = require('libdec/core/base');
    const Variable = require('libdec/core/variable');
    //const Extra = require('libdec/core/extra');
    const _REG = {
        X: 'x',
        Y: 'y',
        stackptr: 'SP',
        accumulator: 'acc',
        carry: 'C',
        overflow: 'V',
        decimal: 'D',
        interrupt: 'I',
        zero: 'Z',
    };

    function _arg(instr, idx) {
        var o = instr.parsed.opd;
        if (idx > 0) {
            return o[idx];
        }
        o = o[0];
        if (o.immediate) {
            return o.token;
        }
        return Variable.pointer(o.token, 16, false);
    }

    function _math(op, instr, bits) {
        var srcA = _arg(instr, 0);
        var srcB = _arg(instr, 1);
        if (!srcB) {
            return op(_REG.accumulator, _REG.accumulator, srcA, bits);
        }
        return Base.composed([
            op(_REG.accumulator, _REG.accumulator, srcA, bits),
            Base.add(_REG.accumulator, _REG.accumulator, srcB),
        ]);
    }

    function _math_rotate(op, instr, bits) {
        var srcA = _arg(instr, 0);
        var srcB = _arg(instr, 1);
        if (!srcB) {
            // destination, source_a, source_b, bits
            return op(_REG.accumulator, srcA, bits, 16);
        }
        return Base.composed([
            op(_REG.accumulator, srcA, bits, 16),
            Base.add(_REG.accumulator, _REG.accumulator, srcB),
        ]);
    }

    function _load(instr, register, bits) {
        bits = bits || 16;
        register = register || _REG.accumulator;
        var srcA = _arg(instr, 0);
        var srcB = _arg(instr, 1);
        var ops = [];
        if (typeof srcA == "string") {
            // pointer, register, bits, is_signed
            ops.push(Base.read_memory(register, register, srcA, bits));
        } else {
            ops.push(Base.assign(register, srcA));
        }
        if (!srcB) {
            return ops[0];
        }
        ops.push(Base.add(register, register, srcB));
        return Base.composed(ops);
    }

    function _store(instr, register, bits) {
        bits = bits || 16;
        register = register || _REG.accumulator;
        var srcA = _arg(instr, 0);
        var srcB = _arg(instr, 1);
        var ops = [];
        if (typeof srcA == "string") {
            // pointer, register, bits, is_signed
            ops.push(Base.write_memory(register, register, srcA, bits));
        } else {
            ops.push(Base.assign(srcA, register));
        }
        if (!srcB) {
            return ops[0];
        }
        ops.push(Base.add(register, register, srcB));
        return Base.composed(ops);
    }

    function _nop(instr, context, instructions) {
        return Base.nop();
    }

    return {
        instructions: {
            adc: function(instr) {
                return _math(Base.add, instr);
            },
            and: function(instr) {
                return _math(Base.and, instr);
            },
            asl: function(instr) {
                return _math(Base.shift_left, instr, 1);
            },
            bit: function(instr, context) {
                var p = _arg(instr, 0);
                context.cond.a = '(' + _REG.accumulator + ' & ' + p + ')';
                context.cond.b = '0';
                return Base.nop();
            },
            bcc: function(instr, context) {
                instr.conditional(_REG.carry, 0, 'EQ');
                return Base.nop();
            },
            bcs: function(instr, context) {
                instr.conditional(_REG.carry, 0, 'NE');
                return Base.nop();
            },
            beq: function(instr, context) {
                instr.conditional(context.cond.a, context.cond.b, 'EQ');
                return Base.nop();
            },
            bmi: function(instr, context) {
                instr.conditional(context.cond.a, context.cond.b, 'LT');
                return Base.nop();
            },
            bne: function(instr, context) {
                instr.conditional(context.cond.a, context.cond.b, 'NE');
                return Base.nop();
            },
            bpl: function(instr, context) {
                instr.conditional(context.cond.a, context.cond.b, 'GT');
                return Base.nop();
            },
            brk: function(instr, context) {
                Global.context.addMacro('#define INTERRUPT() __asm(brk)');
                return Base.call(Variable.macro('INTERRUPT'), []);
            },
            bvc: function(instr, context) {
                instr.conditional(_REG.overflow, 0, 'EQ');
                return Base.nop();
            },
            bvs: function(instr, context) {
                instr.conditional(_REG.overflow, 0, 'NE');
                return Base.nop();
            },
            clc: function(instr, context) {
                return Base.assign(_REG.carry, '0');
            },
            cld: function(instr, context) {
                return Base.assign(_REG.decimal, '0');
            },
            cli: function(instr, context) {
                return Base.assign(_REG.interrupt, '0');
            },
            clv: function(instr, context) {
                return Base.assign(_REG.overflow, '0');
            },
            cmp: function(instr, context) {
                instr.setBadJump();
                context.cond.a = _REG.accumulator;
                var srcA = _arg(instr, 0);
                var srcB = _arg(instr, 1);
                if (!srcB) {
                    context.cond.b = srcA;
                    return Base.nop();
                }
                var v = Variable.uniqueName();
                context.cond.b = v;
                return Base.add(v, srcA, srcB);
            },
            cpx: function(instr, context) {
                instr.setBadJump();
                context.cond.a = _REG.X;
                context.cond.b = _arg(instr, 0);
                return Base.nop();
            },
            cpy: function(instr, context) {
                instr.setBadJump();
                context.cond.a = _REG.Y;
                context.cond.b = _arg(instr, 0);
                return Base.nop();
            },
            dec: function(instr, context) {
                var p = _arg(instr, 0);
                context.cond.a = p;
                context.cond.b = '0';
                return Base.subtract(p, p, 1);
            },
            dex: function(instr, context) {
                context.cond.a = _REG.X;
                context.cond.b = '0';
                return Base.subtract(_REG.X, _REG.X, 1);
            },
            dey: function(instr, context) {
                context.cond.a = _REG.Y;
                context.cond.b = '0';
                return Base.subtract(_REG.Y, _REG.Y, 1);
            },
            eor: function(instr, context) {
                return _math(Base.xor, instr);
            },
            inc: function(instr, context) {
                var p = _arg(instr, 0);
                context.cond.a = p;
                context.cond.b = '0';
                return Base.add(p, p, 1);
            },
            inx: function(instr, context) {
                context.cond.a = _REG.X;
                context.cond.b = '0';
                return Base.add(_REG.X, _REG.X, 1);
            },
            iny: function(instr, context) {
                context.cond.a = _REG.Y;
                context.cond.b = '0';
                return Base.add(_REG.Y, _REG.Y, 1);
            },
            jmp: _nop,
            jsr: function(instr) {
                var p = instr.parsed.opd[0].token;
                if (p.startsWith('0x')) {
                    p = Variable.functionPointer(p);
                }
                return Base.call(p);
            },
            lda: function(instr, context) {
                context.cond.a = _REG.accumulator;
                context.cond.b = '0';
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(_REG.accumulator, instr.parsed.opd[0].token.replace(/^sym\./, ''));
                }
                return _load(instr, _REG.accumulator, 16);
            },
            ldx: function(instr, context) {
                context.cond.a = _REG.X;
                context.cond.b = '0';
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(_REG.X, instr.parsed.opd[0].token.replace(/^sym\./, ''));
                }
                return _load(instr, _REG.X, 16);
            },
            ldy: function(instr, context) {
                context.cond.a = _REG.Y;
                context.cond.b = '0';
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(_REG.Y, instr.parsed.opd[0].token.replace(/^sym\./, ''));
                }
                return _load(instr, _REG.Y, 16);
            },
            lsr: function(instr) {
                return _math(Base.shift_right, instr, 1);
            },
            ora: function(instr, context) {
                return _math(Base.xor, instr);
            },
            pha: _nop,
            php: _nop,
            pla: _nop,
            plp: _nop,
            rol: function(instr) {
                return _math_rotate(Base.rotate_left, instr, 1);
            },
            ror: function(instr) {
                return _math_rotate(Base.rotate_right, instr, 1);
            },
            rti: function(instr) {
                return Base.return();
            },
            rts: function(instr) {
                return Base.return();
            },
            sbc: function(instr) {
                return _math(Base.subtract, instr);
            },
            sec: function(instr, context) {
                return Base.assign(_REG.carry, 1);
            },
            sed: function(instr, context) {
                return Base.assign(_REG.decimal, 1);
            },
            sei: function(instr, context) {
                return Base.assign(_REG.interrupt, 1);
            },
            sta: function(instr) {
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(instr.parsed.opd[0].token.replace(/^sym\./, ''), _REG.accumulator);
                }
                return _store(instr, _REG.accumulator, 16);
            },
            stx: function(instr) {
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(instr.parsed.opd[0].token.replace(/^sym\./, ''), _REG.X);
                }
                return _store(instr, _REG.X, 16);
            },
            sty: function(instr) {
                var o = instr.parsed.opd[0];
                if (o.token.startsWith('sym.') || o.immediate) {
                    return Base.assign(instr.parsed.opd[0].token.replace(/^sym\./, ''), _REG.Y);
                }
                return _store(instr, _REG.Y, 16);
            },
            tax: function(instr, context) {
                context.cond.a = _REG.X;
                context.cond.b = '0';
                return Base.assign(_REG.X, _REG.accumulator);
            },
            tay: function(instr, context) {
                context.cond.a = _REG.Y;
                context.cond.b = '0';
                return Base.assign(_REG.Y, _REG.accumulator);
            },
            tsx: function(instr, context) {
                context.cond.a = _REG.X;
                context.cond.b = '0';
                return Base.assign(_REG.X, _REG.stackptr);
            },
            txs: function(instr, context) {
                return Base.assign(_REG.stackptr, _REG.X);
            },
            txa: function(instr, context) {
                context.cond.a = _REG.accumulator;
                context.cond.b = '0';
                return Base.assign(_REG.accumulator, _REG.X);
            },
            tya: function(instr, context) {
                context.cond.a = _REG.accumulator;
                context.cond.b = '0';
                return Base.assign(_REG.accumulator, _REG.Y);
            },
            nop: _nop,
            invalid: _nop
        },
        parse: function(assembly) {
            var tokens = assembly.trim().match(/^([\w]+) ?(#)?(\()?((0x[\da-fA-F]+)|([a-zA-Z0-9._]+))?(\))?(,([\w]+))?\)?$/);
            var opds = [];
            if (tokens[5] || tokens[6]) {
                var token = tokens[5] || tokens[6];
                if (tokens[3] == '(' && tokens[7] == ')' && tokens[9]) {
                    token += ' + ' + tokens[9];
                }
                opds.push({
                    immediate: tokens[2] == '#',
                    pointer: tokens[3] == '(',
                    token: token,
                });
            }
            if (tokens[9] && tokens[3] == '(' && tokens[7] != ')') {
                opds.push(tokens[9]);
            }
            return {
                mnem: tokens[1],
                opd: opds
            };
        },
        context: function() {
            return {
                cond: {
                    a: _REG.accumulator,
                    b: '?',
                }
            };
        },
        preanalisys: function(instructions, context) {},
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