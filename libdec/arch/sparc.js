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

    var Instruction = require('libdec/core/instruction');
    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');
    var Long = require('libdec/long');

    var _call_fix_name = function(name) {
        if (typeof name != 'string') {
            return name;
        }
        if (name.indexOf('fcn.') == 0 || name.indexOf('func.') == 0) {
            return name.replace(/[.:]/g, '_').replace(/__+/g, '_');
        }
        return name.replace(/\[reloc\.|\]/g, '').replace(/[.:]/g, '_').replace(/__+/g, '_').replace(/_[0-9a-f]+$/, '').replace(/^_+/, '');
    };

    var _load = function(instr, context, instruction, signed, bits) {
        var e = instr.parsed;
        if (e.opd[0].indexOf('+') > 0) {
            var arg = e.opd[0].split('+');
            var ops = [];
            var value = Variable.uniqueName('local');
            if (arg[1].indexOf('-') < 0) {
                ops.push(Base.add(value, arg[0], arg[1]));
            } else {
                ops.push(Base.subtract(value, arg[0], arg[1].replace(/-/, '')));
            }
            ops.push(Base.read_memory(value, e.opd[1], bits, signed));
            return Base.composed(ops);
        }
        //pointer, register, bits, is_signed
        return Base.read_memory(e.opd[0], e.opd[1], bits, signed);
    };

    var _store = function(instr, context, instruction, signed, bits) {
        var e = instr.parsed;
        if (e.opd[1].indexOf('+') > 0) {
            var arg = e.opd[1].split('+');
            var ops = [];
            var value = Variable.uniqueName('local');
            if (arg[1].indexOf('-') < 0) {
                ops.push(Base.add(value, arg[0], arg[1]));
            } else {
                ops.push(Base.subtract(value, arg[0], arg[1].replace(/-/, '')));
            }
            ops.push(Base.write_memory(value, e.opd[0], bits, signed));
            return Base.composed(ops);
        }
        //pointer, register, bits, is_signed
        return Base.write_memory(e.opd[1], e.opd[0], bits, signed);
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _compare = function(instr, context, instructions) {
        context.cond.a = instr.parsed.opd[0];
        context.cond.b = instr.parsed.opd[1];
    };

    var sethi32 = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e.mnem == 'sethi' && e.opd[1] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                return (e.mnem == 'or' && e.opd[0] == r && e.opd[2] == r) || (e.mnem == 'add' && e.opd[0] == r && e.opd[2] == r);
            }
        ];
        var address = [
            function(e, addr) {
                var v = Long.fromString(parseInt(e.opd[0]).toString(16), false, 16);
                return v.shl(10);
            },
            function(e, addr) {
                var n = Long.fromString(parseInt(e.opd[1]).toString(16), false, 16);
                return addr[e.mnem](n);
            },
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed.opd[1])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].code = Base.nop();
        }
        if (addr) {
            --i;
            addr = '0x' + addr.toString(16);
            instr.code = Base.assign(instr.parsed.opd[1], addr.replace(/0x-/, '-0x'));
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
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            addcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            addx: function(instr, context, instructions) {
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            addxcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            and: function(instr, context, instructions) {
                return Base.and(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            andcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.and(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            andn: function(instr, context, instructions) {
                var ops = [];
                var value = Variable.uniqueName('local');
                ops.push(Base.not(value, instr.parsed.opd[1]));
                ops.push(Base.and(instr.parsed.opd[2], instr.parsed.opd[0], value));
                return Base.composed(ops);
            },
            andncc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                var value = Variable.uniqueName('local');
                ops.push(Base.not(value, instr.parsed.opd[1]));
                ops.push(Base.and(instr.parsed.opd[2], instr.parsed.opd[0], value));
                return Base.composed(ops);
            },
            ba: function(instr, context, instructions) {
                return Base.nop();
            },
            bn: function(instr, context, instructions) {
                return Base.nop();
            },
            be: function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            bne: function(instr, context, instructions) {
                return _conditional(instr, context, 'NE');
            },
            bg: function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            bge: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            bl: function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            ble: function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            blu: function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            bleu: function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            bgeu: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            bgu: function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            bpos: function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            bneg: function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            call: function(instr, context, instructions) {
                return Base.call(_call_fix_name(instr.parsed.opd[0]), []);
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
                return Base.assign(instr.parsed.opd[1], instr.parsed.opd[0]);
            },
            nop: function(instr) {
                return Base.nop();
            },
            or: function(instr, context, instructions) {
                return Base.or(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            orcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.or(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            orn: function(instr, context, instructions) {
                var ops = [];
                var value = Variable.uniqueName('local');
                ops.push(Base.not(value, instr.parsed.opd[1]));
                ops.push(Base.or(instr.parsed.opd[2], instr.parsed.opd[0], value));
                return Base.composed(ops);
            },
            orncc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                var value = Variable.uniqueName('local');
                ops.push(Base.not(value, instr.parsed.opd[1]));
                ops.push(Base.or(instr.parsed.opd[2], instr.parsed.opd[0], value));
                return Base.composed(ops);
            },
            ret: function(instr, context, instructions) {
                return Base.return();
            },
            retl: function(instr, context, instructions) {
                return Base.return();
            },
            rett: function(instr, context, instructions) {
                return Base.return();
            },
            restore: function(instr, context, instructions) {
                return Base.nop();
            },
            save: function(instr, context, instructions) {
                return Base.nop();
            },
            sethi: function(instr, context, instructions) {
                var v = Long.fromString(parseInt(instr.parsed.opd[0]).toString(16), true, 16);
                return Base.assign(instr.parsed.opd[1], '0x' + v.shl(10).toString(16));
            },
            sll: function(instr, context, instructions) {
                return Base.shift_left(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            srl: function(instr, context, instructions) {
                return Base.shift_right(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            sra: function(instr, context, instructions) {
                return Base.shift_right(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
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
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            subcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            subx: function(instr, context, instructions) {
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            subxcc: function(instr, context, instructions) {
                _compare(instr, context);
                if (instr.parsed.opd[1].indexOf('-') >= 0) {
                    return Base.add(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1].replace(/-/, ''));
                }
                return Base.subtract(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            xor: function(instr, context, instructions) {
                return Base.xor(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            xorcc: function(instr, context, instructions) {
                _compare(instr, context);
                return Base.xor(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            xnor: function(instr, context, instructions) {
                var ops = [];
                ops.push(Base.xor(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]));
                ops.push(Base.not(instr.parsed.opd[2], instr.parsed.opd[2]));
                return Base.composed(ops);
            },
            xnorcc: function(instr, context, instructions) {
                _compare(instr, context);
                var ops = [];
                ops.push(Base.xor(instr.parsed.opd[2], instr.parsed.opd[0], instr.parsed.opd[1]));
                ops.push(Base.not(instr.parsed.opd[2], instr.parsed.opd[2]));
                return Base.composed(ops);
            },
            unimp: function() {
                return Base.nop();
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(assembly) {
            var tokens = assembly.replace(/,/g, ' ').replace(/\[|\]/g, '').replace(/\s+/g, ' ').trim().split(' ');
            return {
                mnem: tokens.shift(),
                opd: tokens
            };
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                }
            };
        },
        preanalisys: function(instructions) {
            /* delayed branch fix */
            for (var i = 0; i < (instructions.length - 1); i++) {
                var op = instructions[i].parsed.mnem;
                var n = instructions[i + 1].parsed.mnem;
                if (_branch_list.indexOf(op) >= 0 && n != 'nop' && _branch_list.indexOf(n) < 0) {
                    Instruction.swap(instructions, i, i + 1);
                    ++i;
                }
            }
        },
        postanalisys: function(instructions, context) {
            /* simplifies any load address 32/64 bit */
            for (var i = 0; i < instructions.length; i++) {
                if (instructions[i].parsed.mnem == 'sethi') {
                    i = sethi32(instructions[i], i, instructions);
                }
            }
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