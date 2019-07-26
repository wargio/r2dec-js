/* 
 * Copyright (C) 2017-2018 deroad
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

    const _mips_registers = [
        'zero', 'at', 'v0', 'v1',
        'a0', 'a1', 'a2', 'a3',
        't0', 't1', 't2', 't3',
        't4', 't5', 't6', 't7',
        's0', 's1', 's2', 's3',
        's4', 's5', 's6', 's7',
        'k0', 'k1', 'gp', 'sp',
        'fp', 'ra',
        'f0', 'f1', 'f2', 'f3', 'f4',
        'f5', 'f6', 'f7', 'f8',
        'f9', 'f10', 'f11', 'f12',
        'f13', 'f14', 'f15', 'f16',
        'f17', 'f18', 'f19', 'f20',
        'f21', 'f22', 'f23', 'f24',
        'f25', 'f26', 'f27', 'f28',
        'f29', 'f30', 'f31'
    ];

    var op_bits4 = function(instr, op, bits, unsigned, swap) {
        instr.setBadJump();
        var e = instr.parsed;
        var a = swap ? e.opd[2] : e.opd[1];
        var b = swap ? e.opd[1] : e.opd[2];
        if (e.opd[1] == '0') {
            return Base.assign(e.opd[0], e.opd[2]);
        }
        if (bits) {
            a = Variable.local(a, bits);
        }
        return op(e.opd[0], a, b);
    };

    var _move = function(instr, bits, unsigned, shifted) {
        instr.setBadJump();
        var e = instr.parsed;
        if (e.opd[0] == '0') {
            return Base.nop();
        }
        var val = e.opd[1];
        if (shifted) {
            val += '0000';
        }
        var reg = Variable.local(val, bits);
        return Base.assign(e.opd[0], reg);
    };

    var _value_at = function(address, bits) {
        if ((bits == 32 || bits == 64) && r2cmd) {
            //this is truly an hack
            var p = JSON.parse(r2cmd('?j [0x' + address.toString(16) + ']').trim());
            return Long.fromString(p['int' + bits], true, 10);
        }
        return address;
    };

    var load_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;

        if (instr.refs.length > 0) {
            var addr = _value_at(instr.refs[0].addr, bits);
            instr.string = Global.xrefs.find_string(addr);
            instr.symbol = Global.xrefs.find_symbol(addr);
            if (instr.string || instr.symbol) {
                return Base.assign(e.opd[0], instr.string ? Variable.string(instr.string) : instr.symbol);
            }
            //pointer, register, bits, is_signed
            return Base.read_memory(addr, e.opd[0], bits, !unsigned);
        }

        var arg = e.opd[1].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[0], e.opd[0], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[1], e.opd[0], bits, !unsigned);
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (!isNaN(arg[0])) {
            if (arg[0] < 0) {
                arg[0] = " - " + Math.abs(arg[0]);
            } else {
                arg[0] = " + " + arg[0];
            }
            return Base.read_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
        }
        return Base.read_memory(arg[1], e.opd[0], bits, !unsigned);
    };

    var store_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        var arg = e.opd[1].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.write_memory(arg[0], e.opd[0], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.write_memory(arg[1], e.opd[0], bits, !unsigned);
        }
        arg[0] = arg[0].length > 0 ? parseInt(arg[0]) : NaN;
        if (!isNaN(arg[0])) {
            if (_mips_registers.indexOf(arg[1]) >= 0) {
                arg[0] /= bits / 8;
            }
            if (arg[0] < 0) {
                arg[0] = " - " + Math.abs(arg[0]);
            } else {
                arg[0] = " + " + arg[0];
            }
            return Base.write_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
        }
        return Base.write_memory(arg[1], e.opd[0], bits, !unsigned);
    };

    var compare = function(instr, context, instructions, cmp, zero) {
        instr.conditional(instr.parsed.opd[0], zero ? "0" : instr.parsed.opd[1], cmp);
        return Base.nop();
    };

    var _conditional_inline_zero = function(instr, instructions, type) {
        instr.conditional(instr.parsed.opd[2], '0', type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].location;
        return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
    };

    var _hex = function(value) {
        return parseInt(value).toString(16);
    };

    var lui32 = function(instr, start, instructions, context) {
        var addr = null;
        var check = [
            function(e, r) {
                return e.mnem == 'lui' && e.opd[0] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                return (e.mnem == 'ori' && e.opd[0] == r && e.opd[1] == r) ||
                    (e.mnem == 'addi' && e.opd[0] == r && e.opd[1] == r) ||
                    (e.mnem == 'addiu' && e.opd[0] == r && e.opd[1] == r);
            },
        ];
        var address = [
            function(e, addr) {
                return Long.fromString(_hex(e.opd[1]) + '0000', true, 16);
            },
            function(e, addr) {
                var n = Long.fromString(_hex(e.opd[2]), e.mnem.indexOf('u') > 0, 16);
                var op = e.mnem.replace(/[iu]/g, '');
                return addr[op](n);
            },
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed.opd[0])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].valid = false;
        }
        --i;
        instr.string = Global.xrefs.find_string(addr);
        instr.symbol = Global.xrefs.find_symbol(addr);
        addr = instr.string ? Variable.string(instr.string) : (instr.symbol || ('0x' + addr.toString(16)).replace(/0x-/, '-0x'));
        instr.code = Base.assign(instr.parsed.opd[0], addr);
        instr.valid = true;
        return i;
    };

    var _branch_list = [
        'b', 'bal', 'jr', 'jal', 'jalr',
        'beqz', 'bnez', 'bltz', 'blez',
        'bgtz', 'bgez', 'beq', 'bne', 'bnel'
    ];

    return {
        instructions: {
            'nop': function(instr) {
                return Base.nop();
            },
            'b': function(instr) {
                return Base.nop();
            },
            'j': function(instr) {
                return Base.nop();
            },
            'lui': function(instr) {
                return _move(instr, null, null, true);
            },
            'move': function(instr) {
                return _move(instr);
            },
            'movn': function(instr, context, instructions) {
                return _conditional_inline_zero(instr, instructions, 'NE');
            },
            'movz': function(instr, context, instructions) {
                return _conditional_inline_zero(instr, instructions, 'EQ');
            },
            'neg': function(instr) {
                var e = instr;
                return Base.negate(e.opd[0], e.opd[1]);
            },
            'not': function(instr) {
                var e = instr.parsed;
                return Base.not(e.opd[0], e.opd[1]);
            },
            'add': function(instr) {
                return op_bits4(instr, Base.add);
            },
            'addi': function(instr) {
                return op_bits4(instr, Base.add);
            },
            'addiu': function(instr) {
                return op_bits4(instr, Base.add);
            },
            'addu': function(instr) {
                return op_bits4(instr, Base.add);
            },
            'addis': function(instr) {
                if (instr.parsed.opd[2].indexOf('0x') < 0) {
                    instr.parsed.opd[2] = '0x' + instr.parsed.opd[2];
                }
                instr.parsed.opd[2] += '0000';
                return op_bits4(instr, Base.add);
            },
            'sub': function(instr) {
                return op_bits4(instr, Base.subtract, false, true);
            },
            'subc': function(instr) {
                return op_bits4(instr, Base.subtract, false, true);
            },
            'subf': function(instr) {
                return op_bits4(instr, Base.subtract, false, true);
            },
            'xor': function(instr) {
                return op_bits4(instr, Base.xor);
            },
            'xori': function(instr) {
                return op_bits4(instr, Base.xor);
            },
            'or': function(instr) {
                return op_bits4(instr, Base.or);
            },
            'ori': function(instr) {
                return op_bits4(instr, Base.or);
            },
            'oris': function(instr) {
                if (instr.parsed.opd[2].indexOf('0x') < 0) {
                    instr.parsed.opd[2] = '0x' + instr.parsed.opd[2];
                }
                instr.parsed.opd[2] += '0000';
                return op_bits4(instr, Base.or);
            },
            'and': function(instr) {
                return op_bits4(instr, Base.and);
            },
            'andi': function(instr) {
                return op_bits4(instr, Base.and);
            },
            'sll': function(instr) {
                return op_bits4(instr, Base.shift_left);
            },
            'sllv': function(instr) {
                return op_bits4(instr, Base.shift_left);
            },
            'sra': function(instr) {
                return op_bits4(instr, Base.shift_right);
            },
            'srl': function(instr) {
                return op_bits4(instr, Base.shift_right);
            },
            'srlv': function(instr) {
                return op_bits4(instr, Base.shift_right);
            },
            'slt': function(instr) {
                var e = instr.parsed;
                return Base.conditional_assign(e.opd[0], e.opd[1], e.opd[2], 'LT', '1', '0');
            },
            'slti': function(instr) {
                var e = instr.parsed;
                return Base.conditional_assign(e.opd[0], e.opd[1], e.opd[2], 'LT', '1', '0');
            },
            'sltiu': function(instr) {
                var e = instr.parsed;
                var arg0 = Variable.local(e.opd[1], 32);
                var arg1 = Variable.local(e.opd[2], 32);
                return Base.conditional_assign(e.opd[0], arg0, arg1, 'LT', '1', '0');
            },
            'sltu': function(instr) {
                var e = instr.parsed;
                if (e.opd[2] == 'zero') {
                    e.opd[2] = '0';
                }
                var arg0 = Variable.local(e.opd[1], 32);
                var arg1 = Variable.local(e.opd[2], 32);
                return Base.conditional_assign(e.opd[0], arg0, arg1, 'LT', '1', '0');
            },
            lb: function(instr) {
                return load_bits(instr, 8, false);
            },
            lh: function(instr) {
                return load_bits(instr, 16, false);
            },
            lw: function(instr) {
                return load_bits(instr, 32, false);
            },
            sb: function(instr) {
                return store_bits(instr, 8, false);
            },
            sh: function(instr) {
                return store_bits(instr, 16, false);
            },
            sw: function(instr) {
                return store_bits(instr, 32, false);
            },
            lbu: function(instr) {
                return load_bits(instr, 8, true);
            },
            lhu: function(instr) {
                return load_bits(instr, 16, true);
            },
            lwu: function(instr) {
                return load_bits(instr, 32, true);
            },
            sbu: function(instr) {
                return store_bits(instr, 8, true);
            },
            shu: function(instr) {
                return store_bits(instr, 16, true);
            },
            swu: function(instr) {
                return store_bits(instr, 32, true);
            },
            'jr': function(instr, context, instructions) {
                if (instr.parsed.opd.indexOf('ra') < 0) {
                    /*
                      _delayed_branch (instr, context, instructions);
                    */
                    return Base.return();
                }
                var reg = null;
                for (var i = instructions.length - 1; i >= 0; i--) {
                    var e = instructions[i].parsed;
                    if (!e) {
                        continue;
                    }
                    if (e.opd.indexOf('v0') == 1 || e.opd.indexOf('v1') == 1) {
                        reg = e.opd[0];
                        break;
                    }
                }
                return Base.return(reg);
            },
            'jal': function(instr) {
                var fcn_name = instr.parsed.opd[0].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.call(fcn_name);
            },
            'jalr': function(instr) {
                return Base.call(instr.parsed.opd[0], [], true);
            },
            'bal': function(instr) {
                var fcn_name = instr.parsed.opd[0].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.call(fcn_name);
            },
            'beqz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', true);
            },
            'bnez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', true);
            },
            'bltz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LT', true);
            },
            'blez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LE', true);
            },
            'bgtz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GT', true);
            },
            'bgez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GE', true);
            },
            'beqzl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', true);
            },
            'bnezl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', true);
            },
            'bltzl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LT', true);
            },
            'blezl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LE', true);
            },
            'bgtzl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GT', true);
            },
            'bgezl': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GE', true);
            },
            'beql': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', false);
            },
            'bnel': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', false);
            },
            'beq': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', false);
            },
            'bne': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', false);
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(asm) {
            asm = asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(function(x) {
                if (x == 'zero') {
                    return '0';
                }
                return x;
            });

            return {
                mnem: asm.shift(),
                opd: asm
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
                if (_branch_list.indexOf(op) >= 0 && instructions[i + 1].parsed.mnem != 'nop') {
                    Instruction.swap(instructions, i, i + 1);
                    ++i;
                }
            }
        },
        postanalisys: function(instructions, context) {
            /* simplifies any load address 32/64 bit */
            for (var i = 0; i < instructions.length; i++) {
                if (instructions[i].parsed.mnem == 'lui') {
                    i = lui32(instructions[i], i, instructions);
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