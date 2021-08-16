/* 
 * Copyright (C) 2017-2021 deroad
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

    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');
    var Long = require('libdec/long');

    function load_bits(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        var arg = e.opd[1].replace(/\)/, '').split('(');
        if (arg[0].indexOf('-sym.') == 0 && arg[1] == 'gp') {
            return Base.assign(e.opd[0], arg[0].replace(/^-/, ''));
        } else if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[0], e.opd[0], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[1], e.opd[0], bits, !unsigned);
        }
        if (!isNaN(arg[0])) {
            if (arg[0] < 0) {
                arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
            } else {
                arg[0] = " + 0x" + arg[0].toString(16);
            }
            return Base.read_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
        }
        return Base.read_memory(arg[1], e.opd[0], bits, !unsigned);
    }

    function store_bits(instr, bits, unsigned) {
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
            if (arg[0] < 0) {
                arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
            } else {
                arg[0] = " + 0x" + arg[0].toString(16);
            }
            return Base.write_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
        }
        return Base.write_memory(arg[1], e.opd[0], bits, !unsigned);
    }

    function _csr_assign_3arg(instr) {
        instr.setBadJump();
        var dst = instr.parsed.opd[1];
        var src = instr.parsed.opd[2];
        return Base.assign(dst, src);
    }

    function _generic_assign(instr) {
        instr.setBadJump();
        var dst = instr.parsed.opd[0];
        var src = instr.parsed.opd[1];
        return Base.assign(dst, src);
    }

    function _generic_add(instr) {
        instr.setBadJump();
        var dst = instr.parsed.opd[0];
        var src0 = instr.parsed.opd[1];
        var src1 = instr.parsed.opd[2];
        return Base.add(dst, src0, src1);
    }

    function op_bits3(instr, op) {
        instr.setBadJump();
        var dst = instr.parsed.opd[0];
        var src0 = instr.parsed.opd[1];
        var src1 = instr.parsed.opd[2];
        return op(dst, src0, src1);
    }

    function assign_call(instr, name) {
        var dst = instr.parsed.opd[0];
        var args = instr.parsed.opd.slice(1);
        return Base.special(dst + ' = ' + name + '( ', args.join(', ') + ')');
    }

    function _compare(instr, context, instructions, cmp, zero) {
        instr.conditional(instr.parsed.opd[0], zero ? "0" : instr.parsed.opd[1], cmp);
        var arg = instr.parsed.opd[instr.parsed.opd.length - 1];
        if (arg.indexOf('0x') == 0) {
            instr.jump = Long.fromString(arg);
        }
        return Base.nop();
    }

    function _is_last_instruction(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    }

    function _hex(value) {
        return parseInt(value).toString(16);
    }

    function lui32(instr, start, instructions, context) {
        var addr = null;
        var check = [
            function(e, r) {
                return e.mnem == 'lui' && e.opd[0] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                return (e.mnem == 'ori' && (e.opd[0] == r || e.opd[0].indexOf('a') == 0) && e.opd[1] == r) ||
                    (e.mnem == 'addi' && (e.opd[0] == r || e.opd[0].indexOf('a') == 0) && e.opd[1] == r) ||
                    (e.mnem == 'addiu' && (e.opd[0] == r || e.opd[0].indexOf('a') == 0) && e.opd[1] == r);
            },
        ];
        var address = [
            function(e, addr) {
                var imm32 = parseInt(instr.parsed.opd[1]).toString(16) << 12;
                return Long.fromNumber(imm32, true);
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
            if (instr.parsed.opd[0] == instructions[i].parsed.opd[0]) {
                instructions[i].valid = false;
            } else {
                instr.valid = true;
                instr = instructions[i];
            }
        }
        --i;
        if (instr.parsed.opd[0] != 'gp') {
            instr.string = Global.xrefs.find_string(addr);
            instr.symbol = Global.xrefs.find_symbol(addr);
            addr = instr.string ? Variable.string(instr.string) : (instr.symbol || ('0x' + addr.toString(16)).replace(/0x-/, '-0x'));
            instr.valid = true;
        } else {
            addr = ('0x' + addr.toString(16)).replace(/0x-/, '-0x');
            instr.valid = false;
        }
        instr.code = Base.assign(instr.parsed.opd[0], addr);
        return i;
    }

    return {
        instructions: {
            auipc: function(instr) {
                var dst = instr.parsed.opd[0];
                var imm32 = parseInt(instr.parsed.opd[1]);
                var src = instr.location.add(imm32);
                return Base.assign(dst, '0x' + src.toString(16)) ;
            },
            lui: function(instr) {
                var dst = instr.parsed.opd[0];
                var imm20 = parseInt(instr.parsed.opd[1]).toString(16) << 12;
                return Base.assign(dst, '0x' + imm20.toString(16)) ;
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
            lwu: function(instr) {
                return load_bits(instr, 32, true);
            },
            ld: function(instr) {
                return load_bits(instr, 64, false);
            },
            lbu: function(instr) {
                return load_bits(instr, 8, true);
            },
            lhu: function(instr) {
                return load_bits(instr, 16, true);
            },
            'lr.w': function(instr) {
                return load_bits(instr, 32, false);
            },
            'lr.d': function(instr) {
                return load_bits(instr, 64, false);
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
            sd: function(instr) {
                return store_bits(instr, 64, false);
            },
            'sc.w': function(instr) {
                return store_bits(instr, 32, false);
            },
            'sc.d': function(instr) {
                return store_bits(instr, 64, false);
            },
            'sext.w': function(instr) {
                return Base.extend(instr.parsed.opd[0], instr.parsed.opd[1], 32);
            },
            add: _generic_add,
            addi: _generic_add,
            addw: _generic_add,
            addiw: _generic_add,
            and: function(instr) {
                return op_bits3(instr, Base.and);
            },
            andi: function(instr) {
                return op_bits3(instr, Base.and);
            },
            sub: function(instr) {
                return op_bits3(instr, Base.subtract);
            },
            subw: function(instr) {
                return op_bits3(instr, Base.subtract);
            },
            mul: function(instr) {
                return op_bits3(instr, Base.multiply);
            },
            mulh: function(instr) {
                return op_bits3(instr, Base.multiply);
            },
            mulw: function(instr) {
                return op_bits3(instr, Base.multiply);
            },
            srli: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            srai: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            sll: function(instr) {
                return op_bits3(instr, Base.shift_left);
            },
            slli: function(instr) {
                return op_bits3(instr, Base.shift_left);
            },
            srlw: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            srliw: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            sraw: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            sraiw: function(instr) {
                return op_bits3(instr, Base.shift_right);
            },
            sllw: function(instr) {
                return op_bits3(instr, Base.shift_left);
            },
            slliw: function(instr) {
                return op_bits3(instr, Base.shift_left);
            },
            div: function(instr) {
                return op_bits3(instr, Base.divide);
            },
            divu: function(instr) {
                return op_bits3(instr, Base.divide);
            },
            rem: function(instr) {
                return op_bits3(instr, Base.module);
            },
            remu: function(instr) {
                return op_bits3(instr, Base.module);
            },
            divw: function(instr) {
                return op_bits3(instr, Base.divide);
            },
            divuw: function(instr) {
                return op_bits3(instr, Base.divide);
            },
            remw: function(instr) {
                return op_bits3(instr, Base.module);
            },
            remuw: function(instr) {
                return op_bits3(instr, Base.module);
            },
            or: function(instr) {
                return op_bits3(instr, Base.or);
            },
            ori: function(instr) {
                return op_bits3(instr, Base.or);
            },
            xor: function(instr) {
                return op_bits3(instr, Base.xor);
            },
            xori: function(instr) {
                return op_bits3(instr, Base.xor);
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
            'amoadd.w': _generic_add,
            'amoor.w': function(instr) {
                return op_bits3(instr, Base.or);
            },
            'amoxor.w': function(instr) {
                return op_bits3(instr, Base.xor);
            },
            'amoand.w': function(instr) {
                return op_bits3(instr, Base.and);
            },
            'amomin.w': function(instr) {
                return assign_call(instr, 'min');
            },
            'amominu.w': function(instr) {
                return assign_call(instr, 'min');
            },
            'amomax.w': function(instr) {
                return assign_call(instr, 'max');
            },
            'amomaxu.w': function(instr) {
                return assign_call(instr, 'max');
            },
            'amoadd.d': _generic_add,
            'amoor.d': function(instr) {
                return op_bits3(instr, Base.or);
            },
            'amoxor.d': function(instr) {
                return op_bits3(instr, Base.xor);
            },
            'amoand.d': function(instr) {
                return op_bits3(instr, Base.and);
            },
            'amomin.d': function(instr) {
                return assign_call(instr, 'min');
            },
            'amominu.d': function(instr) {
                return assign_call(instr, 'min');
            },
            'amomax.d': function(instr) {
                return assign_call(instr, 'max');
            },
            'amomaxu.d': function(instr) {
                return assign_call(instr, 'max');
            },
            mv: _generic_assign,
            li: _generic_assign,
            csrr: _generic_assign,
            csrw: _generic_assign,
            csrc: _generic_assign,
            csrs: _generic_assign,
            csrri: _generic_assign,
            csrwi: _generic_assign,
            csrci: _generic_assign,
            csrsi: _generic_assign,
            csrrwi: _csr_assign_3arg,
            csrrci: _csr_assign_3arg,
            csrrsi: _csr_assign_3arg,
            beqz: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'EQ', true);
            },
            bnez: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'NE', true);
            },
            bltz: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LT', true);
            },
            blez: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LE', true);
            },
            bgtz: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GT', true);
            },
            bgez: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GE', true);
            },
            beq: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'EQ', false);
            },
            bne: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'NE', false);
            },
            blt: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LT', false);
            },
            ble: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LE', false);
            },
            bgt: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GT', false);
            },
            bge: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GE', false);
            },
            bltu: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LT', false);
            },
            bleu: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'LE', false);
            },
            bgtu: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GT', false);
            },
            bgeu: function(instr, context, instructions) {
                return _compare(instr, context, instructions, 'GE', false);
            },
            jal: function(instr, context, instructions) {
                var fcn_name = instr.parsed.opd[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                var args = [];
                var regs = ['a7', 'a6', 'a5', 'a4', 'a3', 'a2', 'a1', 'a0'];
                var found = 0, i;
                for (i = instructions.indexOf(instr) - 1; i >= 0; i--) {
                    if (instructions[i].parsed.mnem.startsWith('b') ||
                        instructions[i].parsed.mnem.startsWith('j')) {
                        break;
                    }
                    var reg = instructions[i].parsed.opd[0];
                    if (regs.indexOf(reg) >= 0) {
                        found = parseInt(reg.substr(1, 3)) + 1;
                        break;
                    }
                }
                for (i = 0; i < found; i++) {
                    args.push('a' + i);
                }
                return Base.call(fcn_name, args);
            },
            jalr: function(instr) {
                var is_return = false;
                var arg = instr.parsed.opd[0];
                if (arg.indexOf('(') > 0) {
                    arg = arg.replace(/\(|\)/g, ' ').trim().split(' ');
                    if (arg[1] == 'ra') {
                        is_return = true;
                    }
                    arg = arg[1] + ' + ' + arg[0];
                    arg = arg.replace(/\+ -/, '-');
                }
                if (is_return || arg == 'ra') {
                    if (is_return) {
                        instr.comments.push('return address: ' + arg);
                    }
                    return Base.return(instr.parsed.opd[1]);
                }
                return Base.call(arg, [], true);
            },
            j: function(instr, context, instructions) {
                var arg = instr.parsed.opd[0];
                if (arg.indexOf('0x') == 0) {
                    instr.jump = Long.fromString(arg);
                } else if (_is_last_instruction(instr, instructions)) {
                    return Base.call(arg, []);
                }
                return Base.nop();
            },
            ret: function(instr) {
                return Base.return();
            },
            uret: function(instr) {
                return Base.return();
            },
            sret: function(instr) {
                return Base.return();
            },
            mret: function(instr) {
                return Base.return();
            },
            fence: function() {
                return Base.macro('memory_fence()', '#define memory_fence() __asm(fence)');
            },
            'fence.i': function() {
                return Base.macro('memory_fence_i()', '#define memory_fence_i() __asm(fence.i)');
            },
            'sfence.vma': function() {
                return Base.macro('memory_sfence_vma()', '#define memory_sfence_vma() __asm(sfence.vma)');
            },
            ebreak: function() {
                return Base.macro('environment_break()', '#define environment_break() __asm(ebreak)');
            },
            ecall: function() {
                return Base.macro('environment_call()', '#define environment_call() __asm(ecall)');
            },
            wfi: function() {
                return Base.macro('wait_for_interrupt()', '#define wait_for_interrupt() __asm(wfi)');
            },
            nop: function(instr) {
                return Base.nop();
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

            var mnem = asm.shift();
            if (mnem.indexOf('amo') == 0) {
                // atomic ops.
                asm = asm.map(function(x) {
                    return x.replace(/\(|\)/g, '');
                });
            }

            return {
                mnem: mnem,
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