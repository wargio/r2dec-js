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

module.exports = (function() {
    var Base = require('libdec/arch/base');

    var _bits_types = {
        'byte': 8,
        'word': 16,
        'dword': 32,
        'qword': 64,
        'xmmword': 128
    };

    var _return_types = {
        '0': '',
        '8': 'al',
        '16': 'ax',
        '32': 'eax',
        '64': 'rax',
    };

    var _return_regs_bits = {
        'al': 8,
        'ax': 16,
        'eax': 32,
        'rax': 64,
    };

    var _is_func_arg = function(name, context) {
        return context.args.some(function(a) {
            return (a.name == name);
        });
    };

    var _is_local_var = function(name, context) {
        return context.vars.some(function(v) {
            return (v.name == name);
        });
    };

    var _has_changed_return = function(reg, signed, context) {
        if (_return_regs_bits[reg] > context.returns.bits) {
            context.returns.bits = _return_regs_bits[reg];
            context.returns.signed = signed;
        }
    };

    var _call_fix_name = function(name) {
        if (typeof name != 'string') {
            return name;
        }
        if (name.startsWith('fcn.') ||
            name.startsWith('func.')) {
            return name.replace(/[\.:]/g, '_').replace(/__+/g, '_');
        }

        return name.replace(/reloc\./g, '').replace(/[\.:]/g, '_').replace(/__+/g, '_').replace(/^_+/, '');
    };

    var _is_stack_reg = function(val) {
        return val ? (val.match(/^[er]?[sb]p$/) != null) : false;
    };

    var _find_bits = function(reg) {
        elems = reg.match(/([re])?(.?[^dwhl]?)([dwhl])?/);

        // reg string will be splitted into an array of 4, where:
        //   [0]: match string
        //   [1]: prefix (either 'r', 'e' or undefined)
        //   [2]: reg name
        //   [3]: suffix (either 'h', 'l', 'w', 'd' or undefined)
        //
        // when coming to determine the register size, the aforementioned elements are inspected in a certain order
        // to look at the first that it isn't undefined: suffix -> prefix -> name

        var sz;

        if (elems[3] != undefined) {
            sz = {
                'h':  8,
                'l':  8,
                'w': 16,
                'd': 32
            }[elems[3]];
        } else if (elems[1] != undefined) {
            sz = {
                'r': 64,
                'e': 32
            }[elems[1]];
        } else {
            // if neither suffix nor prefix are defined, test name for avx regs
            var avx_elems = elems[2].match(/([xyz])mm\d+/);

            if (avx_elems) {
                sz = {
                    'x': 128,
                    'y': 256,
                    'z': 512
                }[avx_elems[1]];
            } else {
                sz = 16;
            }
        }

        return sz;
    };

    var _common_math = function(e, op, bits, context) {
        var dst = e.opd1;   // target register or memory
        var val = e.opd2;   // value operand

        _has_changed_return(dst.token, true, context);

        // stack manipulations are ignored
        if (_is_stack_reg(dst.token)) {
            return null;
        }

        // no value operand, only target
        if (val.token == undefined) {
            var arg = dst.mem_access
                ? new Base.bits_argument(dst.token, dst.mem_access, true, true, true)
                : new Base.bits_argument(dst.token, bits, false);

            context.returns.bits = dst.mem_access || _find_bits(dst.token);
            context.returns.signed = true;

            var oparg = {
                16: 'dx:ax',
                32: 'edx:eax',
                64: 'rax'
            }[context.returns.bits];

            return op(oparg, oparg, arg);
        } else if (dst.mem_access) {
            var arg = new Base.bits_argument(dst.token, dst.mem_access, true, true, true);

            return op(arg, arg, val.token);
        } else if (val.mem_access) {
            var arg = new Base.bits_argument(val.token, val.mem_access, true, true, true);

            return op(dst.token, dst.token, arg);
        }

        // neither target nor value access memory
        var arg = new Base.bits_argument(val.token, bits, false, false, false);

        return op(dst.token, dst.token, arg);
    };

    var _memory_cmp = function(lhand, rhand, cond) {
        if (lhand.mem_access) {
            cond.a = new Base.bits_argument(lhand.token, lhand.mem_access, true, true, true);
            cond.b = rhand.token;
        } else if (rhand.mem_access) {
            cond.a = lhand.token;
            cond.b = new Base.bits_argument(rhand.token, rhand.mem_access, true, true, true);
        } else {
            cond.a = lhand.token;
            cond.b = rhand.token;
        }

        cond.is_incdec = false;
    };

    var _conditional = function(instr, context, type, inv) {
        if (context.cond.is_incdec) {
            type = inv;
        }
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.instructions.nop();
    };

    var _compare = function(instr, context) {
        var lhand = instr.parsed.opd1;
        var rhand = instr.parsed.opd2;

        if (lhand.mem_access || rhand.mem_access) {
            _memory_cmp(lhand, rhand, context.cond);
        } else {
            context.cond.a = lhand.token;
            context.cond.b = rhand.token;
            context.cond.is_incdec = false;
        }

        return Base.instructions.nop();
    };

    var _requires_pointer = function(string, arg) {
        return string == null && arg && (arg.startsWith('local_') || arg == 'esp');
    };

    var _guess_cdecl_nargs = function(instrs) {
        var nargs = 0;

        for (var i = (instrs.length - 1); i >= 0; i--) {
            var e = instrs[i].parsed;

            // a "push" instruction which is not the function's prologue indicates
            // that it is probably a function's argument 
            if ((e.mnem == 'push') && !_is_stack_reg(e.opd1.token)) {
                nargs++;
            } else if ((e.mnem == 'add') && _is_stack_reg(e.opd1.token)) {
                // reached the previous function call cleanup
                break;
            } else if (e.mnem == 'call') {
                // reached the previous function call
                break;
            }
        }

        return nargs;
    };

    var _guess_amd64_nargs = function(instrs) {
        var nargs = 0;

        // TODO: implement this

        return nargs;
    };

    var _populate_cdecl_call_args = function(instrs, nargs) {
        var args = [];

        for (var i = (instrs.length - 1); (i >= 0) && (nargs > 0); i--) {
            var e = instrs[i].parsed;

            if (e.mnem == 'push') {
                var arg = instrs[i].string
                    ? new Base.string(instrs[i].string)
                    : new Base.bits_argument(e.opd1.token, e.opd1.mem_access, false, true, _requires_pointer(null, e.opd1.token));

                instrs[i].valid = false;
                args.push(arg);
                nargs--;
            }
        }

        return args;
    };

    var _populate_amd64_call_args = function(instrs, nargs) {
        var amd64 = {
            'rdi': 0,   'edi': 0,
            'rsi': 1,   'esi': 1,
            'rdx': 2,   'edx': 2,
            'rcx': 3,   'ecx': 3,
            'r10': 3,   'r10d': 3,  // kernel interface uses r10 instead of rcx
            'r8' : 4,   'r8d': 4,
            'r9' : 5,   'r9d': 5
        };

        var args = [];

        for (var i = (instrs.length - 1); (i >= 0) && (nargs > 0); i--) {
            var e = instrs[i].parsed;
            var argidx = amd64[e.opd1.token];

            if (e.opd1.token in amd64 && (args[argidx] == undefined)) {
                var arg = instrs[i].string
                    ? new Base.string(instrs[i].string)
                    : new Base.bits_argument(e.opd2.token, e.opd2.mem_access, false, true, _requires_pointer(null, e.opd2.token));

                instrs[i].valid = false;
                args[argidx] = arg;
                nargs--;
            }
        }

        return args;
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        var start = instrs.indexOf(instr);

        var callsite = instr.parsed.opd1;
        var callname = callsite.token;

        if (callsite.mem_access) {
            if (callname.startsWith('reloc.')) {
                callname = callname.substring('reloc.'.length);
            } else if (callname.startsWith('0x')) {
                callname = new Base.bits_argument(callname, callsite.mem_access, false, true, true);
            }
        } else {
            if (callname.match(/$([er])?[abds][ixl]^/)) {
                is_pointer = true;
            }
        }

        // indicates the function call return type (if used)
        var returnval = null;

        // is this a tail call?
        if (_is_last_instruction(instr, instrs)) {
            returnval = 'return';
        } else {
            // scan the instructions down the road to see whether the function's call return
            // value is used or ignored. if it used, use that information to infer the return type
            // TODO: to do this properly, we need to follow possible branches rather than scan sequentially
            for (var i = (start + 1); i < instrs.length; i++) {
                var mnem = instrs[i].parsed.mnem;
                var dst = instrs[i].parsed.opd1.token;
                var src = instrs[i].parsed.opd2.token;

                // determiming whether an instruction reads or writes a gpr is not trivial at this point.
                // assuming that the lhand (first) operator is always overwritten and the rhand (second)
                // operator is always read, is far from being accurate as many instructions may read the
                // lhand operand before overwriting it (i.e. when updating the first operand, but not only).
                //
                // the following code tries to work around this, quite poorly though, by listing all
                // instructions that read both first and second operands

                var insn_uses_dst_as_src = (mnem.match(/pop|lea|c?mov\w*|set\w+/) == null);

                if (src in _return_regs_bits) {
                    returnval = src;

                    _has_changed_return(src, false, context);
                    break;
                } else if (insn_uses_dst_as_src && (dst in _return_regs_bits)) {
                    returnval = dst;

                    _has_changed_return(dst, false, context);
                    break;
                } else if (dst in _return_regs_bits) {
                    // register used to store returned value is overwritten
                    break;
                } else if (['call', 'idiv', 'imul'].indexOf(mnem) > (-1)) {
                    // register used to store returned value is clobbered
                    break;
                }
            }
        }

        var callee = instr.callee;

        var guess_nargs = {
            'cdecl': _guess_cdecl_nargs,
            'amd64': _guess_amd64_nargs
        }[callee.calltype];

        var populate_call_args = {
            'cdecl': _populate_cdecl_call_args,
            'amd64': _populate_amd64_call_args
        }[callee.calltype];

        // every non-import callee has a known number of arguments
        // for imported libc functions, get the number of arguments out of a predefined list
        var nargs = callee.name.startsWith('sym.imp.')
            ? Base.arguments(callee.name.substring('sym.imp.'.length))
            : callee.nargs;

        // if number of arguments is unknown (either an unrecognized or a variadic function),
        // try to guess the number of arguments
        if (nargs == (-1)) {
            nargs = guess_nargs(instrs.slice(0, start));
        }

        var args = populate_call_args(instrs.slice(0, start), nargs);

        return Base.instructions.call(_call_fix_name(callname), args, is_pointer || false, returnval);
    }

    var _standard_mov = function(instr, context) {
        var dst = instr.parsed.opd1;
        var src = instr.parsed.opd2;

        _has_changed_return(dst.token, context.returns.signed, context);

        // TODO: the following observation should be applicable to all instructions, not only 'mov' [except 'lea' though]

        // if dst is an argument or local variable, it should not appear as memory access
        if (_is_func_arg(dst.token, context) ||
            _is_local_var(dst.token, context)) {
            dst.mem_access = undefined;
        }

        // if src is an argument or local variable, it should not appear as memory access
        if (_is_func_arg(src.token, context) ||
            _is_local_var(src.token, context)) {
            src.mem_access = undefined;
        }

        if (dst.mem_access) {
            return Base.instructions.write_memory(dst.token, src.token, dst.mem_access, true);
        } else if (src.mem_access) {
            return Base.instructions.read_memory(src.token, dst.token, src.mem_access, true);
        } else if (_is_stack_reg(dst.token)) {
            return null;
        } else {
            return Base.instructions.assign(dst.token, src.token);
        }
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _is_last_instruction = function(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    }

    var _is_jumping_externally = function(e, a) {
        return e.jump && (e.jump.gt(a[(a.length - 1)].loc) || e.jump.lt(a[0].loc))
    };

    return {
        instructions: {
            inc: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                context.cond.a = dst.token;
                context.cond.b = '0';
                return Base.instructions.increase(dst.token, '1');
            },
            dec: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                context.cond.a = dst.token;
                context.cond.b = '0';
                context.cond.is_incdec = true;
                return Base.instructions.decrease(dst.token, '1');
            },
            add: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.add, null, context);
            },
            sub: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.subtract, null, context);
            },
            sbb: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.subtract, null, context);
            },
            sar: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.shift_right, null, context);
            },
            sal: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.shift_left, null, context);
            },
            shr: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.shift_right, null, context);
            },
            shl: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.shift_left, null, context);
            },
            and: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.and, null, context);
            },
            or: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.or, null, context);
            },
            xor: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.xor, null, context);
            },
            idiv: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.divide, null, context);
            },
            imul: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.instructions.multiply, null, context);
            },
            neg: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.negate(dst.token, dst.token);
            },
            not: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, false, context);
                return Base.instructions.not(dst.token, dst.token);
            },
            lea: function(instr, context) {
                // TODO: export to a function
                // TODO: add '&' where necessary

                var dst = instr.parsed.opd1;
                var val = instr.parsed.opd2;

                // compilers like to perform calculations using 'lea' instructions in the
                // following form: [reg + reg*n] --> reg * (n+1)
                var calc = val.token.match(/([er]?[abds][ixl])\s*\+\s*\1\s*\*(\d)/);

                if (calc) {
                    return Base.instructions.multiply(dst.token, calc[1], calc[2] - 0 + 1 + "");
                }

                if (val.token.indexOf(' ') > (-1)) {
                    val.token = '(' + val.token + ')';
                }

                var arg = instr.string
                    ? new Base.string(instr.string)
                    : val.token.replace(/\./g, '_');

                _has_changed_return(dst.token, false, context);
                return Base.instructions.assign(dst.token, arg);
            },
            call: _call_function,
            cmova: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr, context);
            },
            cmovae: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr, context);
            },
            cmovb: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr, context);
            },
            cmovbe: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr, context);
            },
            cmove: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return _standard_mov(instr, context);
            },
            cmovg: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr, context);
            },
            cmovge: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr, context);
            },
            cmovl: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr, context);
            },
            cmovle: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr, context);
            },
            cmovne: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return _standard_mov(instr, context);
            },
            bswap: function(instr, context, instructions) {
                var dst = instr.parsed.opd1;

                return Base.instructions.swap_endian(dst.token, dst.token, _find_bits(dst.token));
            },
            mov: _standard_mov,
            movabs: _standard_mov,
            cbw: function(instr, context) {
                _has_changed_return('ax', true, context);
                return Base.instructions.extend('ax', 'al', 16);
            },
            cwde: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.instructions.extend('eax', 'ax', 32);
            },
            cdq: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.instructions.extend('edx:eax', 'eax', 64);
            },
            cdqe: function(instr, context) {
                _has_changed_return('rax', true, context);
                return Base.instructions.extend('rax', 'eax', 64);
            },
            movsx: function(instr, context) {
                var dst = instr.parsed.opd1;
                var src = instr.parsed.opd2;

                _has_changed_return(dst.token, true, context);

                return Base.instructions.extend(dst.token, src.token, src.mem_access || _bits_types['dword']);
            },
            movsxd: function(instr, context) {
                var dst = instr.parsed.opd1;
                var src = instr.parsed.opd2;

                _has_changed_return(dst.token, true, context);

                return Base.instructions.extend(dst.token, src.token, src.mem_access || _bits_types['dword']);
            },
            movzx: function(instr, context) {
                var dst = instr.parsed.opd1;
                var src = instr.parsed.opd2;

                _has_changed_return(dst.token, true, context);

                return Base.instructions.extend(dst.token, src.token, src.mem_access || _bits_types['dword']);
            },
            seta: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setae: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setb: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setbe: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            sete: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' == ' + context.cond.b + ') ? 1 : 0');
            },
            setg: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setge: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setl: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setle: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            setne: function(instr, context) {
                var dst = instr.parsed.opd1;

                _has_changed_return(dst.token, true, context);
                return Base.instructions.assign(dst.token, '(' + context.cond.a + ' != ' + context.cond.b + ') ? 1 : 0');
            },
            nop: function(instr, context, instructions) {
                var index = instructions.indexOf(instr);

                if ((index == (instructions.length - 1)) &&
                    (instructions[index - 1].parsed.mnem == 'call') &&
                    (instructions[index - 1].pseudo.ctx.indexOf('return') != 0)) {
                    instructions[index - 1].pseudo.ctx = 'return ' + instructions[index - 1].pseudo.ctx;
                }

                return Base.instructions.nop();
            },
            leave: function(instr, context) {
                return Base.instructions.nop();
            },
            rol: function(instr, context) {
                var dst = instr.parsed.opd1;
                var val = instr.parsed.opd2;

                _has_changed_return(dst.token, context.returns.signed, context);
                return Base.instructions.rotate_left(dst.token, dst.token, val.token, _find_bits(dst.token));
            },
            ror: function(instr, context) {
                var dst = instr.parsed.opd1;
                var val = instr.parsed.opd2;

                _has_changed_return(dst.token, context.returns.signed, context);
                return Base.instructions.rotate_right(dst.token, dst.token, val.token, _find_bits(dst.token));
            },
            jmp: function(instr, context, instructions) {
                var dst = instr.parsed.opd1;

                if (dst.mem_access && dst.token.startsWith('reloc.')) {
                    instr.invalidate_jump();

                    return Base.instructions.call(_call_fix_name(dst.token));
                } else if ((dst.mem_access == undefined) && (['rax', 'eax'].indexOf(dst.token) > (-1))) {
                    return _call_function(instr, context, instructions, true);
                } else if (_is_last_instruction(instr, instructions) && (
                        _is_jumping_externally(instr, instructions) || dst.mem_access)) {
                    return _call_function(instr, context, instructions, _requires_pointer(instr.string, dst.mem_access));
                }

                return Base.instructions.nop()
            },
            cmp: _compare,
            test: function(instr, context, instructions) {
                var lhand = instr.parsed.opd1;
                var rhand = instr.parsed.opd2;

                if (lhand.mem_access || rhand.mem_access) {
                    _memory_cmp(lhand, rhand, context.cond);
                } else {
                    context.cond.a = (lhand.token == rhand.token) ? lhand.token : "(" + lhand.token + " & " + rhand.token + ")";
                    context.cond.b = '0';
                }

                return Base.instructions.nop();
            },
            ret: function(instr, context, instructions) {
                var register = _return_types[context.returns.bits.toString()];
                
                if (_is_last_instruction(instr, instructions) && (register == '')) {
                    return Base.instructions.nop();
                }
                return Base.instructions.return(register);
            },
            push: function(instr, context, instructions) {
                instr.valid = false;

                var val = instr.parsed.opd1;

                return val.mem_access
                    ? Base.bits_argument(val.token, val.mem_access, false, true, false)
                    : Base.bits_argument(val.token);
            },
            pop: function(instr, context, instructions) {
                for (var i = instructions.indexOf(instr); i >= 0; i--) {
                    var e = instructions[i].parsed;

                    // push 1
                    // ...       -->    eax = 1
                    // pop eax
                    if (e.mnem == 'push') {
                        e.mnem = 'nop';

                        return Base.instructions.assign(instr.parsed.opd1.token, previous.string ? new Base.string(previous.string) : e.opd1.token);
                    } else if ((e.mnem == 'call') || _is_stack_reg(e.opd1.token)) {
                        break;
                    }
                }

                if (instr.parsed.opd1.token.match(/([er])?[abds][ixl]/)) {
                    context.returns.bits = 0;
                    context.returns.signed = false;
                }

                return Base.instructions.nop();
            },
            jne: function(i, c) {
                _conditional(i, c, 'EQ', 'NE');
                return Base.instructions.nop();
            },
            je: function(i, c) {
                _conditional(i, c, 'NE', 'EQ');
                return Base.instructions.nop();
            },
            ja: function(i, c) {
                _conditional(i, c, 'LE', 'GT');
                return Base.instructions.nop();
            },
            jae: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.instructions.nop();
            },
            jb: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.instructions.nop();
            },
            jbe: function(i, c) {
                _conditional(i, c, 'GT', 'LE');
                return Base.instructions.nop();
            },
            jg: function(i, c) {
                _conditional(i, c, 'LE', 'GT');
                return Base.instructions.nop();
            },
            jge: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.instructions.nop();
            },
            jle: function(i, c) {
                _conditional(i, c, 'GT', 'LE');
                return Base.instructions.nop();
            },
            jl: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.instructions.nop();
            },
            js: function(i, c) {
                _conditional(i, c, 'LT', 'GE');
                return Base.instructions.nop();
            },
            jns: function(i, c) {
                _conditional(i, c, 'GE', 'LT');
                return Base.instructions.nop();
            },
            hlt: function() {
                return Base.instructions.call('_hlt', [], false, 'return');
            },
            invalid: function() {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            // asm string will be tokenized by the following regular expression:
            //
            // (\w+)                                       : instruction mnemonic
            // (?:\s+
            //     (byte|(?:[dq]|[xyz]mm)?word)            : first operand's memory access qualifier
            // )?
            // (?:\s*
            //     (?:\[?)                                 : optional opening bracket (stripped)
            //     ([^\[\],]+)                             : first operand
            //     (?:\]?)                                 : optional closing bracket (stripped)
            // )?
            // (?:,                                        : separating comma
            //     (?:\s+
            //         (byte|(?:[dq]|[xyz]mm)?word)        : second operand's memory access qualifier
            //     )?
            //     (?:\s*
            //         (?:\[?)                             : optional opening bracket (stripped)
            //         ([^\[\],]+)                         : second operand
            //         (?:\]?)                             : optional closing bracket (stripped)
            //     )?
            // )?

            var tokens = asm.match(/(\w+)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*(?:\[?)([^\[\],]+)(?:\]?))?(?:(?:,)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*(?:\[?)([^\[\],]+)(?:\]?))?)?/);

            // tokens[0]: match string; irrelevant
            // tokens[1]: instruction mnemonic
            // tokens[2]: first operand's memory access qualifier; undefined if no qualifier or no operands
            // tokens[3]: first operand; undefined if no operands
            // tokens[4]: second operand's memory access qualifier; undefined if no qualifier or no second operand
            // tokens[5]: second operand; undefined if no second operand

            var mnemonic = tokens[1];

            var operand1 = {
                mem_access: _bits_types[tokens[2]],     // memory access size (in bits) iff operand1 exists and accesses memory, undefined otherwise
                token: tokens[3]                        // operand1 token stripped off square brackets; undefined if instruction has no operands
            };

            var operand2 = {
                mem_access: _bits_types[tokens[4]],     // memory access size (in bits) iff operand2 exists and accesses memory, undefined otherwise
                token: tokens[5]                        // operand2 token stripped off square brackets; undefined if instruction has no second operand
            };

            return {
                mnem: mnemonic,
                opd1: operand1,
                opd2: operand2
            };
        },
        context: function() {
            var JSON = require('libdec/json64');
            var afvj = JSON.parse(r2cmd('afvj').trim());
            var vars_args = afvj.bp.concat(afvj.sp).concat(afvj.reg);

            return {
                cond: {
                    a: null,
                    b: null,
                    is_incdec: false
                },

                returns: {
                    bits: 0,
                    signed: true
                },

                vars: vars_args.filter(function(e) {
                    return (e.kind == 'var');
                }),
                args: vars_args.filter(function(e) {
                    return (e.kind == 'arg' || e.kind == 'reg');
                })
            }
        },
        localvars: function(context) {
            return context.vars.map(function(v) {
                return v.type + ' ' + v.name + ';';
            });
        },
        arguments: function(context) {
            return context.args.length == 0
                ? ['void']
                : context.args.map(function(v) {
                    return v.type + ' ' + v.name;
                  });
        },
        returns: function(context) {
            if (context.returns.bits > 0) {
                return (context.returns.signed ? 'int' : 'uint') + context.returns.bits + '_t';
            }
            return 'void';
        }
    };

})();