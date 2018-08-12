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
    var Variable = require('libdec/core/variable');
    var Long = require('libdec/long');

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
        if (e.opd.length < 3 || e.opd[where + 1] == '+') {
            return e.opd[where];
        }
        return e.opd[where + 1];
    };

    var _get_address = function(e, where, min, signed, noincdec) {
        var arg = e.opd[where].replace(/\../, '');
        if (e.opd.length > min) {
            if (e.opd[where] == '-') {
                if (noincdec) {
                    arg = Variable.pointer(e.opd[where + 1].replace(/\../, ''), e.bits, signed);
                } else {
                    if ((e.bits / 8) == 1) {
                        arg = Variable.pointer('--' + e.opd[where + 1].replace(/\../, ''), e.bits, signed);
                    } else {
                        var m = (e.bits / 8);
                        arg = Variable.pointer(e.opd[where + 1].replace(/\../, '') + ' -= ' + m, e.bits, signed);
                    }
                }
            } else if (e.opd[where + 1] == '+') {
                // post increase needs to be done externally..
                if (noincdec || e.bits != 8) {
                    arg = Variable.pointer(e.opd[where + 1].replace(/\../, ''), e.bits, signed);
                } else {
                    arg = Variable.pointer(e.opd[where].replace(/\../, '') + '++', e.bits, signed);
                }
            } else if (e.opd[where].charAt(0) == '-') {
                arg = Variable.pointer(e.opd[where + 1].replace(/\../, '') + ' - ' + (e.opd[where].substring(1)), e.bits, signed);
            } else if (e.opd[where + 1]) {
                arg = Variable.pointer(e.opd[where + 1].replace(/\../, '') + ' + ' + e.opd[where], e.bits, signed);
            }
        }
        return arg;
    };

    var _is_register = function(name) {
        return name && name.match(/\b[acdsACDS][0-9ixIX]\b/)
    }

    var _common_math = function(e, op) {
        var ispostincrease = e.opd[2] == '+';
        var arg = _get_address(e, 1, 2, true, ispostincrease);
        if (ispostincrease) {
            var ptr_reg = _get_register_address(e, 0);
            return Base.composed([op(arg, arg, e.opd[0]), Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
        }
        return op(arg, arg, e.opd[0]);
    };

    var _move = function(instr) {
        instr.setBadJump();
        var e = instr.parsed;
        var ispostincrease = e.opd[0] == '+';
        var src = _get_address(e, 0, 2, false, ispostincrease);
        var dst = e.opd.length > 2 ? e.opd[2] : e.opd[1];
        return Base.assign(dst, src);
    };

    var _move_multiple = function(instr, context) {
        instr.setBadJump();
        var e = instr.parsed;
        var bits = e.bits;
        var isload = instr.assembly.indexOf('),') > 0 || instr.assembly.indexOf(')+,') > 0;
        var ops = [];
        if (isload) {
            //pointer, register, bits, is_signed
            var ispostincrease = e.opd[0] != '-';
            var ptr_reg = _get_register_address(e, 0);
            var ptr = _get_address(e, 0, 2, false, ispostincrease);
            var reg = e.opd.length > 2 ? e.opd[2] : e.opd[1];
            reg = reg.split('/');
            for (var i = 0; i < reg.length; i++) {
                var prefix = reg[i].charAt(0)
                var tmp = reg[i].replace(/[a-zA-Z]/g, '').split('-');
                var start = tmp[0];
                var end = tmp[1] || tmp[0];
                for (var j = start; j <= end; j++) {
                    ops.push(Base.read_memory(ptr, prefix + j, bits, false));
                    if (ispostincrease) {
                        ops.push(Base.add(ptr_reg, ptr_reg, '' + (bits / 8)));
                    }
                }
            }
        } else {
            //pointer, register, bits, is_signed
            var ispostincrease = e.opd[1] != '-';
            var ptr_reg = _get_register_address(e, 1);
            var ptr = _get_address(e, 1, 2, false, ispostincrease);
            var reg = e.opd[0].split('/');
            for (var i = 0; i < reg.length; i++) {
                var prefix = reg[i].charAt(0)
                var tmp = reg[i].replace(/[a-zA-Z]/g, '').split('-');
                var start = tmp[0];
                var end = tmp[1] || tmp[0];
                for (var j = start; j <= end; j++) {
                    ops.push(Base.write_memory(ptr, prefix + j, bits, false));
                    if (ispostincrease) {
                        ops.push(Base.add(ptr_reg, ptr_reg, '' + (bits / 8)));
                    }
                }
            }
        }
        return Base.composed(ops);
    };

    var _compare = function(instr, context) {
        instr.setBadJump();
        var e = instr.parsed;
        var left = _get_address(e, 0, 2, false, false);
        var right = e.opd[0] == left ? e.opd[1] : (e.opd[2] || e.opd[1]);
        context.cond.a = right;
        context.cond.b = left;
        return Base.nop();
    };

    var _conditional = function(instr, context, type, zero) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].location;
    };

    return {
        instructions: {
            add: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            addi: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            addq: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            and: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.and);
            },
            andi: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.and);
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
                return Base.nop();
            },
            clr: function(instr, context) {
                var e = instr.parsed;
                var ispostincrease = e.opd[1] == '+';
                var destination = _get_address(e, 0, 1, false, ispostincrease);
                var op = Base.assign(destination, '0')
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 0);
                    return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
                }
                return op;
            },
            cmp: _compare,
            cmpi: _compare,
            eori: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.xor);
            },
            jsr: function(instr) {
                var arg = _is_register(instr.parsed.opd[0]) ? Variable.functionPointer(instr.parsed.opd[0]) : instr.parsed.opd[0];
                return Base.call(arg, []);
            },
            lea: function(instr, context) {
                instr.setBadJump();
                var bits = instr.parsed.bits;
                var dst = instr.parsed.opd[instr.parsed.opd.length - 1];
                var src = null;
                var val = instr.parsed.opd[0].replace(/\.([bwl])/, ' $1').split(' ');
                if (instr.assembly.indexOf(')') > 0) {
                    src = _get_address(instr.parsed, 0, 1, false, false);
                } else if (val[0].startsWith('0x')) {
                    src = instr.string ?
                        Variable.string(instr.string) :
                        Variable.pointer(val[0], _to_size(val[1]), false);
                } else {
                    src = val[0];
                }
                return Base.assign(dst, src);
            },
            link: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                var dst = e.opd[e.opd.length - 1];
                var src = _get_address(e, 0, 1, false, false);
                return Base.write_memory('a7 + ' + e.opd[1], e.opd[0], e.bits, false);
            },
            lsl: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                if (instr.assembly.indexOf(')') > 0) {
                    var ispostincrease = e.opd[1] == '+';
                    var destination = _get_address(e, 0, 1, false, ispostincrease);
                    var op = Base.shift_left(destination, destination, source_b);
                    if (ispostincrease) {
                        var ptr_reg = _get_register_address(e, 0);
                        return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
                    }
                    return op;
                } else if (e.opd[1]) {
                    return Base.shift_left(e.opd[1], e.opd[1], e.opd[0]);
                }
                return Base.shift_left(e.opd[0], e.opd[0], '1');
            },
            lsr: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                if (instr.assembly.indexOf(')') > 0) {
                    var ispostincrease = e.opd[1] == '+';
                    var destination = _get_address(e, 0, 1, false, ispostincrease);
                    var op = Base.shift_right(destination, destination, source_b);
                    if (ispostincrease) {
                        var ptr_reg = _get_register_address(e, 0);
                        return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
                    }
                    return op;
                } else if (e.opd[1]) {
                    return Base.shift_right(e.opd[1], e.opd[1], e.opd[0]);
                }
                return Base.shift_right(e.opd[0], e.opd[0], '1');
            },
            move: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                var pointer = _get_address(e, 0, 2, false, e.opd[1] == '+');
                var shift = e.opd.length > 2 ? 2 : 1;
                var register = _get_address(e, shift, 2, false, e.opd[shift] == '+');

                if (e.opd[1] == '+') {
                    var ptr_reg = _get_register_address(e, 0);
                    var ops = [Base.read_memory(pointer, register, e.bits, false), Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))];
                    if (e.opd[shift] == '+') {
                        ptr_reg = _get_register_address(e, shift);
                        ops.push(Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8)));
                    }
                    return Base.composed(ops)
                } else if (e.opd[shift] == '+') {
                    var ptr_reg = _get_register_address(e, shift);
                    var ops = [Base.read_memory(pointer, register, e.bits, false), Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))];
                    return Base.composed(ops)
                }
                return Base.read_memory(pointer, register, e.bits, false);
            },
            movea: _move,
            movem: _move_multiple,
            moveq: function(instr, context) {
                instr.setBadJump();
                return Base.assign(instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            or: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.or);
            },
            ori: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.or);
            },
            pea: function(instr) {
                instr.setBadJump();
                var bits = instr.parsed.bits;
                var pointer = Variable.pointer('a7 -= 4', bits, false);
                var register = register = instr.string ? Variable.string(instr.string) : null;
                var val = instr.parsed.opd[0].replace(/\.([bwl])/, ' $1').split(' ');
                if (!register && val[0].startsWith('0x')) {
                    register = instr.string ?
                        Variable.string(instr.string) :
                        Variable.pointer(val[0], _to_size(val[1]), false);
                } else if (!register && instr.assembly.indexOf(')') > 0) {
                    register = _get_address(instr.parsed, 0, 1, false, false);
                } else if (!register) {
                    register = val[0];
                }
                return Base.write_memory(pointer, register, bits, false);
            },
            rts: function(instr) {
                instr.setBadJump();
                return Base.return();
            },
            sf: function(instr, context) {
                instr.setBadJump();
                var e = instr.parsed;
                var ispostincrease = e.opd[1] == '+';
                var destination = _get_address(e, 0, 1, false, ispostincrease);
                if (typeof destination == 'string' && destination.startsWith('0x')) {
                    destination = Variable.pointer(destination, e.bits, false);
                }
                var op = Base.and(destination, '0');
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 2);
                    return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
                }
                return op;
            },
            st: function(instr, context) {
                instr.setBadJump();
                var e = instr.parsed;
                var ispostincrease = e.opd[1] == '+';
                var destination = _get_address(e, 0, 1, false, ispostincrease);
                var src = (e.bits == 8 ? '0xff' : (e.bits == 16 ? '0xffff' : '0xffffffff'));
                if (typeof destination == 'string' && destination.startsWith('0x')) {
                    destination = Variable.pointer(destination, e.bits, false)
                }
                var op = Base.assign(destination, src);
                if (ispostincrease) {
                    var ptr_reg = _get_register_address(e, 0);
                    return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))])
                }
                return op;
            },
            sub: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.subtract);
            },
            subq: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.subtract);
            },
            tst: function(instr, context) {
                instr.setBadJump();
                var val = instr.parsed.opd[0].replace(/\.([bwl])/, ' $1').split(' ');
                if (val[0].startsWith('0x')) {
                    context.cond.a = Variable.pointer(val[0], _to_size(val[1]), true);
                } else if (instr.assembly.indexOf(')') > 0) {
                    context.cond.a = _get_address(instr.parsed, 0, 1, true, false);
                } else {
                    context.cond.a = val[0];
                }
                context.cond.b = '0';
                return Base.nop();
            },
            unlk: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                return Base.read_memory(e.opd[1] || 'a7', e.opd[0], e.bits, false);
            },
            invalid: function(instr) {
                instr.setBadJump();
                return Base.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var ret = asm.replace(/\.([bwl]\s)/, ' $1 ').replace(/[,]/g, ' ')
            ret = ret.replace(/(\w)\(/, '$1 (').replace(/\)(\w)/, ') $1').replace(/[\(\)]/g, ' ').replace(/\s+/g, ' ');
            ret = _convert_size(ret.trim().split(' '));
            return {
                mnem: ret.shift(),
                bits: ret.shift(),
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