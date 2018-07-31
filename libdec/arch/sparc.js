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
    var Long = require('libdec/long');

    var _call_fix_name = function(name) {
        if (typeof name != 'string') {
            return name;
        }
        if (name.indexOf('fcn.') == 0 || name.indexOf('func.') == 0) {
            return name.replace(/[\.:]/g, '_').replace(/__+/g, '_');
        }
        return name.replace(/\[reloc\.|\]/g, '').replace(/[\.:]/g, '_').replace(/__+/g, '_').replace(/_[0-9a-f]+$/, '').replace(/^_+/, '');
    };

    var _load = function(instr, context, instruction, signed, bits) {
        var e = instr.parsed;
        if (e[1].indexOf('+') > 0) {
            var arg = e[1].split('+');
            var ops = [];
            var value = Base.variable();
            if (arg[1].indexOf('-') < 0) {
                ops.push(Base.instructions.add(value, arg[0], arg[1]));
            } else {
                ops.push(Base.instructions.subtract(value, arg[0], arg[1].replace(/-/, '')));
            }
            ops.push(Base.instructions.read_memory(value, e[2], bits, signed));
            return Base.composed(ops);
        }
        //pointer, register, bits, is_signed
        return Base.instructions.read_memory(e[1], e[2], bits, signed);
    };

    var _store = function(instr, context, instruction, signed, bits) {
        var e = instr.parsed;
        if (e[2].indexOf('+') > 0) {
            var arg = e[2].split('+');
            var ops = [];
            var value = Base.variable();
            if (arg[1].indexOf('-') < 0) {
                ops.push(Base.instructions.add(value, arg[0], arg[1]));
            } else {
                ops.push(Base.instructions.subtract(value, arg[0], arg[1].replace(/-/, '')));
            }
            ops.push(Base.instructions.write_memory(value, e[1], bits, signed));
            return Base.composed(ops);
        }
        //pointer, register, bits, is_signed
        return Base.instructions.write_memory(e[2], e[1], bits, signed);
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.instructions.nop();
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.instructions.nop();
    };

    var _compare = function(instr, context, instructions) {
        context.cond.a = instr.parsed[1];
        context.cond.b = instr.parsed[2];
    };

    var sethi32 = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e[0] == 'sethi' && e[2] == r;
            },
            function(e, r) {
                if (e[0] == 'nop') {
                    return true;
                }
                return (e[0] == 'or' && e[1] == r && e[3] == r) || (e[0] == 'add' && e[1] == r && e[3] == r);
            },
        ];
        var address = [
            function(e, addr) {
                var v = Long.fromString(parseInt(e[1]).toString(16), false, 16);
                return v.shl(10);
            },
            function(e, addr) {
                var n = Long.fromString(parseInt(e[2]).toString(16), false, 16);
                return addr[e[0]](n);
            },
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed[2])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].pseudo = Base.instructions.nop();
        }
        if (addr) {
            --i;
            addr = '0x' + addr.toString(16)
            instr.pseudo = Base.instructions.assign(instr.parsed[2], addr.replace(/0x-/, '-0x'));
        }
        return i;
    };

    var _branch_list = [
        'ba', 'bn', 'be', 'bne', 'bl', 'ble', 'bge', 'bg',
        'blu', 'bleu', 'bgeu', 'bgu', 'bpos', 'bneg',
        'bcs', 'bcc', 'bvs', 'bvc', 'call', 'jmp', 'jmpl',
        'ret', 'retl', 'rett'
    ];

    return {
        instructions: {
            add: function(instr, context, instructions) {
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            addcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            addx: function(instr, context, instructions) {
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            addxcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            and: function(instr, context, instructions) {
                return Base.instructions.and(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            andcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.instructions.and(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            andn: function(instr, context, instructions) {
                var ops = [];
                var value = Base.variable();
                ops.push(Base.instructions.not(value, instr.parsed[2]));
                ops.push(Base.instructions.and(instr.parsed[3], instr.parsed[1], value));
                return Base.composed(ops);
            },
            andncc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                var value = Base.variable();
                ops.push(Base.instructions.not(value, instr.parsed[2]));
                ops.push(Base.instructions.and(instr.parsed[3], instr.parsed[1], value));
                return Base.composed(ops);
            },
            ba: function(instr, context, instructions) {
                return Base.instructions.nop();
            },
            bn: function(instr, context, instructions) {
                return Base.instructions.nop();
            },
            be: function(instr, context, instructions) {
                return _conditional(instr, context, 'NE');
            },
            bne: function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            bg: function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            bge: function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            bl: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            ble: function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            blu: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE', true);
            },
            bleu: function(instr, context, instructions) {
                return _conditional(instr, context, 'GT', true);
            },
            bgeu: function(instr, context, instructions) {
                return _conditional(instr, context, 'LE', true);
            },
            bgu: function(instr, context, instructions) {
                return _conditional(instr, context, 'LT', true);
            },
            bpos: function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            bneg: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            call: function(instr, context, instructions) {
                return Base.instructions.call(_call_fix_name(instr.parsed[1]), []);
            },
            cmp: _compare,
            ldub: function(instr, context, instructions) {
                return _load(instr, context, instructions, false, 8);
            },
            ldsb: function(instr, context, instructions) {
                return _load(instr, context, instructions, true, 8);
            },
            lduh: function(instr, context, instructions) {
                return _load(instr, context, instructions, false, 16);
            },
            ldsh: function(instr, context, instructions) {
                return _load(instr, context, instructions, true, 16);
            },
            ld: function(instr, context, instructions) {
                return _load(instr, context, instructions, false, 32);
            },
            ldd: function(instr, context, instructions) {
                return _load(instr, context, instructions, false, 64);
            },
            mov: function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[2], instr.parsed[1]);
            },
            nop: function(instr) {
                return Base.instructions.nop();
            },
            or: function(instr, context, instructions) {
                return Base.instructions.or(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            orcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.instructions.or(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            orn: function(instr, context, instructions) {
                var ops = [];
                var value = Base.variable();
                ops.push(Base.instructions.not(value, instr.parsed[2]));
                ops.push(Base.instructions.or(instr.parsed[3], instr.parsed[1], value));
                return Base.composed(ops);
            },
            orncc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                var value = Base.variable();
                ops.push(Base.instructions.not(value, instr.parsed[2]));
                ops.push(Base.instructions.or(instr.parsed[3], instr.parsed[1], value));
                return Base.composed(ops);
            },
            ret: function(instr, context, instructions) {
                return Base.instructions.return();
            },
            retl: function(instr, context, instructions) {
                return Base.instructions.return();
            },
            restore: function(instr, context, instructions) {
                return Base.instructions.nop();
            },
            save: function(instr, context, instructions) {
                return Base.instructions.nop();
            },
            sethi: function(instr, context, instructions) {
                var v = Long.fromString(parseInt(instr.parsed[1]).toString(16), true, 16);
                return Base.instructions.assign(instr.parsed[2], '0x' + v.shl(10).toString(16));
            },
            sll: function(instr, context, instructions) {
                return Base.instructions.shift_left(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            srl: function(instr, context, instructions) {
                return Base.instructions.shift_right(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            sra: function(instr, context, instructions) {
                return Base.instructions.shift_right(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            stb: function(instr, context, instructions) {
                return _store(instr, context, instructions, false, 8);
            },
            sth: function(instr, context, instructions) {
                return _store(instr, context, instructions, false, 16);
            },
            st: function(instr, context, instructions) {
                return _store(instr, context, instructions, false, 32);
            },
            std: function(instr, context, instructions) {
                return _store(instr, context, instructions, false, 64);
            },
            sub: function(instr, context, instructions) {
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            subcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            subx: function(instr, context, instructions) {
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            subxcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed[2].indexOf('-') >= 0) {
                    return Base.instructions.add(instr.parsed[3], instr.parsed[1], instr.parsed[2].replace(/-/, ''))
                }
                return Base.instructions.subtract(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            xor: function(instr, context, instructions) {
                return Base.instructions.xor(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            xorcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.instructions.xor(instr.parsed[3], instr.parsed[1], instr.parsed[2]);
            },
            xnor: function(instr, context, instructions) {
                var ops = [];
                ops.push(Base.instructions.xor(instr.parsed[3], instr.parsed[1], instr.parsed[2]));
                ops.push(Base.instructions.not(instr.parsed[3], instr.parsed[3]));
                return Base.composed(ops);
            },
            xnorcc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                ops.push(Base.instructions.xor(instr.parsed[3], instr.parsed[1], instr.parsed[2]));
                ops.push(Base.instructions.not(instr.parsed[3], instr.parsed[3]));
                return Base.composed(ops);
            },
            unimp: function() {
                return Base.instructions.nop();
            },
            invalid: function() {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\[|\]/g, '').replace(/\s+/g, ' ').trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                }
            }
        },
        custom_start: function(instructions) {
            /* delayed branch fix */
            for (var i = 0; i < (instructions.length - 1); i++) {
                var op = instructions[i].parsed[0];
                var n = instructions[i + 1].parsed[0];
                if (_branch_list.indexOf(op) >= 0 && n != 'nop' && _branch_list.indexOf(n) < 0) {
                    Base.swap_instructions(instructions, i);
                    ++i;
                }
            }
        },
        custom_end: function(instructions, context) {
            /* simplifies any load address 32/64 bit */
            for (var i = 0; i < instructions.length; i++) {
                if (instructions[i].parsed[0] == 'sethi') {
                    i = sethi32(instructions[i], i, instructions);
                }
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