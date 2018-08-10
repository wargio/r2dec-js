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

    var _to_size = function(value) {
        if (value == 'b') {
            return 8;
        } else if (value == 'w') {
            return 16;
        } else if (value == 'l') {
            return 32;
        }
        return 0;
    }

    var _convert_size = function(array) {
        var size = _to_size(array[1]);
        if (size > 0) {
            array[1] = size;
        } else {
            array.splice(1, 0, 32);
        }
        return array;
    };

    var _get_register_address = function(e, where) {
        var arg = e[where];
        if (e.length < 5 || e[where + 1] == '+') {
            return arg;
        }
        return e[where + 1];
    };

    var _get_address = function(e, where, min, signed, noincdec) {
        var arg = e[where].replace(/\../, '');
        if (e.length > min) {
            if (e[where] == '-') {
                if (noincdec) {
                    arg = new Base.bits_argument(e[where + 1].replace(/\../, ''), e[1], signed, true, true);
                } else {
                    if ((e[1] / 8) == 1) {
                        arg = new Base.bits_argument('--' + e[where + 1].replace(/\../, ''), e[1], signed, true, true);
                    } else {
                        var m = (e[1] / 8);
                        arg = new Base.bits_argument(e[where + 1].replace(/\../, '') + ' -= ' + m, e[1], signed, true, true);
                    }
                }
            } else if (e[where + 1] == '+') {
                // post increase needs to be done externally..
                if (noincdec || e[1] != 8) {
                    arg = new Base.bits_argument(e[where + 1].replace(/\../, ''), e[1], signed, true, true);
                } else {
                    arg = new Base.bits_argument(e[where].replace(/\../, '') + '++', e[1], signed, true, true);
                }
            } else if (e[where].charAt(0) == '-') {
                arg = new Base.bits_argument(e[where + 1].replace(/\../, '') + ' - ' + (e[where].substring(1)), e[1], signed, true, true);
            } else if (e[where + 1]) {
                arg = new Base.bits_argument(e[where + 1].replace(/\../, '') + ' + ' + e[where], e[1], signed, true, true);
            }
        }
        return arg;
    };

    var _is_register = function(name) {
        return name && name.match(/\b[acdsACDS][0-9ixIX]\b/)
    }

    var _common_math = function(e, op) {
        var ispostincrease = e[4] == '+';
        var arg = _get_address(e, 3, 4, true, ispostincrease);
        if (ispostincrease) {
            var ptr_reg = _get_register_address(e, 2);
            return Base.composed([op(arg, arg, e[2]), Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
        }
        return op(arg, arg, e[2]);
    };

    var _move = function(instr) {
        var e = instr.parsed;
        var ispostincrease = e[2] == '+';
        var src = _get_address(e, 2, 4, false, ispostincrease);
        var dst = e.length > 4 ? e[4] : e[3];
        return Base.instructions.assign(dst, src);
    };

    var _move_multiple = function(instr, context) {
        var e = instr.parsed;
        var bits = e[1];
        var isload = instr.opcode.indexOf('),') > 0 || instr.opcode.indexOf(')+,') > 0;
        var ops = [];
        if (isload) {
            //pointer, register, bits, is_signed
            var ispostincrease = e[2] != '-';
            var ptr_reg = _get_register_address(e, 2);
            var ptr = _get_address(e, 2, 4, false, ispostincrease);
            var reg = e.length > 4 ? e[4] : e[3];
            reg = reg.split('/');
            for (var i = 0; i < reg.length; i++) {
                var prefix = reg[i].charAt(0)
                var tmp = reg[i].replace(/[a-zA-Z]/g, '').split('-');
                var start = tmp[0];
                var end = tmp[1] || tmp[0];
                for (var j = start; j <= end; j++) {
                    ops.push(Base.instructions.read_memory(ptr, prefix + j, bits, false));
                    if (ispostincrease) {
                        ops.push(Base.instructions.add(ptr_reg, ptr_reg, '' + (bits / 8)));
                    }
                }
            }
        } else {
            //pointer, register, bits, is_signed
            var ispostincrease = e[3] != '-';
            var ptr_reg = _get_register_address(e, 3);
            var ptr = _get_address(e, 3, 4, false, ispostincrease);
            var reg = e[2].split('/');
            for (var i = 0; i < reg.length; i++) {
                var prefix = reg[i].charAt(0)
                var tmp = reg[i].replace(/[a-zA-Z]/g, '').split('-');
                var start = tmp[0];
                var end = tmp[1] || tmp[0];
                for (var j = start; j <= end; j++) {
                    ops.push(Base.instructions.write_memory(ptr, prefix + j, bits, false));
                    if (ispostincrease) {
                        ops.push(Base.instructions.add(ptr_reg, ptr_reg, '' + (bits / 8)));
                    }
                }
            }
        }
        return Base.composed(ops);
    };

    var _compare = function(instr, context) {
        var e = instr.parsed;
        var left = _get_address(e, 2, 4, false, false);
        var right = e[2] == left ? e[3] : (e[4] || e[3]);
        context.cond.a = right;
        context.cond.b = left;
        return Base.instructions.nop();
    };

    var _conditional = function(instr, context, type, zero) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.instructions.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    return {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.instructions.add);
            },
            addi: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
            },
            addq: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
            },
            andi: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
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
            bge: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bra: function(instr, context) {
                return Base.instructions.nop();
            },
            clr: function(instr, context) {
                var e = instr.parsed;
                var ispostincrease = e[3] == '+';
                var destination = _get_address(e, 2, 3, false, ispostincrease);
                var op = Base.instructions.assign(destination, '0')
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 2);
                    return Base.composed([op, Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
                }
                return op;
            },
            cmp: _compare,
            eori: function(instr) {
                return _common_math(instr.parsed, Base.instructions.xor);
            },
            jsr: function(instr) {
                return Base.instructions.call(instr.parsed[2], [], _is_register(instr.parsed[2]));
            },
            lea: function(instr, context) {
                var bits = instr.parsed[1];
                var dst = instr.parsed[instr.parsed.length - 1];
                var src = null;
                var val = instr.parsed[2].replace(/\.([bwl])/, ' $1').split(' ');
                if (instr.assembly.indexOf(')') > 0) {
                    src = _get_address(instr.parsed, 2, 3, false, false);
                } else if (val[0].startsWith('0x')) {
                    src = instr.string ?
                        new Base.string(instr.string) :
                        new Base.bits_argument(val[0], _to_size(val[1]), false, true, true);
                } else {
                    src = val[0];
                }
                return Base.instructions.assign(dst, src);
            },
            link: function(instr) {
                var e = instr.parsed;
                var dst = e[e.length - 1];
                var src = _get_address(e, 2, 3, false, false);
                return Base.instructions.write_memory(e[3], e[2], e[1], false);
            },
            lsl: function(instr) {
                var e = instr.parsed;
                if (instr.assembly.indexOf(')') > 0) {
                    var ispostincrease = e[3] == '+';
                    var destination = _get_address(e, 2, 3, false, ispostincrease);
                    var op = Base.instructions.shift_left(destination, destination, source_b);
                    if (ispostincrease) {
                        var ptr_reg = _get_register_address(e, 2);
                        return Base.composed([op, Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
                    }
                    return op;
                } else if (e[3]) {
                    return Base.instructions.shift_left(e[3], e[3], e[2]);
                }
                return Base.instructions.shift_left(e[2], e[2], '1');
            },
            lsr: function(instr) {
                var e = instr.parsed;
                if (instr.assembly.indexOf(')') > 0) {
                    var ispostincrease = e[3] == '+';
                    var destination = _get_address(e, 2, 3, false, ispostincrease);
                    var op = Base.instructions.shift_right(destination, destination, source_b);
                    if (ispostincrease) {
                        var ptr_reg = _get_register_address(e, 2);
                        return Base.composed([op, Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
                    }
                    return op;
                } else if (e[3]) {
                    return Base.instructions.shift_right(e[3], e[3], e[2]);
                }
                return Base.instructions.shift_right(e[2], e[2], '1');
            },
            move: function(instr) {
                var e = instr.parsed;
                var pointer = _get_address(e, 2, 4, false, e[3] == '+');
                var shift = e.length > 4 ? 4 : 3;
                var register = _get_address(e, shift, 4, false, e[shift] == '+');

                if (e[3] == '+') {
                    var ptr_reg = _get_register_address(e, 2);
                    var ops = [Base.instructions.read_memory(pointer, register, e[1], false), Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))];
                    if (e[shift] == '+') {
                        ptr_reg = _get_register_address(e, shift);
                        ops.push(Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8)));
                    }
                    return Base.composed(ops)
                } else if (e[shift] == '+') {
                    var ptr_reg = _get_register_address(e, shift);
                    var ops = [Base.instructions.read_memory(pointer, register, e[1], false), Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))];
                    return Base.composed(ops)
                }
                return Base.instructions.read_memory(pointer, register, e[1], false);
            },
            movea: _move,
            movem: _move_multiple,
            moveq: function(instr, context) {
                return Base.instructions.assign(instr.parsed[3], instr.parsed[2]);
            },
            or: function(instr) {
                return _common_math(instr.parsed, Base.instructions.or);
            },
            ori: function(instr) {
                return _common_math(instr.parsed, Base.instructions.or);
            },
            pea: function(instr) {
                var bits = instr.parsed[1];
                var pointer = new Base.bits_argument('a7 -= 4', bits, false, true, true);
                var register = null;
                var val = instr.parsed[2].replace(/\.([bwl])/, ' $1').split(' ');
                if (val[0].startsWith('0x')) {
                    register = instr.string ?
                        new Base.string(instr.string) :
                        new Base.bits_argument(val[0], _to_size(val[1]), false, true, true);
                } else if (instr.assembly.indexOf(')') > 0) {
                    register = _get_address(instr.parsed, 2, 3, false, false);
                } else {
                    register = val[0];
                }
                return Base.instructions.write_memory(pointer, register, bits, false);
            },
            rts: function(instr) {
                return Base.instructions.return();
            },
            sf: function(instr, context) {
                var e = instr.parsed;
                var ispostincrease = e[3] == '+';
                var destination = _get_address(e, 2, 3, false, ispostincrease);
                if (typeof destination == 'string' && destination.startsWith('0x')) {
                    destination = new Base.bits_argument(destination, e[1], false, true, true)
                }
                var op = Base.instructions.and(destination, '0');
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 2);
                    return Base.composed([op, Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
                }
                return op;
            },
            st: function(instr, context) {
                var e = instr.parsed;
                var ispostincrease = e[3] == '+';
                var destination = _get_address(e, 2, 3, false, ispostincrease);
                var src = (e[1] == 8 ? '0xff' : (e[1] == 16 ? '0xffff' : '0xffffffff'));
                if (typeof destination == 'string' && destination.startsWith('0x')) {
                    destination = new Base.bits_argument(destination, e[1], false, true, true)
                }
                var op = Base.instructions.assign(destination, src);
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 2);
                    return Base.composed([op, Base.instructions.add(ptr_reg, ptr_reg, '' + (e[1] / 8))])
                }
                return op;
            },
            tst: function(instr, context) {
                var val = instr.parsed[2].replace(/\.([bwl])/, ' $1').split(' ');
                if (val[0].startsWith('0x')) {
                    context.cond.a = new Base.bits_argument(val[0], _to_size(val[1]), true, true, true);
                } else if (instr.assembly.indexOf(')') > 0) {
                    context.cond.a = _get_address(instr.parsed, 2, 3, true, false);
                } else {
                    context.cond.a = val[0];
                }
                context.cond.b = '0';
                return Base.instructions.nop();
            },
            unlk: function(instr) {
                var e = instr.parsed;
                return Base.instructions.read_memory(e[3] || 'a7', e[2], e[1], false);
            },
            invalid: function(instr) {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var ret = asm.replace(/\.([bwl]\s)/, ' $1 ').replace(/[,]/g, ' ')
            ret = ret.replace(/(\w)\(/, '$1 (').replace(/\)(\w)/, ') $1').replace(/[\(\)]/g, ' ').replace(/\s+/g, ' ');
            return _convert_size(ret.trim().split(' '));
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