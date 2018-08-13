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
    const Base = require('libdec/core/base');
    const Variable = require('libdec/core/variable');
    const Extra = require('libdec/core/extra');

/*
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

    var _requires_pointer = function(string, arg) {
        return string == null && arg && (arg.indexOf('local_') == 0 || arg == 'esp');
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        instr.invalidate_jump();
        var regs32 = ['ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp'];
        var regs64 = ['rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'];
        var args = [];
        var returnval = instrs.indexOf(instr) == (instrs.length - 1) ? 'return' : null;
        var bad_ax = true;
        var end = instrs.indexOf(instr) - regs64.length;
        var start = instrs.indexOf(instr);
        var callname = instr.parsed[1];
        var known_args_n = -1;
        if (_bits_types[instr.parsed[1]]) {
            callname = instr.parsed[2];
            if (callname.indexOf("reloc.") == 0) {
                callname = callname.replace(/reloc\./g, '');
                known_args_n = Base.arguments(callname);
            } else if (callname.indexOf('0x') == 0) {
                callname = new Base.bits_argument(callname, _bits_types[instr.parsed[1]], false, true, true);
            } else {
                known_args_n = Base.arguments(callname);
            }
        } else {
            known_args_n = Base.arguments(callname);
            if (callname.match(/$([er])?[abds][ixl]^/)) {
                is_pointer = true;
            }
        }
        instr = instrs[start + 1];
        if (instr) {
            for (var i = 2; i < instr.parsed.length; i++) {
                var reg = instr.parsed[i];
                if (reg == 'eax' || reg == 'rax' || reg == 'ax' || reg == 'al') {
                    returnval = reg;
                    _has_changed_return(reg, false, context);
                    break;
                }
            }
        }

        var known_args_n = Base.arguments(callname);
        if (known_args_n == 0 || !start) {
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
                    arg0 = instrs[i].parsed[2];
                    bits = _bits_types[instrs[i].parsed[1]];
                }
                if (op == 'push' && !_is_stack_reg(arg0)) {
                    if (instrs[i].string) {
                        instrs[i].valid = false;
                        args.push(new Base.string(instrs[i].string));
                    } else {
                        args.push(new Base.bits_argument(arg0, bits, false, true, _requires_pointer(instrs[i].string, arg0)));
                    }
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
                if (bad_ax && (arg0 == 'al' || arg0 == 'ax' || arg0 == 'eax' || arg0 == 'rax')) {
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
                    bits = null;
                    args.push(new Base.string(instrs[i].string));
                } else {
                    args.push(new Base.bits_argument(arg0, bits, false, true, _requires_pointer(instrs[i].string, arg0)));
                }
            }
            args = _call_fix_args(args);
        }
        return Base.call(_call_fix_name(callname), args, is_pointer || false, returnval);
    }
*/

    var _bits_types = {
        'byte': 8,
        'word': 16,
        'dword': 32,
        'qword': 64,
        'xmmword': 128,
        'ymmword': 256,
        'zmmword': 512
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

    /**
     * Indicates whether a register name is the system's stack pointer.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_stack_reg = function(name) {
        return name && name.match(/\b[re]?sp\b/);
    }

    /**
     * Indicates whether a register name is the system's frame pointer.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_frame_reg = function(name) {
        return name && name.match(/\b[re]?bp\b/);
    }

    /**
     * Indicates whether the current function has an argument named `name`.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_func_arg = function(name, context) {
        return context.args.some(function(a) {
            return (a.name === name);
        });
    };

    /**
     * Indicates whether the current function has a local variable named `name`.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_local_var = function(name, context) {
        return context.vars.some(function(v) {
            return (v.name === name);
        });
    };

    var _is_stack_based_local_var = function(name, context) {
        return context.vars.some(function(v) {
            return (v.name === name) && (_is_stack_reg(v.ref.base));
        });
    };

    var _get_var_offset = function(name, context) {
        // TODO: could be done simply with 'find' on ES6
        var info = null;

        context.vars.forEach(function(v) {
            if (v.name == name) {
                info = v;
            }
        });

        return info ? info.ref.offset.low : undefined;
    };

    var _has_changed_return = function(reg, signed, context) {
        if (_return_regs_bits[reg] > context.returns.bits) {
            context.returns.bits = _return_regs_bits[reg];
            context.returns.signed = signed;
        }
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
                'h': 8,
                'l': 8,
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
        var dst = e.opd[0]; // target register or memory
        var val = e.opd[1]; // value operand
        _has_changed_return(dst.token, true, context);

        // stack manipulations are ignored
        if (_is_stack_reg(dst.token) || _is_frame_reg(dst.token)) {
            return null;
        }

        // no value operand, only target
        if (val.token == undefined) {
            var arg = dst.mem_access && !dst.is_frame ?
                Variable.pointer(dst.token, Extra.to.type(dst.mem_access, true)) :
                Variable.local(dst.token, Extra.to.type(bits, false));

            context.returns.bits = dst.mem_access || _find_bits(dst.token);
            context.returns.signed = true;

            var oparg = {
                16: 'dx:ax',
                32: 'edx:eax',
                64: 'rax'
            }[context.returns.bits];

            return op(oparg, oparg, arg);
        } else if (dst.mem_access && !dst.is_frame) {
            var arg = Variable.pointer(dst.token, Extra.to.type(dst.mem_access, true));

            return op(arg, arg, val.token);
        } else if (val.mem_access && !val.is_frame) {
            var arg = Variable.pointer(val.token, Extra.to.type(val.mem_access, true));

            return op(dst.token, dst.token, arg);
        }

        // neither target nor value access memory
        var arg = Variable.local(dst.token, Extra.to.type(bits, true));

        return op(arg, arg, val.token);
    };

    var _memory_cmp = function(lhand, rhand, cond) {
        if (lhand.mem_access && !lhand.is_frame) {
            cond.a = Variable.pointer(lhand.token, Extra.to.type(lhand.mem_access, true));
            cond.b = rhand.token;
        } else if (rhand.mem_access && !rhand.is_frame) {
            cond.a = lhand.token;
            cond.b = Variable.pointer(rhand.token, Extra.to.type(rhand.mem_access, true));
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
        return Base.nop();
    };

    var _compare = function(instr, context) {
        var lhand = instr.parsed.opd[0];
        var rhand = instr.parsed.opd[1];

        if (lhand.mem_access || rhand.mem_access) {
            _memory_cmp(lhand, rhand, context.cond);
        } else {
            context.cond.a = lhand.token;
            context.cond.b = rhand.token;
            context.cond.is_incdec = false;
        }

        return Base.nop();
    };

    var _requires_pointer = function(string, arg) {
        return string == null && Extra.is.string(arg) && (arg.startsWith('local_') || arg == 'esp');
    };

    var _guess_cdecl_nargs = function(instrs, context) {
        var nargs = 0;

        for (var i = (instrs.length - 1); i >= 0; i--) {
            var mnem = instrs[i].parsed.mnem;
            var opd1 = instrs[i].parsed.opd[0];

            // a "push" instruction which is not the function's prologue indicates
            // that it is probably a function's argument 
            if ((mnem === 'push') && !_is_frame_reg(opd1.token)) {
                nargs++;
            } else if (mnem === 'mov' && ((opd1.mem_access && _is_stack_reg(opd1.token)) || _is_stack_based_local_var(opd1.token, context))) {
                nargs++;
            } else if ((mnem === 'add') && _is_stack_reg(opd1.token)) {
                // reached the previous function call cleanup
                break;
            } else if (mnem === 'call') {
                // reached the previous function call
                break;
            }
        }

        return nargs;
    };

    var _guess_amd64_nargs = function(instrs, context) {
        var nargs = 0;

        // TODO: implement this

        return nargs;
    };

    var _populate_cdecl_call_args = function(instrs, nargs, context) {
        var args = [];
        var argidx = 0;

        for (var i = (instrs.length - 1);
            (i >= 0) && (nargs > 0); i--) {
            var mnem = instrs[i].parsed.mnem;
            var opd1 = instrs[i].parsed.opd[0];
            var opd2 = instrs[i].parsed.opd[1];

            // passing argument by referring to stack pointer
            if (mnem === 'mov') {
                var offset;

                // opd1.token may be set to a variable name, and therefore mask the stack pointer dereference. for that
                // reason we also check whether it is appears as a stack variable, to extract its offset from stacl pointer.
                // another option would be undefining that variable manually using "afvs-"

                if (opd1.mem_access && _is_stack_reg(opd1.token)) {
                    var ptr = opd1.token.match(/[er]?sp(?:\s+\+\s+(\d+))/);

                    offset = ptr ? parseInt(ptr[1]) : 0;
                } else if (_is_stack_based_local_var(opd1.token, context)) {
                    offset = Math.abs(_get_var_offset(opd1.token, context));
                } else {
                    // an irrelevant 'mov' isntruction; nothing to do here
                    continue;
                }

                var arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable.pointer(opd2.token, Extra.to.type(opd2.mem_access, false));

                instrs[i].valid = false;
                args[offset / (context.archbits / 8)] = arg;
                nargs--;
            }

            // passing argument by pushing them to stack
            if (mnem === 'push') {
                var arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable.pointer(opd1.token, Extra.to.type(opd1.mem_access, false));

                instrs[i].valid = false;
                args[argidx++] = arg;
                nargs--;
            }
        }

        return args;
    };

    var _populate_amd64_call_args = function(instrs, nargs, context) {
        var amd64 = {
            'rdi': 0,
            'edi': 0,
            'rsi': 1,
            'esi': 1,
            'rdx': 2,
            'edx': 2,
            'rcx': 3,
            'ecx': 3,
            'r10': 3,
            'r10d': 3, // kernel interface uses r10 instead of rcx
            'r8': 4,
            'r8d': 4,
            'r9': 5,
            'r9d': 5
        };

        var args = [];

        for (var i = (instrs.length - 1);
            (i >= 0) && (nargs > 0); i--) {
            var opd1 = instrs[i].parsed.opd[0];
            var opd2 = instrs[i].parsed.opd[1];

            var argidx = amd64[opd1.token];

            // destination operand is an amd64 systemv argument, and has not been considered yet
            // TODO: being first operand doesn't necessarily mean it is a definition [e.g. 'div', 'mul']
            if (opd1.token in amd64 && (args[argidx] == undefined)) {
                var arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable.pointer(opd2.token, Extra.to.type(opd2.mem_access, false));

                instrs[i].valid = false;
                args[argidx] = arg;
                nargs--;
            }
        }

        return args;
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        instr.setBadJump();
        var start = instrs.indexOf(instr);

        var callsite = instr.parsed.opd[0];

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
                var dst = instrs[i].parsed.opd[0].token;
                var src = instrs[i].parsed.opd[1].token;

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
                } else if (mnem.match(/\b(call|i?div|i?mul|lods[bwdq]?|in(?:s[bwd]?)?)\b/)) {
                    // register used to store returned value is clobbered
                    break;
                }
            }
        }

        var args = [];
        var callee = instr.callee;

        if (callee) {
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
            var nargs = callee.name.startsWith('sym.imp.') ?
                Extra.find.arguments_number(callee.name) :
                callee.nargs;

            // if number of arguments is unknown (either an unrecognized or a variadic function),
            // try to guess the number of arguments
            if (nargs == (-1)) {
                nargs = guess_nargs(instrs.slice(0, start), context);
            }

            args = populate_call_args(instrs.slice(0, start), nargs, context);
        }
        var callname = instr.symbol || callsite.token;
        if (callsite.mem_access && callname.startsWith('0x')) {
            callname = Variable.functionPointer(callname.token, callname.mem_access, args);
        } else if (is_pointer || (!callsite.mem_access && callname.match(/\b([er])?[abds][ixl]\b/))) {
            callname = Variable.functionPointer(callname, 0, args);
        }
        var ret = Base.call(callname, args);
        if (_is_last_instruction(instr, instrs)) {
            return Base.return(ret);
        }
        return ret;
    }

    var _standard_mov = function(instr, context) {
        var dst = instr.parsed.opd[0];
        var src = instr.parsed.opd[1];

        _has_changed_return(dst.token, context.returns.signed, context);

        if (dst.mem_access) {
            return Base.write_memory(dst.token, instr.string ? Variable.string(instr.string) : src.token, dst.mem_access, true);
        } else if (src.mem_access) {
            return Base.read_memory(src.token, dst.token, src.mem_access, true);
        } else if (_is_stack_reg(dst.token) || _is_frame_reg(dst.token)) {
            return null;
        } else {
            return Base.assign(dst.token, instr.string ? Variable.string(instr.string) : src.token);
        }
    };

    var _extended_mov = function(instr, is_signed, context) {
        var dst = instr.parsed.opd[0];
        var src = instr.parsed.opd[1];

        _has_changed_return(dst.token, true, context);

        if (dst.mem_access) {
            return Base.write_memory(dst.token, src.token, dst.mem_access, is_signed);
        } else if (src.mem_access) {
            return Base.read_memory(src.token, dst.token, src.mem_access, is_signed);
        } else {
            return Base.cast(dst.token, src.token, Extra.to.type(_bits_types['dword'], true));
        }
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].location;
    };

    var _is_last_instruction = function(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    }

    var _is_jumping_externally = function(e, a) {
        return e.jump && (e.jump.gt(a[(a.length - 1)].location) || e.jump.lt(a[0].location))
    };

    return {
        instructions: {
            inc: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                context.cond.a = dst.token;
                context.cond.b = '0';
                return Base.increase(dst.token, '1');
            },
            dec: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                context.cond.a = dst.token;
                context.cond.b = '0';
                context.cond.is_incdec = true;
                return Base.decrease(dst.token, '1');
            },
            add: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.add, null, context);
            },
            sub: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.subtract, null, context);
            },
            sbb: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.subtract, null, context);
            },
            sar: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_right, null, context);
            },
            sal: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_left, null, context);
            },
            shr: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_right, null, context);
            },
            shl: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.shift_left, null, context);
            },
            and: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.and, null, context);
            },
            or: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.or, null, context);
            },
            xor: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.xor, null, context);
            },
            pxor: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.xor, null, context);
            },
            idiv: function(instr, context, instructions) {
                var divisor = instr.parsed.opd[0];
                var divisor_is_ptr = (divisor.mem_access != undefined);
                var divisor_size = _find_bits(divisor.token);

                var dividend = {
                    8: ['ax'],
                    16: ['dx', 'ax'],
                    32: ['edx', 'eax'],
                    64: ['rdx', 'rax']
                }[divisor_size];

                var remainder = {
                    8: 'ah',
                    16: 'dx',
                    32: 'edx',
                    64: 'rdx',
                }[divisor_size];

                var quotient = {
                    8: 'al',
                    16: 'ax',
                    32: 'eax',
                    64: 'rax'
                }[divisor_size];

                _has_changed_return(quotient, true, context);
                var type = divisor_is_ptr ? 'pointer' : 'local';
                var arg_dividend = Variable[type](dividend.join(':'), Extra.to.type(divisor_size, true));
                var arg_quotient = Variable.local(quotient, Extra.to.type(divisor_size, false));
                var arg_remainder = Variable.local(remainder, Extra.to.type(divisor_size, false));

                return Base.composed([
                    Base.divide(arg_quotient, arg_dividend, divisor.token),
                    Base.module(arg_remainder, arg_dividend, divisor.token)
                ]);
            },
            imul: function(instr, context, instructions) {
                return _common_math(instr.parsed, Base.multiply, null, context);
            },
            neg: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.negate(dst.token, dst.token);
            },
            not: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, false, context);
                return Base.not(dst.token, dst.token);
            },
            lea: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var val = instr.parsed.opd[1];

                // compilers like to perform calculations using 'lea' instructions in the
                // following form: [reg + reg*n] --> reg * (n+1)
                var calc = val.token.match(/([er]?[abds][ixl])\s*\+\s*\1\s*\*(\d)/);

                if (calc) {
                    return Base.multiply(dst.token, calc[1], calc[2] - 0 + 1 + "");
                }

                // if val is an argument or local variable, it is its address that is taken
                var amp = _is_func_arg(val.token, context) || _is_local_var(val.token, context);
                var arg = instr.string ?
                    Variable.string(instr.string) :
                    (amp ? '&' : '') + val.token.replace(/\./g, '_');

                _has_changed_return(dst.token, false, context);
                return Base.assign(dst.token, arg);
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
                var dst = instr.parsed.opd[0];
                return Base.swap_endian(dst.token, dst.token, _find_bits(dst.token));
            },
            mov: _standard_mov,
            movabs: _standard_mov,
            cbw: function(instr, context) {
                _has_changed_return('ax', true, context);
                return Base.cast('ax', 'al', Extra.to.type(16, true));
            },
            cwde: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.cast('eax', 'ax', Extra.to.type(32, true));
            },
            cdq: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.cast('edx:eax', 'eax', Extra.to.type(64, true));
            },
            cdqe: function(instr, context) {
                _has_changed_return('rax', true, context);
                return Base.cast('rax', 'eax', Extra.to.type(64, true));
            },
            movsx: function(instr, context) {
                return _extended_mov(instr, true, context);
            },
            movsxd: function(instr, context) {
                return _extended_mov(instr, true, context);
            },
            movzx: function(instr, context) {
                return _extended_mov(instr, false, context);
            },
            seta: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setae: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setb: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setbe: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            sete: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' == ' + context.cond.b + ') ? 1 : 0');
            },
            setg: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' > ' + context.cond.b + ') ? 1 : 0');
            },
            setge: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' >= ' + context.cond.b + ') ? 1 : 0');
            },
            setl: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' < ' + context.cond.b + ') ? 1 : 0');
            },
            setle: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' <= ' + context.cond.b + ') ? 1 : 0');
            },
            setne: function(instr, context) {
                var dst = instr.parsed.opd[0];

                _has_changed_return(dst.token, true, context);
                return Base.assign(dst.token, '(' + context.cond.a + ' != ' + context.cond.b + ') ? 1 : 0');
            },
            nop: function(instr, context, instructions) {
                var index = instructions.indexOf(instr);

                if ((index == (instructions.length - 1)) &&
                    (instructions[index - 1].parsed.mnem === 'call') &&
                    (instructions[index - 1].pseudo.ctx.indexOf('return') != 0)) {
                    instructions[index - 1].pseudo.ctx = 'return ' + instructions[index - 1].pseudo.ctx;
                }

                return Base.nop();
            },
            leave: function(instr, context) {
                return Base.nop();
            },
            rol: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var val = instr.parsed.opd[1];

                _has_changed_return(dst.token, context.returns.signed, context);
                return Base.rotate_left(dst.token, dst.token, val.token, _find_bits(dst.token));
            },
            ror: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var val = instr.parsed.opd[1];

                _has_changed_return(dst.token, context.returns.signed, context);
                return Base.rotate_right(dst.token, dst.token, val.token, _find_bits(dst.token));
            },
            jmp: function(instr, context, instructions) {
                var dst = instr.parsed.opd[0];

                if (dst.mem_access && (dst.token.startsWith('reloc.') || _is_jumping_externally(instr, instructions))) {
                    return Base.call(dst.token);
                } else if ((dst.mem_access == undefined) && (['rax', 'eax'].indexOf(dst.token) > (-1))) {
                    return _call_function(instr, context, instructions, true);
                } else if (_is_last_instruction(instr, instructions) && dst.mem_access) {
                    return _call_function(instr, context, instructions, _requires_pointer(instr.string, dst.mem_access));
                }

                return Base.nop()
            },
            cmp: _compare,
            test: function(instr, context, instructions) {
                var lhand = instr.parsed.opd[0];
                var rhand = instr.parsed.opd[1];

                if (lhand.mem_access || rhand.mem_access) {
                    _memory_cmp(lhand, rhand, context.cond);
                } else {
                    context.cond.a = (lhand.token === rhand.token) ? lhand.token : "(" + lhand.token + " & " + rhand.token + ")";
                    context.cond.b = '0';
                }

                return Base.nop();
            },
            ret: function(instr, context, instructions) {
                var register = _return_types[context.returns.bits.toString()];

                if (_is_last_instruction(instr, instructions) && (register == '')) {
                    return Base.nop();
                }
                return Base.return(register);
            },
            push: function(instr, context, instructions) {
                instr.valid = false;

                var val = instr.parsed.opd[0];

                return val.mem_access ?
                    Variable.pointer(val.token, Extra.to.type(val.mem_access, false)) :
                    Variable.local(val.token);
            },
            pop: function(instr, context, instructions) {
                for (var i = instructions.indexOf(instr) - 1; i >= 0; i--) {
                    var mnem = instructions[i].parsed.mnem;
                    var opd1 = instructions[i].parsed.opd[0];

                    // push 1
                    // ...       -->    eax = 1
                    // pop eax
                    if (mnem === 'push') {
                        return Base.assign(instr.parsed.opd[0].token, instructions[i].string ? Variable.string(instructions[i].string) : opd1.token);
                    } else if ((mnem === 'call') || _is_stack_reg(opd1.token)) {
                        break;
                    }
                }

                if (instr.parsed.opd[0].token.match(/([er])?[abds][ixl]/)) {
                    context.returns.bits = 0;
                    context.returns.signed = false;
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
                return Base.return(Base.call('_hlt', []));
            },
            invalid: function() {
                return Base.nop();
            }
        },
        custom_start: function(instrs, context) {
            instrs.forEach(function(i) {
                var opd1 = i.parsed.opd[0];
                var opd2 = i.parsed.opd[1];

                // if dst is an argument or local variable, it should not appear as memory access
                if (_is_func_arg(opd1.token, context) ||
                    _is_local_var(opd1.token, context)) {
                    opd1.mem_access = undefined;
                }

                // attach segment override to operand token, if both exist
                if (opd1.segovr && opd1.token) {
                    opd1.token = opd1.segovr + opd1.token;
                }

                // if src is an argument or local variable, it should not appear as memory access
                if (_is_func_arg(opd2.token, context) ||
                    _is_local_var(opd2.token, context)) {
                    opd2.mem_access = undefined;
                }

                // attach segment override to operand token, if both exist
                if (opd2.segovr && opd2.token) {
                    opd2.token = opd2.segovr + opd2.token;
                }
            });
        },
        custom_end: function(instructions, context) {
            // empty
        },
        parse: function(assembly, simplified) {
            // asm string will be tokenized by the following regular expression:
            //
            // (?:(repn?[ez]?|lock)\s+)?                   : instruction prefix
            // (\w+)                                       : instruction mnemonic
            // (?:\s+
            //     (byte|(?:[dq]|[xyz]mm)?word)            : first operand's memory access qualifier
            // )?
            // (?:\s*
            //     ([d-g]s:)?                              : optional segment override
            //     (?:\[?)                                 : optional opening bracket (stripped)
            //     ([^\[\],]+)                             : first operand
            //     (?:\]?)                                 : optional closing bracket (stripped)
            // )?
            // (?:,                                        : separating comma
            //     (?:\s+
            //         (byte|(?:[dq]|[xyz]mm)?word)        : second operand's memory access qualifier
            //     )?
            //     (?:\s*
            //         ([d-g]s:)?                          : optional segment override
            //         (?:\[?)                             : optional opening bracket (stripped)
            //         ([^\[\],]+)                         : second operand
            //         (?:\]?)                             : optional closing bracket (stripped)
            //     )?
            // )?
            var parse_regex = /(?:(repn?[ez]?|lock)\s+)?(\w+)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*([d-g]s:)?(?:\[?)([^\[\],]+)(?:\]?))?(?:(?:,)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*([d-g]s:)?(?:\[?)([^\[\],]+)(?:\]?))?)?/;

            var simplified_tokens = simplified.match(parse_regex);
            var assembly_tokens = assembly.match(parse_regex);

            // assembly_tokens[0]: match string; irrelevant
            // assembly_tokens[1]: instruction prefix; undefined if no prefix
            // assembly_tokens[2]: instruction mnemonic
            // assembly_tokens[3]: first operand's memory access qualifier; undefined if no qualifier or no operands
            // assembly_tokens[4]: segment override for first operand; undefined if no segment override or no operands
            // assembly_tokens[5]: first operand; undefined if no operands
            // assembly_tokens[6]: second operand's memory access qualifier; undefined if no qualifier or no second operand
            // assembly_tokens[7]: segment override for second operand; undefined if no segment override or no second operand
            // assembly_tokens[8]: second operand; undefined if no second operand

            var prefix = assembly_tokens[1]
            var mnemonic = assembly_tokens[2];

            var operand1 = {
                mem_access: _bits_types[assembly_tokens[3]],
                segovr: assembly_tokens[4],
                token: assembly_tokens[5],
                is_frame: _is_frame_reg(simplified_tokens[5])
            };

            var operand2 = {
                mem_access: _bits_types[assembly_tokens[6]],
                segovr: assembly_tokens[7],
                token: assembly_tokens[8],
                is_frame: _is_frame_reg(simplified_tokens[8])
            };

            return {
                pref: prefix,
                mnem: mnemonic,
                opd: [operand1, operand2]
            };
        },
        context: function(data) {
            var fcnargs = data.xrefs.arguments;
            var vars_args = fcnargs.bp.concat(fcnargs.sp).concat(fcnargs.reg).map(function(x) {
                if (x.type === 'int' || x.type === 'signed int') {
                    x.type = (Global.evars.archbits < 32) ? 'int16_t' : 'int32_t';
                } else if (x.type === 'unsigned int') {
                    x.type = (Global.evars.archbits < 32) ? 'uint16_t' : 'uint32_t';
                }

                return x;
            });

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
                    return (e.kind === 'var');
                }),
                args: vars_args.filter(function(e) {
                    return (e.kind === 'arg' || e.kind === 'reg');
                })
            }
        },
        localvars: function(context) {
            return context.vars.map(function(v) {
                return v.type + ' ' + v.name;
            });
        },
        arguments: function(context) {
            return context.args.length == 0 ?
                ['void'] :
                context.args.map(function(v) {
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