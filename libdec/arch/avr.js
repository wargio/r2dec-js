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

    var _common_math = function(instr, op) {
        var e = instr.parsed;
        return op(e[1], e[1], e[2]);
    };

    var _compare = function(a, b, context) {
        context.cond.a = a;
        context.cond.b = b;
    };

    var _compare_values = function(a1, b1, a2, b2, context) {
        context.cond.a = '(' + a1 + ' | (' + a2 + ' << 8))';
        context.cond.b = '(' + b1 + ' | (' + b2 + ' << 8))';
    };

    var _compare_bytes = function(a, b, context) {
        var a1 = context.cond.a;
        var b1 = context.cond.b;
        _compare_values(a1, b1, a, b, context);
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
    };

    var _next_register = function(reg) {
        var num = parseInt(reg.substr(1, reg.length)) + 1;
        return 'r' + num;
    };

    return {
        instructions: {
            adc: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.add);
            },
            add: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.add);
            },
            and: function(instr, context) {
                return _common_math(instr, Base.instructions.and);
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
                _conditional(instr, context, 'GE');
                return Base.instructions.nop();
            },
            brne: function(instr, context) {
                _conditional(instr, context, 'EQ');
                return Base.instructions.nop();
            },
            bset: function(instr) {
                return Base.instructions.macro('SREG_SET_BIT', ' (' + instr.parsed[1] + ')', '#define SREG_SET_BIT (x) __asm(bset (x))');
            },
            call: function(instr, context) {
                //name, args, is_pointer, returns, bits
                return Base.instructions.call(instr.parsed[1]);
            },
            clr: function(instr) {
                return Base.instructions.assign(instr.parsed[1], '0');
            },
            cp: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return Base.instructions.nop();
            },
            cpc: function(instr, context, instructions) {
                var p = instructions.indexOf(instr);
                if (instructions[p - 1] && instructions[p - 1].parsed[0] == 'cp') {
                    _compare_bytes(instr.parsed[1], instr.parsed[2], context);
                } else {
                    _compare(instr.parsed[1], instr.parsed[2], context);
                }
                return Base.instructions.nop();
            },
            eor: function(instr, context) {
                return _common_math(instr, Base.instructions.xor);
            },
            in: function(instr) {
                var e = instr.parsed;
                return Base.instructions.macro('READ_FROM_IO', ' (' + e[1] + ', ' + e[2] + ')', '#define READ_FROM_IO (x,y) __asm(in (x), (y))');
            },
            iret: function(instr) {
                return Base.instructions.macro('RETURN_FROM_INTERRUPT', null, '#define RETURN_FROM_INTERRUPT __asm(iret)');
            },
            mov: function(instr) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            nop: function() {
                return Base.instructions.nop();
            },
            or: function(instr, context) {
                return _common_math(instr, Base.instructions.or);
            },
            out: function(instr) {
                var e = instr.parsed;
                return Base.instructions.macro('WRITE_TO_IO', ' (' + e[1] + ', ' + e[2] + ')', '#define WRITE_TO_IO (x,y) __asm(in (x), (y))');
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
                return Base.instructions.return(context.returns);
            },
            rjmp: function() {
                return Base.instructions.nop();
            },
            sbc: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.subtract);
            },
            sbci: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.subtract);
            },
            sbiw: function(instr, context) {
                var a1 = instr.parsed[1];
                var a2 = _next_register(instr.parsed[1]);
                var b = instr.parsed[2];
                _compare_values(a1, b, a2, b, context);
                var op1 = Base.instructions.subtract(a1, a1, b);
                var op2 = Base.instructions.subtract(a2, a2, b);
                return Base.composed([op1, op2]);
            },
            sub: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.subtract);
            },
            subi: function(instr, context) {
                _compare(instr.parsed[1], instr.parsed[2], context);
                return _common_math(instr, Base.instructions.subtract);
            },
            tst: function(instr, context) {
                _compare(instr.parsed[1], '0', context);
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
                    b: null
                },
                returns: null
            }
        },
        returns: function(context) {
            return 'void';
        }
    };
})();