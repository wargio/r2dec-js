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

    var Base = require('libdec/arch/base');
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
        var e = instr.parsed;
        return op(e[1], e[1], e[2]);
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
        context.cond.instr.valid = false;
    };

    var _next_register = function(reg) {
        var num = parseInt(reg.substr(1, reg.length)) + 1;
        return 'r' + num;
    };

    return {
        instructions: {
            adc: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.instructions.add);
            },
            add: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.instructions.add);
            },
            adiw: function(instr, context) {
                var b = instr.parsed[2];
                var a1 = instr.parsed[1];
                var a2 = _next_register(instr.parsed[1]);
                _compare_values(a1, b, a2, b, context);
                context.cond.instr = instr;
                if (b == '0x00' || b == '0') {
                    return Base.instructions.nop();
                }
                var op1 = null;
                var op2 = null;
                if (b == '0x01' || b == '1') {
                    op1 = Base.instructions.increase(a1, '1');
                    op2 = Base.instructions.increase(a2, '1');
                } else {
                    op1 = Base.instructions.add(a1, a1, b);
                    op2 = Base.instructions.add(a2, a2, b);
                }
                return Base.composed([op1, op2]);
            },
            and: function(instr, context) {
                return _common_math(instr, Base.instructions.and);
            },
            andi: function(instr, context) {
                return _common_math(instr, Base.instructions.and);
            },
            asr: function(instr) {
                return Base.instructions.shift_right(instr.parsed[1], instr.parsed[1], '1');
            },
            brbc: function(instr, context) {
                var old_b = context.cond.b;
                context.cond.b = '0';
                _conditional(instr, context, 'NE');
                context.cond.b = old_b;
                return Base.instructions.nop();
            },
            brbs: function(instr, context) {
                var old_b = context.cond.b;
                context.cond.b = '(1 << ' + instr.parsed[1] + ')';
                _conditional(instr, context, 'NE');
                context.cond.b = old_b;
                return Base.instructions.nop();
            },
            brcc: function(instr, context) {
                _conditional(instr, context, 'LT');
                return Base.instructions.nop();
            },
            brcs: function(instr, context) {
                _conditional(instr, context, 'GE');
                return Base.instructions.nop();
            },
            breq: function(instr, context) {
                _conditional(instr, context, 'NE');
                return Base.instructions.nop();
            },
            brlo: function(instr, context) {
                _conditional(instr, context, 'GE');
                return Base.instructions.nop();
            },
            brlt: function(instr, context) {
                _conditional(instr, context, 'GE');
                return Base.instructions.nop();
            },
            brmi: function(instr, context) {
                _conditional(instr, context, 'GE');
                return Base.instructions.nop();
            },
            brne: function(instr, context) {
                _conditional(instr, context, 'EQ');
                return Base.instructions.nop();
            },
            brpl: function(instr, context) {
                _conditional(instr, context, 'LE');
                return Base.instructions.nop();
            },
            brsh: function(instr) {
                _conditional(instr, context, 'GT');
                return Base.instructions.nop();
            },
            bset: function(instr) {
                return Base.instructions.macro('SREG_SET_BIT', ' (' + instr.parsed[1] + ')', '#define SREG_SET_BIT(x) __asm(bset (x))');
            },
            call: function(instr, context) {
                instr.invalidate_jump();
                //name, args, is_pointer, returns, bits
                if (instr.parsed[1].indexOf('0x') == 0) {
                    return Base.instructions.call(instr.parsed[1], [], true, null, 16);
                }
                return Base.instructions.call(instr.parsed[1], [], false, null, null);
            },
            cli: function(instr) {
                return Base.instructions.macro('DISABLE_INTERRUPTS', null, '#define DISABLE_INTERRUPTS __asm(cli)');
            },
            clr: function(instr) {
                return Base.instructions.assign(instr.parsed[1], '0');
            },
            clt: function() {
                return Base.instructions.macro('CLEAR_TRANSFER_FLAG', null, '#define CLEAR_TRANSFER_FLAG __asm(clt)');
            },
            com: function(instr) {
                return Base.instructions.subtract(instr.parsed[1], '0xff', instr.parsed[1]);
            },
            cp: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return Base.instructions.nop();
            },
            cpc: function(instr, context, instructions) {
                var p = instructions.indexOf(instr);
                if (instructions[p - 1] && instructions[p - 1].parsed[0].indexOf('cp') == 0) {
                    _compare_bytes(instr.parsed[1], instr.parsed[2], context);
                } else {
                    _compare(instr.parsed[1], instr.parsed[2], context);
                }
                context.cond.instr = instr;
                return Base.instructions.nop();
            },
            cpi: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return Base.instructions.nop();
            },
            dec: function(instr) {
                return Base.instructions.decrease(instr.parsed[1], '1');
            },
            eor: function(instr, context) {
                return _common_math(instr, Base.instructions.xor);
            },
            icall: function(instr, context) {
                instr.invalidate_jump();
                //name, args, is_pointer, returns, bits
                var op = Base.instructions.call(AVR_MEMORY.z.name, [], true);
                Base.add_macro(op, AVR_MEMORY.z.macro);
                return op;
            },
            ijmp: function(instr, context) {
                instr.invalidate_jump();
                var op = Base.instructions.goto(AVR_MEMORY.z.name);
                Base.add_macro(op, AVR_MEMORY.z.macro);
                return op;
            },
            in: function(instr) {
                var e = instr.parsed;
                return Base.instructions.macro('READ_FROM_IO', ' (' + e[2] + ', ' + e[1] + ')', '#define READ_FROM_IO(x,y) __asm(in (y), (x))');
            },
            inc: function(instr) {
                return Base.instructions.increase(instr.parsed[1], '1');
            },
            iret: function(instr) {
                return Base.instructions.macro('RETURN_FROM_INTERRUPT', null, '#define RETURN_FROM_INTERRUPT __asm(iret)');
            },
            ld: function(instr) {
                var ptr = instr.parsed[2];
                if (ptr.indexOf('-') >= 0) {
                    ptr = ptr.replace('-', '');
                    //pointer, register, bits, is_signed
                    var m = [
                        Base.instructions.read_memory(AVR_MEMORY[ptr].name, instr.parsed[1], 8, false),
                        Base.instructions.subtract(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].high, 1),
                        Base.instructions.subtract(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1)
                    ];
                    var op = Base.composed(m);
                    Base.add_macro(op, AVR_MEMORY[ptr].macro);
                    return op;
                } else if (ptr.indexOf('+') >= 0) {
                    ptr = ptr.replace('+', '');
                    //pointer, register, bits, is_signed
                    var m = [
                        Base.instructions.read_memory(AVR_MEMORY[ptr].name, instr.parsed[1], 8, false),
                        Base.instructions.add(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].high, 1),
                        Base.instructions.add(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1)
                    ];
                    var op = Base.composed(m);
                    Base.add_macro(op, AVR_MEMORY[ptr].macro);
                    return op;
                }
                //pointer, register, bits, is_signed
                var op = Base.instructions.read_memory(AVR_MEMORY[ptr].name, instr.parsed[1], 8, false);
                Base.add_macro(op, AVR_MEMORY[ptr].macro);
                return op;
            },
            ldd: function(instr) {
                var ptr = instr.parsed[2].match(/([xyz]|[\+\-0-9]+)/g);
                var offset = ptr[1].replace(/(\-)/, ' - ').replace(/(\+)/, ' + ');
                //pointer, register, bits, is_signed
                var op = Base.instructions.read_memory(AVR_MEMORY[ptr[0]].name + offset, instr.parsed[1], 8, false);
                Base.add_macro(op, AVR_MEMORY[ptr[0]].macro);
                return op;
            },
            ldi: function(instr) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            lds: function(instr) {
                //pointer, register, bits, is_signed
                return Base.instructions.read_memory(instr.parsed[2], instr.parsed[1], 8, false);
            },
            lsl: function(instr) {
                return Base.instructions.shift_left(instr.parsed[1], instr.parsed[1], '1');
            },
            lsr: function(instr) {
                return Base.instructions.shift_right(instr.parsed[1], instr.parsed[1], '1');
            },
            mov: function(instr) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            movw: function(instr, context) {
                var a1 = instr.parsed[1];
                var a2 = _next_register(instr.parsed[1]);
                var b1 = instr.parsed[2];
                var b2 = _next_register(instr.parsed[2]);
                var op1 = Base.instructions.assign(a1, b1);
                var op2 = Base.instructions.assign(a2, b2);
                return Base.composed([op1, op2]);
            },
            nop: function() {
                return Base.instructions.nop();
            },
            or: function(instr, context) {
                return _common_math(instr, Base.instructions.or);
            },
            ori: function(instr, context) {
                return _common_math(instr, Base.instructions.or);
            },
            out: function(instr) {
                var e = instr.parsed;
                return Base.instructions.macro('WRITE_TO_IO', ' (' + e[1] + ', ' + e[2] + ')', '#define WRITE_TO_IO(x,y) __asm(in (x), (y))');
            },
            pop: function(instr) {
                return Base.instructions.nop();
            },
            push: function(instr) {
                return Base.instructions.nop();
            },
            rcall: function(instr, context) {
                var name = instr.parsed[1];
                /*
                if (name.indexOf('0x') == 0) {
                    name = name.replace('0x', 'fcn_');
                }
                */
                //name, args, is_pointer, returns, bits
                return Base.instructions.call(name, [], true, null, AVR_MEM_BITS);
            },
            ret: function(instr, context) {
                // returns r1:r0
                // but if pop r0 then return void.
                return Base.instructions.return(context.returns);
            },
            rjmp: function() {
                return Base.instructions.nop();
            },
            rol: function(instr) {
                return Base.instructions.rotate_left(instr.parsed[1], instr.parsed[1], '1', 8);
            },
            ror: function(instr) {
                return Base.instructions.rotate_right(instr.parsed[1], instr.parsed[1], '1', 8);
            },
            sbc: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.instructions.subtract);
            },
            sbci: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.instructions.subtract);
            },
            sbiw: function(instr, context) {
                var b = instr.parsed[2];
                var a1 = instr.parsed[1];
                var a2 = _next_register(instr.parsed[1]);
                _compare_values(a1, b, a2, b, context);
                context.cond.instr = instr;
                if (b == '0x00' || b == '0') {
                    return Base.instructions.nop();
                }
                var op1 = null;
                var op2 = null;
                if (b == '0x01' || b == '1') {
                    op1 = Base.instructions.decrease(a1, '1');
                    op2 = Base.instructions.decrease(a2, '1');
                } else {
                    op1 = Base.instructions.subtract(a1, a1, b);
                    op2 = Base.instructions.subtract(a2, a2, b);
                }
                return Base.composed([op1, op2]);
            },
            sei: function() {
                return Base.instructions.macro('ENABLE_INTERRUPTS', null, '#define ENABLE_INTERRUPTS __asm(sei)');
            },
            ser: function(instr) {
                return Base.instructions.assign(instr.parsed[1], '0xff');
            },
            set: function() {
                return Base.instructions.macro('SET_TRANSFER_FLAG', null, '#define SET_TRANSFER_FLAG __asm(set)');
            },
            st: function(instr) {
                var ptr = instr.parsed[1];
                if (ptr.indexOf('-') >= 0) {
                    ptr = ptr.replace('-', '');
                    //pointer, register, bits, is_signed
                    var m = [
                        Base.instructions.write_memory(AVR_MEMORY[ptr].name, instr.parsed[2], 8, false),
                        Base.instructions.subtract(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].high, 1),
                        Base.instructions.subtract(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1)
                    ];
                    var op = Base.composed(m);
                    Base.add_macro(op, AVR_MEMORY[ptr].macro);
                    return op;
                } else if (ptr.indexOf('+') >= 0) {
                    ptr = ptr.replace('+', '');
                    //pointer, register, bits, is_signed
                    var m = [
                        Base.instructions.write_memory(AVR_MEMORY[ptr].name, instr.parsed[2], 8, false),
                        Base.instructions.add(AVR_MEMORY[ptr].high, AVR_MEMORY[ptr].high, 1),
                        Base.instructions.add(AVR_MEMORY[ptr].low, AVR_MEMORY[ptr].low, 1)
                    ];
                    var op = Base.composed(m);
                    Base.add_macro(op, AVR_MEMORY[ptr].macro);
                    return op;
                }
                //pointer, register, bits, is_signed
                var op = Base.instructions.write_memory(AVR_MEMORY[ptr].name, instr.parsed[2], 8, false);
                Base.add_macro(op, AVR_MEMORY[ptr].macro);
                return op;
            },
            std: function(instr) {
                var ptr = instr.parsed[1].match(/([xyz]|[\+\-0-9]+)/g);
                var offset = ptr[1].replace(/(\-)/, ' - ').replace(/(\+)/, ' + ');
                //pointer, register, bits, is_signed
                var op = Base.instructions.write_memory(AVR_MEMORY[ptr[0]].name + offset, instr.parsed[2], 8, false);
                Base.add_macro(op, AVR_MEMORY[ptr[0]].macro);
                return op;
            },
            sts: function(instr) {
                //pointer, register, bits, is_signed
                return Base.instructions.write_memory(instr.parsed[1], instr.parsed[2], 8, false);
            },
            sub: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                return _common_math(instr, Base.instructions.subtract);
            },
            subi: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                context.cond.instr = instr;
                if (instr.parsed[2] == '0x00' || instr.parsed[2] == '0') {
                    return Base.instructions.nop();
                }
                return _common_math(instr, Base.instructions.subtract);
            },
            tst: function(instr, context) {
                _compare(instr.parsed[1], '0', context);
                context.cond.instr = instr;
            },
            wdr: function() {
                return Base.instructions.macro('CLEAR_WATCHDOG', null, '#define CLEAR_WATCHDOG __asm(wdr)');
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
            return ret.trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null,
                    instr: null
                },
                returns: null
            }
        },
        returns: function(context) {
            return 'void';
        }
    };
})();