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

    var Variable = require('libdec/core/variable');
    var Base = require('libdec/core/base');

    const AVR_MEM_BITS = 16;
    const AVR_X_MACRONAME = 'MEM_X';
    const AVR_Y_MACRONAME = 'MEM_Y';
    const AVR_Z_MACRONAME = 'MEM_Z';
    const AVR_X_MACRO = '#define ' + AVR_X_MACRONAME + ' ((uint16_t*)((r27 << 8) | r26))';
    const AVR_Y_MACRO = '#define ' + AVR_Y_MACRONAME + ' ((uint16_t*)((r29 << 8) | r28))';
    const AVR_Z_MACRO = '#define ' + AVR_Z_MACRONAME + ' ((uint16_t*)((r31 << 8) | r30))';
    const AVR_MEMORY = {
        'x': {
            name: AVR_X_MACRONAME,
            macro: AVR_X_MACRO,
            high: 'r27',
            low: 'r26'
        },
        'y': {
            name: AVR_Y_MACRONAME,
            macro: AVR_Y_MACRO,
            high: 'r29',
            low: 'r28'
        },
        'z': {
            name: AVR_Z_MACRONAME,
            macro: AVR_Z_MACRO,
            high: 'r31',
            low: 'r30'
        }
    };
    var AVR_CTR = 0;

    var _to_16bit = function(high, low) {
        if ((high == '0x00' || high == '0') && (low == '0x00' || low == '0')) {
            return '0';
        } else if (low == '0x00' || low == '0') {
            return '(' + high + ' << 8)';
        } else if (high == '0x00' || high == '0') {
            return low;
        }
        return '(' + low + ' | (' + high + ' << 8))';
    };

    var _common_math = function(instr, op) {
        instr.setBadJump();
        var e = instr.parsed.opd;
        return op(e[0], e[0], e[1]);
    };

    var _compare = function(a, b, context) {
        context.cond.a = a;
        context.cond.b = b;
    };

    var _compare_values = function(a1, b1, a2, b2, context) {
        context.cond.a = _to_16bit(a2, a1);
        context.cond.b = _to_16bit(b2, b1);
    };

    var _compare_bytes = function(a, b, context) {
        var a1 = context.cond.a;
        var b1 = context.cond.b;
        _compare_values(a1, b1, a, b, context);
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        if (context.cond.instr) {
            context.cond.instr.valid = false;
        }
    };

    var _next_register = function(reg) {
        var num = parseInt(reg.substr(1, reg.length)) + 1;
        return 'r' + num;
    };

    var _returns_r0 = function(instr, context, inverted) {
        if (inverted && instr.parsed.opd[1] == 'r0') {
            context.returns = 'r0';
        } else if (!inverted && instr.parsed.opd[0] == 'r0') {
            context.returns = 'r0';
        }
    };

    var _conditional_next = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        var next = instructions[instructions.indexOf(instr) + 1];
        if (next) {
            instr.jump = next.location;
        }
        if (context.cond.instr) {
            context.cond.instr.valid = false;
        }
    };

    var _load16 = function(instr, context) {
        var v, m, op;
        _returns_r0(instr, context);
        var ptr = instr.parsed.opd[1];
        if (ptr.indexOf('-') >= 0) {
            ptr = ptr.replace('-', '');
            v = Variable.uniqueName('local');
            //pointer, register, bits, is_signed
            m = [
                Base.read_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[0], 8, false),
                Base.assign('uint8_t ' + v, AVR_MEMORY[ptr].low),
                Base.subtract(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1),
                Base.conditional_math(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].low, v, 'LT', AVR_MEMORY[ptr].high, 1, AVR_MEMORY[ptr].high, '-')
            ];
            op = Base.composed(m);
            Global.context.addMacro(AVR_MEMORY[ptr].macro);
            return op;
        } else if (ptr.indexOf('+') >= 0) {
            ptr = ptr.replace('+', '');
            v = Variable.uniqueName('local');
            //pointer, register, bits, is_signed
            m = [
                Base.read_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[0], 8, false),
                Base.assign('uint8_t ' + v, AVR_MEMORY[ptr].low),
                Base.add(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1),
                Base.conditional_math(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].low, v, 'LT', AVR_MEMORY[ptr].high, 1, AVR_MEMORY[ptr].high, '+')
            ];
            op = Base.composed(m);
            Global.context.addMacro(AVR_MEMORY[ptr].macro);
            return op;
        }
        //pointer, register, bits, is_signed
        op = Base.read_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[0], 8, false);
        Global.context.addMacro(AVR_MEMORY[ptr].macro);
        return op;
    };

    var _store16 = function(instr, context) {
        var v, m, op;
        instr.setBadJump();
        _returns_r0(instr, context);
        var ptr = instr.parsed.opd[0];
        if (ptr.indexOf('-') >= 0) {
            ptr = ptr.replace('-', '');
            v = Variable.uniqueName('local');
            //pointer, register, bits, is_signed
            m = [
                Base.write_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[1], 8, false),
                Base.assign('uint8_t ' + v, AVR_MEMORY[ptr].low),
                Base.subtract(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1),
                Base.conditional_math(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].low, v, 'LT', AVR_MEMORY[ptr].high, 1, AVR_MEMORY[ptr].high, '-')
            ];
            op = Base.composed(m);
            Global.context.addMacro(AVR_MEMORY[ptr].macro);
            return op;
        } else if (ptr.indexOf('+') >= 0) {
            ptr = ptr.replace('+', '');
            v = Variable.uniqueName('local');
            //pointer, register, bits, is_signed
            m = [
                Base.write_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[1], 8, false),
                Base.assign('uint8_t ' + v, AVR_MEMORY[ptr].low),
                Base.add(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1),
                Base.conditional_math(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].low, v, 'LT', AVR_MEMORY[ptr].high, 1, AVR_MEMORY[ptr].high, '+')
            ];
            op = Base.composed(m);
            Global.context.addMacro(AVR_MEMORY[ptr].macro);
            return op;
        }
        //pointer, register, bits, is_signed
        op = Base.write_memory(AVR_MEMORY[ptr].name, instr.parsed.opd[1], 8, false);
        Global.context.addMacro(AVR_MEMORY[ptr].macro);
        return op;
    };

    return {
        instructions: {
            adc: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.add);
            },
            add: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.add);
            },
            adiw: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                var b = instr.parsed.opd[1];
                var a1 = instr.parsed.opd[0];
                var a2 = _next_register(instr.parsed.opd[0]);
                _compare_values(a1, b, a2, b, context);
                context.cond.instr = instr;
                if (b == '0x00' || b == '0') {
                    return Base.nop();
                }
                var op1 = null;
                var op2 = null;
                if (b == '0x01' || b == '1') {
                    op1 = Base.increase(a1, '1');
                    op2 = Base.increase(a2, '1');
                } else {
                    op1 = Base.add(a1, a1, b);
                    op2 = Base.add(a2, a2, b);
                }
                return Base.composed([op1, op2]);
            },
            and: function(instr, context) {
                _returns_r0(instr, context);
                return _common_math(instr, Base.and);
            },
            andi: function(instr, context) {
                _returns_r0(instr, context);
                return _common_math(instr, Base.and);
            },
            asr: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.shift_right(instr.parsed.opd[0], instr.parsed.opd[0], '1');
            },
            brbc: function(instr, context) {
                _returns_r0(instr, context);
                var old_b = context.cond.b;
                context.cond.b = '0';
                _conditional(instr, context, 'NE');
                context.cond.b = old_b;
                return Base.nop();
            },
            brbs: function(instr, context) {
                _returns_r0(instr, context);
                var old_b = context.cond.b;
                context.cond.b = '(1 << ' + instr.parsed.opd[0] + ')';
                _conditional(instr, context, 'NE');
                context.cond.b = old_b;
                return Base.nop();
            },
            brcc: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'GE');
                return Base.nop();
            },
            brcs: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'LT');
                return Base.nop();
            },
            breq: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'EQ');
                return Base.nop();
            },
            brlo: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'LT');
                return Base.nop();
            },
            brlt: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'LT');
                return Base.nop();
            },
            brmi: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'LT');
                return Base.nop();
            },
            brne: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'NE');
                return Base.nop();
            },
            brpl: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'GT');
                return Base.nop();
            },
            brsh: function(instr, context) {
                _returns_r0(instr, context);
                _conditional(instr, context, 'LE');
                return Base.nop();
            },
            bset: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.macro('SREG_SET_BIT (' + instr.parsed.opd[0] + ')', '#define SREG_SET_BIT(x) __asm(bset (x))');
            },
            call: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                //name, args, is_pointer, returns, bits
                if (instr.parsed.opd[0].indexOf('0x') == 0) {
                    return Base.call(Variable.functionPointer(instr.parsed.opd[0], 16), []);
                }
                return Base.call(instr.parsed.opd[0], []);
            },
            cli: function(instr) {
                instr.setBadJump();
                return Base.macro('DISABLE_INTERRUPTS', '#define DISABLE_INTERRUPTS __asm(cli)');
            },
            clr: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.assign(instr.parsed.opd[0], '0');
            },
            clt: function(instr) {
                instr.setBadJump();
                return Base.macro('CLEAR_TRANSFER_FLAG', '#define CLEAR_TRANSFER_FLAG __asm(clt)');
            },
            com: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.subtract(instr.parsed.opd[0], '0xff', instr.parsed.opd[0]);
            },
            cp: function(instr, context) {
                instr.setBadJump();
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return Base.nop();
            },
            cpc: function(instr, context, instructions) {
                instr.setBadJump();
                var p = instructions.indexOf(instr);
                if (instructions[p - 1] && instructions[p - 1].parsed.mnem.indexOf('cp') == 0) {
                    _compare_bytes(instr.parsed.opd[0], instr.parsed.opd[1], context);
                } else {
                    _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                }
                context.cond.instr = instr;
                return Base.nop();
            },
            cpi: function(instr, context) {
                instr.setBadJump();
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return Base.nop();
            },
            dec: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                _compare('--' + instr.parsed.opd[0], '0', context);
                context.cond.instr = instr;
                return Base.decrease(instr.parsed.opd[0], '1');
            },
            eor: function(instr, context) {
                _returns_r0(instr, context);
                return _common_math(instr, Base.xor);
            },
            icall: function(instr, context) {
                _returns_r0(instr, context);
                instr.setBadJump();
                //name, args, is_pointer, returns, bits
                var op = Base.call(Variable.functionPointer(AVR_MEMORY.z.name), []);
                Global.context.addMacro(AVR_MEMORY.z.macro);
                return op;
            },
            ijmp: function(instr, context) {
                _returns_r0(instr, context);
                instr.setBadJump();
                var op = Base.goto(AVR_MEMORY.z.name);
                Global.context.addMacro(AVR_MEMORY.z.macro);
                return op;
            },
            in: function(instr, context) {
                _returns_r0(instr, context);
                var e = instr.parsed.opd;
                return Base.macro('READ_FROM_IO (' + e[1] + ', ' + e[0] + ')', '#define READ_FROM_IO(x,y) __asm(in (y), (x))');
            },
            inc: function(instr, context) {
                _returns_r0(instr, context);
                _compare('++' + instr.parsed.opd[0], '0', context);
                context.cond.instr = instr;
                return Base.increase(instr.parsed.opd[0], '1');
            },
            iret: function(instr) {
                return Base.macro('RETURN_FROM_INTERRUPT', '#define RETURN_FROM_INTERRUPT __asm(iret)');
            },
            jmp: function(instr, context) {
                return Base.nop();
            },
            ld: _load16,
            ldd: function(instr, context) {
                _returns_r0(instr, context);
                var ptr = instr.parsed.opd[1].match(/([xyz]|[+-0-9]+)/g);
                var offset = ptr[1].replace(/(-)/, ' - ').replace(/(\+)/, ' + ');
                //pointer, register, bits, is_signed
                var op = Base.read_memory(AVR_MEMORY[ptr[0]].name + offset, instr.parsed.opd[0], 8, false);
                Global.context.addMacro(AVR_MEMORY[ptr[0]].macro);
                return op;
            },
            ldi: function(instr, context) {
                _returns_r0(instr, context);
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            lds: function(instr, context) {
                _returns_r0(instr, context);
                //pointer, register, bits, is_signed
                return Base.read_memory(instr.parsed.opd[1], instr.parsed.opd[0], 8, false);
            },
            lpm: _load16,
            lsl: function(instr, context) {
                _returns_r0(instr, context);
                return Base.shift_left(instr.parsed.opd[0], instr.parsed.opd[0], '1');
            },
            lsr: function(instr, context) {
                _returns_r0(instr, context);
                return Base.shift_right(instr.parsed.opd[0], instr.parsed.opd[0], '1');
            },
            mov: function(instr, context) {
                _returns_r0(instr, context);
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            movw: function(instr, context) {
                _returns_r0(instr, context);
                var a1 = instr.parsed.opd[0];
                var a2 = _next_register(instr.parsed.opd[0]);
                var b1 = instr.parsed.opd[1];
                var b2 = _next_register(instr.parsed.opd[1]);
                var op1 = Base.assign(a1, b1);
                var op2 = Base.assign(a2, b2);
                return Base.composed([op1, op2]);
            },
            mul: function(instr, context) {
                context.returns = 'r0';
                var name = 'value' + (++AVR_CTR);
                var ops = [];
                ops.push(Base.multiply('uint16_t ' + name, instr.parsed.opd[0], instr.parsed.opd[1]));
                ops.push(Base.assign('r0', '(' + name + ' & 0xFF)'));
                ops.push(Base.assign('r1', '(' + name + ' >> 8)'));
                return Base.composed(ops);
            },
            muls: function(instr, context) {
                context.returns = 'r0';
                var name = 'value' + (++AVR_CTR);
                var ops = [];
                ops.push(Base.multiply('int16_t ' + name, instr.parsed.opd[0], instr.parsed.opd[1]));
                ops.push(Base.assign('r0', '(' + name + ' & 0xFF)'));
                ops.push(Base.assign('r1', '(' + name + ' >> 8)'));
                return Base.composed(ops);
            },
            mulsu: function(instr, context) {
                context.returns = 'r0';
                var name = 'value' + (++AVR_CTR);
                var ops = [];
                ops.push(Base.multiply('uint16_t ' + name, instr.parsed.opd[0], instr.parsed.opd[1]));
                ops.push(Base.assign('r0', '(' + name + ' & 0xFF)'));
                ops.push(Base.assign('r1', '(' + name + ' >> 8)'));
                return Base.composed(ops);
            },
            neg: function(instr, context) {
                _returns_r0(instr, context);
                return Base.negate(instr.parsed.opd[0], instr.parsed.opd[0]);
            },
            nop: function(instr) {
                instr.setBadJump();
                return Base.nop();
            },
            not: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.not(instr.parsed.opd[0], instr.parsed.opd[0]);
            },
            or: function(instr, context) {
                _returns_r0(instr, context);
                return _common_math(instr, Base.or);
            },
            ori: function(instr, context) {
                _returns_r0(instr, context);
                return _common_math(instr, Base.or);
            },
            out: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context, true);
                var e = instr.parsed.opd;
                return Base.macro('WRITE_TO_IO (' + e[0] + ', ' + e[1] + ')', '#define WRITE_TO_IO(x,y) __asm(in (x), (y))');
            },
            pop: function(instr, context) {
                instr.setBadJump();
                if (instr.parsed.opd[0] == 'r0') {
                    // if pops an r0, then the return value is void.
                    context.returns = null;
                }
                return Base.nop();
            },
            push: function(instr, context) {
                instr.setBadJump();
                return Base.nop();
            },
            rcall: function(instr, context) {
                _returns_r0(instr, context);
                return Base.call(Variable.functionPointer(instr.parsed.opd[0], AVR_MEM_BITS), []);
            },
            ret: function(instr, context) {
                _returns_r0(instr, context);
                // returns r1:r0
                // but if pop r0 then return void.
                return Base.return(context.returns);
            },
            reti: function(instr) {
                return Base.macro('RETURN_FROM_INTERRUPT', '#define RETURN_FROM_INTERRUPT __asm(reti)');
            },
            rjmp: function(instr, context) {
                _returns_r0(instr, context);
                return Base.nop();
            },
            rol: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.rotate_left(instr.parsed.opd[0], instr.parsed.opd[0], '1', 8);
            },
            ror: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.rotate_right(instr.parsed.opd[0], instr.parsed.opd[0], '1', 8);
            },
            sbc: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.subtract);
            },
            sbci: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.subtract);
            },
            sbiw: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                var b = instr.parsed.opd[1];
                var a1 = instr.parsed.opd[0];
                var a2 = _next_register(instr.parsed.opd[0]);
                _compare_values(a1, b, a2, b, context);
                context.cond.instr = instr;
                if (b == '0x00' || b == '0') {
                    return Base.nop();
                }
                var op1 = null;
                var op2 = null;
                if (b == '0x01' || b == '1') {
                    op1 = Base.decrease(a1, '1');
                    op2 = Base.decrease(a2, '1');
                } else {
                    op1 = Base.subtract(a1, a1, b);
                    op2 = Base.subtract(a2, a2, b);
                }
                return Base.composed([op1, op2]);
            },
            sbr: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.or(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            sbrc: function(instr, context, instructions) {
                instr.setBadJump();
                var next = instructions[instructions.indexOf(instr) + 1];
                if (next) {
                    _compare('(' + instr.parsed.opd[0] + ' & (1 << ' + instr.parsed.opd[1] + '))', '0', context);
                    context.cond.instr = instr;
                    _conditional_next(next, context, instructions, 'EQ');
                    return Base.or(instr.parsed.opd[0], instr.parsed.opd[1]);
                }
                return Base.nop();
            },
            sei: function(instr) {
                instr.setBadJump();
                return Base.macro('ENABLE_INTERRUPTS', '#define ENABLE_INTERRUPTS __asm(sei)');
            },
            ser: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.assign(instr.parsed.opd[0], '0xff');
            },
            set: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                return Base.macro('SET_TRANSFER_FLAG', '#define SET_TRANSFER_FLAG __asm(set)');
            },
            st: _store16,
            std: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                var ptr = instr.parsed.opd[0].match(/([xyz]|[+-0-9]+)/g);
                var offset = ptr[1].replace(/(-)/, ' - ').replace(/(\+)/, ' + ');
                //pointer, register, bits, is_signed
                var op = Base.write_memory(AVR_MEMORY[ptr[0]].name + offset, instr.parsed.opd[1], 8, false);
                Global.context.addMacro(AVR_MEMORY[ptr[0]].macro);
                return op;
            },
            sts: function(instr, context) {
                instr.setBadJump();
                _returns_r0(instr, context);
                //pointer, register, bits, is_signed
                return Base.write_memory(instr.parsed.opd[0], instr.parsed.opd[1], 8, false);
            },
            sub: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.subtract);
            },
            subi: function(instr, context) {
                _returns_r0(instr, context);
                _compare(instr.parsed.opd[0], instr.parsed.opd[1], context);
                context.cond.instr = instr;
                if (instr.parsed.opd[1] == '0x00' || instr.parsed.opd[1] == '0') {
                    instr.setBadJump();
                    return Base.nop();
                }
                return _common_math(instr, Base.subtract);
            },
            tst: function(instr, context) {
                instr.setBadJump();
                _compare(instr.parsed.opd[0], '0', context);
                context.cond.instr = instr;
            },
            wdr: function(instr, context) {
                instr.setBadJump();
                return Base.macro('CLEAR_WATCHDOG', '#define CLEAR_WATCHDOG __asm(wdr)');
            },
            invalid: function(instr) {
                instr.setBadJump();
                return Base.nop();
            }
        },
        parse: function(asm) {
            var ret = asm.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            ret = ret.trim().replace(/0x00/, '0').split(' ');

            return {
                mnem: ret.shift(),
                opd: ret
            };
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null,
                    instr: null
                },
                returns: null
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
            return context.returns == null ? 'void' : 'uint8_t';
        }
    };
});