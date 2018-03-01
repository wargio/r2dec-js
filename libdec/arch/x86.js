/* 
 * Copyright (C) 2017 deroad
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

    var Base = require('./base');

    var _signed_types = {
        'byte': 'int8_t ',
        'word': 'int16_t',
        'dword': 'int32_t',
        'qword': 'int64_t'
    };

    var _unsigned_types = {
        'byte': 'uint8_t ',
        'word': 'uint16_t',
        'dword': 'uint32_t',
        'qword': 'uint64_t'
    };

    var _bits_types = {
        'byte': 8,
        'word': 16,
        'dword': 32,
        'qword': 64
    };

    var _call_fix_name = function(name) {
        if (name.indexOf('fcn.') == 0) {
            return name.replace(/[\.:]/g, '_').replace(/__+/g, '_');
        }
        return name.replace(/\[reloc\.|\]/g, '').replace(/[\.:]/g, '_').replace(/__+/g, '_').replace(/_[0-9a-f]+$/, '').replace(/^_+/, '');
    }

    var _is_stack_reg = function(val) {
        return val ? (val.match(/^[er]?[sb]p$/) != null) : false;
    }

    var _clean_save_reg = function(instr, size, instructions) {
        var index = instructions.indexOf(instr);
        var saved = [];
        for (var i = index + 1; size > 0 && i < instructions.length; i++) {
            if (instructions[i].parsed[0] == 'push' && saved.indexOf(instructions[i].parsed[1]) < 0) {
                saved.push(instructions[i].parsed[1]);
                instructions[i].parsed = ['nop'];
            } else {
                break;
            }
        }
    }

    var _common_math = function(e, op, bits) {
        if (_is_stack_reg(e[1])) {
            return null;
        }
        if (e.length == 2) {
            if (e[1].match(/r\wx/)) {
                return op("rax", "rax", (bits ? '(uint' + bits + '_t) ' : '') + e[1]);
            } else if (e[1].match(/r\wx/)) {
                return op("edx:eax", "edx:eax", (bits ? '(uint' + bits + '_t) ' : '') + e[1]);
            }
            return op("dx:ax", "dx:ax", (bits ? '(uint' + bits + '_t) ' : '') + e[1]);
        } else if (_signed_types[e[1]]) {
            var a = "*((" + _signed_types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ")";
            return op(a, a, e[3]);
        } else if (_signed_types[e[2]]) {
            return op(e[1], e[1], "*((" + _signed_types[e[2]] + "*) " + e[3].replace(/\[|\]/g, '') + ")");
        }
        return op(e[1], e[1], (bits ? '(uint' + bits + '_t) ' : '') + e[2]);
    };

    var _memory_cmp = function(e, cond) {
        if (_signed_types[e[1]]) {
            cond.a = "*((" + _signed_types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ")";
            cond.b = e[3];
        } else if (_signed_types[e[2]]) {
            cond.a = e[1];
            cond.b = "*((" + _signed_types[e[2]] + "*) " + e[3].replace(/\[|\]/g, '') + ")";
        } else {
            cond.a = e[1];
            cond.b = e[2];
        }
        cond.is_incdec = false;
    };

    var _conditional = function(instr, context, type, inv) {
        if (context.cond.is_incdec) {
            type = inv;
        }
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _compare = function(instr, context) {
        var e = instr.parsed;
        if (e.length == 4) {
            _memory_cmp(e, context.cond);
            return Base.nop();
        }
        context.cond.a = e[1];
        context.cond.b = e[2];
        context.cond.is_incdec = false;
        return Base.nop();
    };

    // cannot be stack based + register baserd args at the same time
    var _call_fix_args = function(args) {
        var stackbased = false;
        for (var i = 0; i < args.length; i++) {
            if (args[i].value.indexOf('local_') >= 0 || args[i].value.indexOf('esp') >= 0) {
                stackbased = true;
            }
        }
        if (!stackbased) {
            return args;
        }
        return args.filter(function(x) {
            return x.value.indexOf('"') >= 0 || x.value.indexOf('local_') >= 0 || x.value.indexOf('esp') >= 0;
        });
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        var regs32 = ['ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp'];
        var regs64 = ['rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'];
        var args = [];
        var returnval = null;
        var bad_ax = true;
        var end = instrs.indexOf(instr) - regs64.length;
        var start = instrs.indexOf(instr);

        var callname = instr.parsed[1];
        if (_bits_types[instr.parsed[1]]) {
            callname = instr.parsed[2];
            if (callname.indexOf("reloc.") == 0) {
                callname = callname.replace(/reloc\./g, '');
            } else if (callname.indexOf('0x') == 0) {
                callname = "*((" + _unsigned_types[instr.parsed[1]] + "*) " + callname + ")";
            }
        } else if (callname.match(/[er][abds][ix]/)) {
            is_pointer = true;
        }
        instr = instrs[start + 1];
        if (instr) {
            for (var i = 2; i < instr.parsed.length; i++) {
                var reg = instr.parsed[i];
                if (reg == 'eax' || reg == 'rax') {
                    returnval = reg;
                    break;
                }
            }
        }

        var known_args_n = Base.arguments(callname);
        if (known_args_n == 0) {
            return Base.call(_call_fix_name(callname), args, is_pointer || false, returnval);
        }
        if (instrs[start - 1].parsed[0] == 'push' || context.pusharg) {
            for (var i = start - 1; i >= 0; i--) {
                if (known_args_n > 0 && args.length >= known_args_n) {
                    break;
                }
                var op = instrs[i].parsed[0];
                var arg0 = instrs[i].parsed[1];
                var bits = null;
                if (_bits_types[arg0]) {
                    arg0 = instr.parsed[2];
                    bits = _bits_types[instrs[i].parsed[1]];
                }
                if (op == 'push' && !_is_stack_reg(arg0)) {
                    if (instrs[i].string) {
                        instrs[i].valid = false;
                    }
                    args.push(new Base.call_argument(instrs[i].string || arg0, bits));
                    context.pusharg = true;
                } else if (op == 'call' || instrs[i].jump) {
                    break;
                }
            }
        } else {
            for (var i = start - 1; i >= end; i--) {
                if (known_args_n > 0 && args.length >= known_args_n) {
                    break;
                }
                var arg0 = instrs[i].parsed[1];
                var bits = null;
                if (_bits_types[arg0]) {
                    arg0 = instrs[i].parsed[2];
                    bits = _bits_types[instrs[i].parsed[1]];
                }
                if (bad_ax && (arg0 == 'eax' || arg0 == 'rax')) {
                    bad_ax = false;
                    continue;
                }
                if (!arg0 || (arg0.indexOf('local_') != 0 && arg0 != 'esp' && regs32.indexOf(arg0) < 0 && regs64.indexOf(arg0) < 0) ||
                    !instrs[i].pseudo || instrs[i].pseudo[0] == 'call') {
                    break;
                }
                bad_ax = false;
                if (regs32.indexOf(arg0) > -1) {
                    regs32.splice(regs32.indexOf(arg0), 1);
                } else if (regs64.indexOf(arg0) > -1) {
                    regs64.splice(regs64.indexOf(arg0), 1);
                }
                if (instrs[i].string) {
                    instrs[i].valid = false;
                }
                args.push(new Base.call_argument(instrs[i].string || arg0, bits));
            }
            args = _call_fix_args(args);
        }
        return Base.call(_call_fix_name(callname), args, is_pointer || false, returnval);
    }

    var _standard_mov = function(instr) {
        if (instr.parsed[1].match(/^[er]?[sb]p$/)) {
            return null;
        } else if (instr.parsed.length == 3) {
            return Base.assign(instr.parsed[1], instr.string || instr.parsed[2]);
        } else if (_bits_types[instr.parsed[1]]) {
            return Base.write_memory(instr.parsed[2], instr.parsed[3], _bits_types[instr.parsed[1]], true);
        }
        return Base.read_memory(instr.parsed[3], instr.parsed[1], _bits_types[instr.parsed[2]], true);
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    return {
        instructions: {
            inc: function(instr, context) {
                context.cond.a = instr.parsed[1];
                context.cond.b = '0';
                return Base.increase(instr.parsed[1], '1');
            },
            dec: function(instr, context) {
                context.cond.a = instr.parsed[1];
                context.cond.b = '0';
                context.cond.is_incdec = true;
                return Base.decrease(instr.parsed[1], '1');
            },
            add: function(instr) {
                return _common_math(instr.parsed, Base.add);
            },
            sub: function(instr, context, instructions) {
                if (_is_stack_reg(instr.parsed[1])) {
                    _clean_save_reg(instr, parseInt(instr.parsed[2]), instructions);
                }
                return _common_math(instr.parsed, Base.subtract);
            },
            sbb: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            sar: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_right);
            },
            sal: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_left);
            },
            shr: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_right);
            },
            shl: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_left);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.and);
            },
            or: function(instr) {
                return _common_math(instr.parsed, Base.or);
            },
            xor: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.xor);
            },
            idiv: function(instr) {
                return _common_math(instr.parsed, Base.divide);
            },
            imul: function(instr) {
                return _common_math(instr.parsed, Base.multiply);
            },
            neg: function(instr) {
                return Base.negate(instr.parsed[1], instr.parsed[1]);
            },
            not: function(instr) {
                return Base.not(instr.parsed[1], instr.parsed[1]);
            },
            lea: function(instr) {
                return Base.assign(instr.parsed[1], instr.string || instr.parsed[2]);
            },
            call: _call_function,
            cmova: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr);
            },
            cmovae: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr);
            },
            cmovb: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr);
            },
            cmovbe: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr);
            },
            cmove: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return _standard_mov(instr);
            },
            cmovg: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr);
            },
            cmovge: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr);
            },
            cmovl: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr);
            },
            cmovle: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr);
            },
            cmovne: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return _standard_mov(instr);
            },
            mov: _standard_mov,
            cbw: function() {
                return Base.extend('ax', 'al', 16);
            },
            cwde: function() {
                return Base.extend('eax', 'ax', 32);
            },
            cdqe: function() {
                return Base.extend('rax', 'eax', 64);
            },
            movsx: function(instr) {
                if (instr.parsed.length == 4) {
                    return Base.extend(instr.parsed[1], instr.parsed[3], _bits_types[instr.parsed[2]]);
                }
                return Base.extend(instr.parsed[1], instr.parsed[2], _bits_types['dword']);
            },
            movsxd: function(instr) {
                if (instr.parsed.length == 4) {
                    return Base.extend(instr.parsed[1], instr.parsed[3], _bits_types[instr.parsed[2]]);
                }
                return Base.extend(instr.parsed[1], instr.parsed[2], _bits_types['dword']);
            },
            movzx: function(instr) {
                if (instr.parsed.length == 4) {
                    return Base.extend(instr.parsed[1], instr.parsed[3], _bits_types[instr.parsed[2]]);
                }
                return Base.extend(instr.parsed[1], instr.parsed[2], _bits_types['dword']);
            },
            seta: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setae: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setb: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setbe: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            sete: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' == ' + context.cond.b + ') ? 1 : 0');
            },
            setg: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setge: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setl: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setle: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            setne: function(instr, context) {
                return Base.assign(instr.parsed[1], '(' + context.cond.a + ' != ' + context.cond.b + ') ? 1 : 0');
            },
            nop: function(instr, context, instructions) {
                var index = instructions.indexOf(instr);
                if (index == (instructions.length - 1) &&
                    instructions[index - 1].parsed[0] == 'call' &&
                    instructions[index - 1].pseudo.ctx.indexOf('return') != 0) {
                    instructions[index - 1].pseudo.ctx = 'return ' + instructions[index - 1].pseudo.ctx;
                }
                return Base.nop();
            },
            leave: function(instr, context) {
                return Base.nop();
            },
            jmp: function(instr, context, instructions) {
                var e = instr.parsed;
                if (e.length == 3 && e[2].indexOf("[reloc.") == 0) {
                    return Base.call(_call_fix_name(e[2]));
                } else if (e.length == 2 && (e[1] == 'eax' || e[1] == 'rax')) {
                    return _call_function(instr, context, instructions, true);
                }
                return Base.nop()
            },
            cmp: _compare,
            test: function(instr, context, instructions) {
                var e = instr.parsed;
                if (e.length == 4) {
                    _memory_cmp(e, context.cond);
                    return null;
                }
                context.cond.a = (e[1] == e[2]) ? e[1] : "(" + e[1] + " & " + e[2] + ")";
                context.cond.b = '0';
                return Base.nop();
            },
            ret: function(instr, context, instructions) {
                var index = instructions.indexOf(instr) - 1;
                var p = instructions[index];
                var register = false;
                if (p) {
                    if (p.parsed[0] == 'leave') {
                        context.returntype = 'int32_t';
                        register = true;
                    } else if (p.parsed[0] == 'pop' && (p.parsed[1] == 'rbp' || p.parsed[1] == 'ebp') && instructions[index - 1].parsed[1] == 'eax') {
                        context.returntype = 'int32_t';
                        register = true;
                    } else if (p.parsed[0] == 'pop' && (p.parsed[1] == 'rbp' || p.parsed[1] == 'ebp') && instructions[index - 1].parsed[1] == 'rax') {
                        context.returntype = 'int64_t';
                        register = true;
                    } else if (p.parsed[1] == 'eax') {
                        context.returntype = 'int32_t';
                        register = true;
                    } else if (p.parsed[1] == 'rax') {
                        context.returntype = 'int64_t';
                        register = true;
                    }
                }
                return Base.return(register ? 'eax' : '');
            },
            push: function(instr) {
                instr.valid = false;
                var value = instr.parsed[1];
                if (_unsigned_types[value]) {
                    value = "*((" + _unsigned_types[value] + "*) " + instr.parsed[2] + ")";
                }
                return Base.push(value);
            },
            pop: function(instr, context, instructions) {
                var previous = instructions[instructions.indexOf(instr) - 1];
                if (previous.parsed[0] == 'push') {
                    /* 0x0000 push 1; 0x0002 pop eax ===> eax = 1 */
                    var src = previous.parsed[1];
                    previous.parsed = ['nop'];
                    return Base.assign(instr.parsed[1], previous.string || src);
                }
                return Base.nop();
            },
            jne: function(i, c) {
                _conditional(i, c, 'EQ', 'NE');
                return Base.nop();
            },
            je: function(i, c) {
                _conditional(i, c, 'NE', 'EQ');
                return Base.nop();
            },
            ja: function(i, c) {
                _conditional(i, c, 'LE', 'GT');
                return Base.nop();
            },
            jae: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.nop();
            },
            jb: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.nop();
            },
            jbe: function(i, c) {
                _conditional(i, c, 'GT', 'LE');
                return Base.nop();
            },
            jg: function(i, c) {
                _conditional(i, c, 'LE', 'GT');
                return Base.nop();
            },
            jge: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.nop();
            },
            jle: function(i, c) {
                _conditional(i, c, 'GT', 'LE');
                return Base.nop();
            },
            jl: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.nop();
            },
            js: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.nop();
            },
            jns: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.nop();
            },
            hlt: function() {
                return Base.call('_hlt', [], false, 'return');
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var mem = '';
            if (asm.match(/\[.+\]/)) {
                mem = asm.match(/\[.+\]/)[0].replace(/\[|\]/g, '');
            }
            var ret = asm.replace(/\[.+\]/g, '{#}').replace(/,/g, ' ');
            ret = ret.replace(/\s+/g, ' ').trim().split(' ');
            return ret.map(function(a) {
                return a == '{#}' ? mem : a;
            });
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null,
                    is_incdec: false
                },
                pusharg: false,
                returntype: 'void',
                leave: null,
                vars: []
            }
        },
        returns: function(context) {
            return context.returntype;
        }
    };

})();