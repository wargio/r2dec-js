/* 
 * Copyright (C) 2017-2018 deroad, elicn
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
            instr.setBadJump();
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
                            args.push(Variable.string(instrs[i].string));
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
                        args.push(Variable.string(instrs[i].string));
                    } else {
                        args.push(new Base.bits_argument(arg0, bits, false, true, _requires_pointer(instrs[i].string, arg0)));
                    }
                }
                args = _call_fix_args(args);
            }
            return Base.call(_call_fix_name(callname), args, is_pointer || false, returnval);
        }
    */

    /**
     * Maps a memory access qualifier to its corresponding size in bits.
     * @type {Object.<string,number>}
     * */
    var _bits_types = {
        'byte': 8,
        'word': 16,
        'dword': 32,
        'qword': 64,
        'xmmword': 128,
        'ymmword': 256,
        'zmmword': 512
    };

    /**
     * Maps a return size to its corresponding return register. This is used to
     * determine which register is used to return a value of a given size.
     * @type {Object.<number,string>}
     */
    var _return_types = {
        8: 'al',
        16: 'ax',
        32: 'eax',
        64: 'rax',
    };

    /**
     * Maps a return register to its corresponding size in bits, This is used to
     * determine the size of the returned value according to the register that is
     * used to return it.
     * @type {Object.<string,number>}
     */
    var _return_regs_bits = {
        'al': 8,
        'ax': 16,
        'eax': 32,
        'rax': 64,
    };

    /**
     * Registers in x86/x64 arch
     */
    var _x86_x64_registers = [
        'rax', 'eax', 'ax', 'al',
        'rbx', 'ebx', 'bx', 'bl',
        'rcx', 'ecx', 'cx', 'cl',
        'rdx', 'edx', 'dx', 'dl',
        'rsi', 'esi', 'si', 'sil',
        'rdi', 'edi', 'di', 'dil',
        'rbp', 'ebp', 'bp', 'bpl',
        'rsp', 'esp', 'sp', 'spl',
        'r8', 'r8d', 'r8w', 'r8b',
        'r9', 'r9d', 'r9w', 'r9b',
        'r10', 'r10d', 'r10w', 'r10b',
        'r11', 'r11d', 'r11w', 'r11b',
        'r12', 'r12d', 'r12w', 'r12b',
        'r13', 'r13d', 'r13w', 'r13b',
        'r14', 'r14d', 'r14w', 'r14b',
        'r15', 'r15d', 'r15w', 'r15b'
    ];

    // /**
    //  * A lookup table for inverting conditional codes
    //  * @type {Object.<string,string>}
    //  */
    // var _inverse_cc = {
    //     'EQ': 'NE',
    //     'NE': 'EQ',
    //     'LT': 'GE',
    //     'GE': 'LT',
    //     'GT': 'LE',
    //     'LE': 'GT'
    // };

    var _REGEX_STACK_REG = /^[re]?sp$/;

    /**
     * Indicates whether a register name is the system's stack pointer.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_stack_reg = function(name) {
        return name && _REGEX_STACK_REG.test(name);
    };

    var _REGEX_FRAME_REG = /^[re]?bp$/;

    /**
     * Indicates whether a register name is the system's frame pointer.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_frame_reg = function(name) {
        return name && _REGEX_FRAME_REG.test(name);
    };

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
        var info;

        context.vars.forEach(function(v) {
            if (v.name == name) {
                info = v;
            }
        });

        return info ? info.ref.offset.low : undefined;
    };

    /**
     * Updates function's return value properties if necessary. This is used to
     * track the result register in order to determine what the function is going
     * to return (if any) in terms of exact register name and size.
     * If given register is not a return value register, nothing is changed.
     * 
     * @param {string} reg Modified register name
     * @param {boolean} signed Value is signed?
     * @param {object} context Conetxt object
     */
    var _has_changed_return = function(reg, signed, context) {
        if (_return_regs_bits[reg] > context.returns.bits) {
            context.returns.bits = _return_regs_bits[reg];
            context.returns.signed = signed;
        }
    };

    /**
     * Determines the size (in bits) of a given register name.
     * @param {string} reg Register name
     * @returns {!number}
     */
    var _find_bits = function(reg) {
        var elems = reg.match(/([re])?(.?[^dwhl]?)([dwhl])?/);

        // reg string will be splitted into an array of 4, where:
        //   [0]: match string
        //   [1]: prefix (either 'r', 'e' or undefined)
        //   [2]: reg name
        //   [3]: suffix (either 'h', 'l', 'w', 'd' or undefined)
        //
        // when coming to determine the register size, the aforementioned elements are inspected in a certain order
        // to look at the first that it isn't undefined: suffix -> prefix -> name

        var sz = 32;

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

    /**
     * Handles most of arithmetic and bitwise operations.
     * @param {object} p Parsed instruction structure
     * @param {object} op Operator constructor to use
     * @param {boolean} flags Whether this operation affects system's flags (for conditions)
     * @param {object} context Context object
     */
    var _math_common = function(p, op, flags, context) {
        var lhand = p.opd[0];
        var rhand = p.opd[1];
        var signed = context.returns.signed;

        // stack pointer manipulations are ignored
        if (_is_stack_reg(lhand.token)) {
            return null;
        }

        _has_changed_return(lhand.token, signed, context);

        var lhand_arg = lhand.mem_access ? Variable.pointer(lhand.token, lhand.mem_access, signed) : lhand.token;
        var rhand_arg = rhand.mem_access ? Variable.pointer(rhand.token, rhand.mem_access, signed) : rhand.token;

        if (flags) {
            context.cond.a = lhand_arg;
            context.cond.b = '0';
        }

        // lhand = lhand op rhand
        return op(lhand_arg, lhand_arg, rhand_arg);
    };

    /**
     * Handles arithmetic divisions.
     * @param {object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {object} context Context object
     */
    var _math_divide = function(p, signed, context) {
        var divisor = p.opd[0];
        var divisor_is_ptr = !!divisor.mem_access;
        var osize = divisor.mem_access || _find_bits(divisor.token);

        var dividend = {
            8: ['ax'],
            16: ['dx', 'ax'],
            32: ['edx', 'eax'],
            64: ['rdx', 'rax']
        }[osize];

        var remainder = {
            8: 'ah',
            16: 'dx',
            32: 'edx',
            64: 'rdx',
        }[osize];

        var quotient = {
            8: 'al',
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[osize];

        _has_changed_return(quotient, signed, context);
        var dividend_type = divisor_is_ptr ? 'pointer' : 'local';
        var arg_dividend = Variable[dividend_type](dividend.join(':'), osize, signed);
        var arg_quotient = Variable.local(quotient, osize, signed);
        var arg_remainder = Variable.local(remainder, osize, signed);

        // quotient = dividend / divisor
        // remainder = dividend % divisor
        return Base.composed([
            new Base.divide(arg_quotient, arg_dividend, divisor.token),
            new Base.module(arg_remainder, arg_dividend, divisor.token)
        ]);
    };

    /**
     * Handles arithmetic multiplications.
     * @param {object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {object} context Context object
     */
    var _math_multiply = function(p, signed, context) {
        // note: normally there is only one operand, where the multiplier is implicit and determined by the
        // operation size. for some reason r2 has decided to emit the multiplicand register explicitly as the
        // first operand. in order to remain consistent with the standard notation, we'll disregard the first
        // operand and pick the multiplicand register manually.

        var multiplier = p.opd[1]; // should have been opd[0]; see note above
        var multiplier_is_ptr = !!multiplier.mem_access;
        var osize = multiplier.mem_access || _find_bits(multiplier.token);

        var destination = {
            8: ['ax'],
            16: ['dx', 'ax'],
            32: ['edx', 'eax'],
            64: ['rdx', 'rax']
        }[osize];

        var multiplicand = {
            8: 'al',
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[osize];

        _has_changed_return(destination[destination.length - 1], signed, context);

        var multiplier_type = divisor_is_ptr ? 'pointer' : 'local';
        var arg_destination = Variable.local(destination.join(':'), osize * 2, signed, false, false);
        var arg_multiplicand = Variable.local(multiplicand, osize, signed, false, false);
        var arg_multiplier = Variable[dividend_type](multiplier.token, osize, signed);

        // destination = multiplicand * multiplier
        return Base.multiply(arg_destination, arg_multiplicand, arg_multiplier);
    };

    var _bitwise_rotate = function(p, op, context) {
        var lhand = p.opd[0];
        var rhand = p.opd[1];
        var signed = context.returns.signed;

        _has_changed_return(lhand.token, signed, context);

        var lhand_arg = lhand.mem_access ? Variable.pointer(lhand.token, lhand.mem_access, signed) : lhand.token;
        var rhand_arg = rhand.mem_access ? Variable.pointer(rhand.token, rhand.mem_access, signed) : rhand.token;

        // lhand = lhand op rhand
        return op(lhand_arg, lhand_arg, rhand_arg, lhand.mem_access || _find_bits(lhand.token));
    };

    /**
     * Handles SETcc instructions.
     * @param {object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {string} condition Operation string literal
     * @param {object} context Context object
     */
    var _setcc_common = function(p, signed, condition, context) {
        var dest = p.opd[0];

        _has_changed_return(dest.token, signed, context);
        // destination, source_a, source_b, cond, src_true, src_false
        return Base.conditional_assign(dest.token, context.cond.a, context.cond.b, condition, '1', '0');
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _check_known_neg = function(x) {
        if (x == '0xffffffffffffffff') {
            return '-1'
        } else if (Global.evars.archbits == 32 && x == '0xffffffff') {
            return '-1'
        }
        return x;
    }

    var _get_cond_params = function(p) {
        var lhand = p.opd[0];
        var rhand = p.opd[1];

        return {
            a: lhand.mem_access ? Variable.pointer(_check_known_neg(lhand.token), lhand.mem_access, true) : _check_known_neg(lhand.token),
            b: rhand.mem_access ? Variable.pointer(_check_known_neg(rhand.token), rhand.mem_access, true) : _check_known_neg(rhand.token),
        };
    };

    var _requires_pointer = function(string, arg, context) {
        return string == null && arg && (_is_local_var(arg, context) || _is_stack_reg(arg));
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
                    Variable[opd2.mem_access ? 'pointer' : 'local'](opd2.token, Extra.to.type(opd2.mem_access, false));

                instrs[i].valid = false;
                args[offset / (Global.evars.archbits / 8)] = arg;
                nargs--;
            }

            // passing argument by pushing them to stack
            if (mnem === 'push') {
                var arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable.pointer(opd1.token, opd1.mem_access, false);

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
            if (opd1.token in amd64 && (args[argidx] == undefined) && opd2.token) {
                var arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable[opd2.mem_access ? 'pointer' : 'local'](opd2.token, Extra.to.type(opd2.mem_access, false));

                instrs[i].valid = false;
                args[argidx] = arg;
                nargs--;
            }
        }

        return args.filter(function(x) {
            return x;
        });
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        var start = instrs.indexOf(instr);

        var callsite = instr.parsed.opd[0];
        var callname = callsite.token;

        // indicates the function call return type (if used)
        var returnval = null;

        // is this a tail call?
        if (_is_last_instruction(instr, instrs) && _x86_x64_registers.indexOf(callname) > -1) {
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
        var call = Base.call(callname, args);

        if (returnval == 'return') {
            // this is true only if the jump is done
            // via the value in a x86/x64 register
            // so ControlFlow function cannot detect 
            // it as a jump because is missing this data.
            return Base.return(call);
        } else if (returnval) {
            return Base.assign(returnval, call);
        }
        return call;
    };

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
            var arg = instr.string ?
                Variable.string(instr.string) :
                Variable[src.mem_access ? 'pointer' : 'local'](src.token, src.mem_access, false);

            return Base.assign(dst.token, arg);
        }
    };

    /**
     * Hanldes assignments that require size extension.
     * @param {object} p Parsed instruction structure
     * @param {boolean} signed Signed operation
     * @param {object} context Context structure
     */
    var _extended_mov = function(p, signed, context) {
        var dst = p.opd[0];
        var src = p.opd[1];

        _has_changed_return(dst.token, signed, context);

        if (src.mem_access) {
            return Base.read_memory(src.token, dst.token, src.mem_access, signed);
        } else {
            return Base.cast(dst.token, src.token, Extra.to.type(_find_bits(dst.token), true));
        }
    };

    var _string_common = function(instr, context) {

        // possible instructions:
        //  o lods  : lhand = rhand;            rhand += osize;
        //  o stos  : lhand = rhand;            lhand += osize;
        //  o movs  : lhand = rhand;            rhand += osize; lhand += osize;
        //  o cmps  : $zf = cmp(lhand, rhand);  rhand += osize; lhand += osize;
        //  o scas  : $zf = cmp(lhand, rhand);  rhand += osize;

        var p = instr.parsed;
        var lhand = p.opd[0];
        var rhand = p.opd[1];

        // scasd eax, dword es:[edi]
        // cmpsd dword [esi], dword ptr es:[edi]
        // lodsd eax, dword [esi]
        // stosd dword es:[edi], eax
        // movsd dword es:[edi], dword ptr [esi]

        var reciept = {
            'lods': [lhand, rhand, [rhand]],
            'stos': [lhand, rhand, [lhand]],
            'movs': [lhand, rhand, [rhand, lhand]],
            //  'cmps': [$zf, cmp(lhand, rhand), [rhand, lhand]],
            //  'scas': [$zf, cmp(lhand, rhand) ,[rhand]]
        }[p.mnem.substr(0, 4)];

        // TODO: the direction in which the source and destination pointers are going depedns on the value of the direction flag.
        // normally the direction flag is cleared just before a string operation using the "cld" instruction, but this is not necessarily
        // the case. however, since we do not keep track of the df value (yet), we have no way to know for sure whether it is set (pointers
        // are decreasing) or cleared (pointers are increasing).
        //
        // tracking the "cld" and "std" instruction may not be sufficient since the flags register might be modified in various ways, e.g. by
        // combinig a "pushf" and a "popf" instructions with some bitwise manipulation in between. until this is taken care of, we may just
        // assume that the direction flag is cleared.
        var dflag = 0;

        var incdec = dflag ?
            Base.decrease :
            Base.increase;

        var counter = {
            16: 'cx',
            32: 'ecx',
            64: 'rcx'
        }[Global.evars.archbits];

        // possible prefixes:
        //  o rep
        //  o repe / repz
        //  o repne / repnz

        // TODO: e|z and ne|nz suffixes are relevant only for "scas" and "cmps", which are currently not supported
        var loop = p.pref.match(/(rep)(n)?([ze])?/);

        if (loop) {
            instr.conditional(counter, '0', 'NE');
            instr.jump = instr.loc;
        }

        var dst = reciept[0];
        var src = reciept[1];
        var inc = reciept[2];
        var ops = [];

        // assignment
        var assign_dst = Variable[dst.mem_access ? 'pointer' : 'local'](dst.token, dst.mem_access, false);
        var assign_src = Variable[src.mem_access ? 'pointer' : 'local'](src.token, src.mem_access, false);
        ops.push(Base.assign(assign_dst, assign_src));

        // loop counter decrement
        if (loop) {
            ops.push(Base.decrease(counter, 1));
        }

        // source and destination pointers increment / decrement
        ops = ops.concat(inc.map(function(r) {
            return incdec(r.token, (dst.mem_access || src.mem_access) / 8);
        }));

        // TODO: if (loop[3]) add a condition that tests $zf and break if (loop[2] ? clear : set)

        return Base.composed(ops);
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].location;
    };

    var _is_last_instruction = function(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    };

    var _is_jumping_externally = function(instr, a) {
        return instr.jump && (instr.jump.gt(a[(a.length - 1)].location) || instr.jump.lt(a[0].location));
    };

    return {
        instructions: {
            inc: function(instr, context) {
                instr.parsed.opd[1].token = '1'; // dirty hack :(

                return _math_common(instr.parsed, Base.add, true, context);
            },
            dec: function(instr, context) {
                instr.parsed.opd[1].token = '1'; // dirty hack :(

                return _math_common(instr.parsed, Base.subtract, true, context);
            },
            add: function(instr, context) {
                return _math_common(instr.parsed, Base.add, true, context);
            },
            sub: function(instr, context) {
                return _math_common(instr.parsed, Base.subtract, true, context);
            },
            sbb: function(instr, context) {
                return _math_common(instr.parsed, Base.subtract, true, context);
            },
            sar: function(instr, context) {
                return _math_common(instr.parsed, Base.shift_right, true, context);
            },
            sal: function(instr, context) {
                return _math_common(instr.parsed, Base.shift_left, true, context);
            },
            shr: function(instr, context) {
                return _math_common(instr.parsed, Base.shift_right, true, context);
            },
            shl: function(instr, context) {
                return _math_common(instr.parsed, Base.shift_left, true, context);
            },
            and: function(instr, context) {
                return _math_common(instr.parsed, Base.and, true, context);
            },
            or: function(instr, context) {
                return _math_common(instr.parsed, Base.or, true, context);
            },
            xor: function(instr, context) {
                return _math_common(instr.parsed, Base.xor, false, context);
            },
            pand: function(instr, context) {
                return _math_common(instr.parsed, Base.and, false, context);
            },
            por: function(instr, context) {
                return _math_common(instr.parsed, Base.or, false, context);
            },
            pxor: function(instr, context) {
                return _math_common(instr.parsed, Base.xor, false, context);
            },
            div: function(instr, context) {
                return _math_divide(instr.parsed, false, context);
            },
            idiv: function(instr, context) {
                return _math_divide(instr.parsed, true, context);
            },
            mul: function(instr, context) {
                return _math_multiply(instr.parsed, false, context);
            },
            imul: function(instr, context) {
                return _math_multiply(instr.parsed, true, context);
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
                var calc = val.token.match(/([re]?(?:[abcd]x|[ds]i)|r(?:1[0-5]|[8-9])[lwd]?)\s*\+\s*\1\s*\*(\d)/);

                if (calc) {
                    return Base.multiply(dst.token, calc[1], parseInt(calc[2]) + 1 + '');
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
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr, context);
            },
            cmovae: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr, context);
            },
            cmovb: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr, context);
            },
            cmovbe: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr, context);
            },
            cmove: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return _standard_mov(instr, context);
            },
            cmovg: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _standard_mov(instr, context);
            },
            cmovge: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _standard_mov(instr, context);
            },
            cmovl: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _standard_mov(instr, context);
            },
            cmovle: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _standard_mov(instr, context);
            },
            cmovne: function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return _standard_mov(instr, context);
            },
            bswap: function(instr, context) {
                var dst = instr.parsed.opd[0];

                return Base.swap_endian(dst.token, dst.token, _find_bits(dst.token));
            },
            mov: _standard_mov,
            movabs: _standard_mov,
            cbw: function(instr, context) {
                _has_changed_return('ax', true, context);
                return Base.cast('ax', 'al', 'int16_t');
            },
            cwde: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.cast('eax', 'ax', 'int32_t');
            },
            cdq: function(instr, context) {
                _has_changed_return('eax', true, context);
                return Base.cast('edx:eax', 'eax', 'int64_t');
            },
            cdqe: function(instr, context) {
                _has_changed_return('rax', true, context);
                return Base.cast('rax', 'eax', 'int64_t');
            },
            movsx: function(instr, context) {
                return _extended_mov(instr.parsed, true, context);
            },
            movsxd: function(instr, context) {
                return _extended_mov(instr.parsed, true, context);
            },
            movzx: function(instr, context) {
                return _extended_mov(instr.parsed, false, context);
            },
            seta: function(instr, context) {
                return _setcc_common(instr.parsed, false, 'GT', context);
            },
            setae: function(instr, context) {
                return _setcc_common(instr.parsed, false, 'GE', context);
            },
            setb: function(instr, context) {
                return _setcc_common(instr.parsed, false, 'LT', context);
            },
            setbe: function(instr, context) {
                return _setcc_common(instr.parsed, false, 'LE', context);
            },
            setg: function(instr, context) {
                return _setcc_common(instr.parsed, true, 'GT', context);
            },
            setge: function(instr, context) {
                return _setcc_common(instr.parsed, true, 'GE', context);
            },
            setl: function(instr, context) {
                return _setcc_common(instr.parsed, true, 'LT', context);
            },
            setle: function(instr, context) {
                return _setcc_common(instr.parsed, true, 'LE', context);
            },
            sete: function(instr, context) {
                return _setcc_common(instr.parsed, context.returns.signed, 'EQ', context);
            },
            setne: function(instr, context) {
                return _setcc_common(instr.parsed, context.returns.signed, 'NE', context);
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
                return _bitwise_rotate(instr.parsed, Base.rotate_left, context);
            },
            ror: function(instr, context) {
                return _bitwise_rotate(instr.parsed, Base.rotate_right, context);
            },
            jmp: function(instr, context, instructions) {
                var dst = instr.parsed.opd[0];

                if (dst.mem_access && (dst.token.startsWith('reloc.') || _is_jumping_externally(instr, instructions))) {
                    return Base.call(dst.token);
                } else if (!dst.mem_access && ['rax', 'eax'].indexOf(dst.token) > -1) {
                    return _call_function(instr, context, instructions, true);
                } else if (dst.mem_access) {
                    return _call_function(instr, context, instructions, _requires_pointer(instr.string, dst.mem_access, context));
                }

                return Base.nop()
            },
            cmp: function(instr, context) {
                var c = _get_cond_params(instr.parsed);

                context.cond.a = c.a;
                context.cond.b = c.b;

                return Base.nop();
            },
            test: function(instr, context) {
                var c = _get_cond_params(instr.parsed);

                context.cond.a = (c.a === c.b) ? c.a : '(' + c.a + ' & ' + c.b + ')';
                context.cond.b = '0';

                return Base.nop();
            },
            ret: function(instr, context, instructions) {
                var register = _return_types[context.returns.bits] || '';

                // if the function is not returning anything, discard the empty "return" statement
                if (_is_last_instruction(instr, instructions) && (register === '')) {
                    return Base.nop();
                }

                return Base.return(register);
            },
            push: function(instr, context) {
                instr.valid = false;

                var val = instr.parsed.opd[0];

                return val.mem_access ?
                    new Base.bits_argument(val.token, val.mem_access, false, true, false) :
                    val.token;
            },
            pop: function(instr, context, instrs) {
                var dst = instr.parsed.opd[0];

                // unless this 'pop' restores the frame pointer, look for the
                // assignment pattern, which is commonly used by compilers:
                //      push n  \
                //      ...      } reg = n
                //      pop reg /
                if (!_is_frame_reg(dst.token)) {
                    for (var i = instrs.indexOf(instr); i >= 0; i--) {
                        var mnem = instrs[i].parsed.mnem;
                        var opd1 = instrs[i].parsed.opd[0];

                        if (mnem === 'push') {
                            mnem = 'nop';

                            var value = instrs[i].string ?
                                Variable.string(instrs[i].string) :
                                opd1.token;

                            return Base.assign(dst.opd[0].token, value);
                        } else if ((mnem === 'call') || _is_stack_reg(opd1.token)) {
                            break;
                        }
                    }
                }

                // TODO: poping to gpr resets return value info? why?
                if (dst.token.match(/[er]?[abcds][ixl]/)) {
                    context.returns.bits = 0;
                    context.returns.signed = false;
                }

                return Base.nop();
            },
            lodsb: _string_common,
            lodsw: _string_common,
            lodsd: _string_common,
            lodsq: _string_common,
            stosb: _string_common,
            stosw: _string_common,
            stosd: _string_common,
            stosq: _string_common,
            movsb: _string_common,
            movsw: _string_common,
            movsd: _string_common,
            movsq: _string_common,

            // TODO: these ones are not supported since they require an additional condition to break the loop
            // cmpsb: _string_common,
            // cmpsw: _string_common,
            // cmpsd: _string_common,
            // cmpsq: _string_common,
            // scasb: _string_common,
            // scasw: _string_common,
            // scasd: _string_common,
            // scasq: _string_common,

            jne: function(i, c) {
                return _conditional(i, c, 'NE');
            },
            je: function(i, c) {
                return _conditional(i, c, 'EQ');
            },
            ja: function(i, c) {
                return _conditional(i, c, 'GT');
            },
            jae: function(i, c) {
                return _conditional(i, c, 'GE');
            },
            jb: function(i, c) {
                return _conditional(i, c, 'LT');
            },
            jbe: function(i, c) {
                return _conditional(i, c, 'LE');
            },
            jg: function(i, c) {
                return _conditional(i, c, 'GT');
            },
            jge: function(i, c) {
                return _conditional(i, c, 'GE');
            },
            jle: function(i, c) {
                return _conditional(i, c, 'LE');
            },
            jl: function(i, c) {
                return _conditional(i, c, 'LT');
            },
            js: function(i, c) {
                return _conditional(i, c, 'GE');
            },
            jns: function(i, c) {
                return _conditional(i, c, 'LT');
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
        parse: function(asm) {
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
            var tokens = asm.match(/(?:(repn?[ez]?|lock)\s+)?(\w+)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*([d-g]s:)?(?:\[?)([^\[\],]+)(?:\]?))?(?:(?:,)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*([d-g]s:)?(?:\[?)([^\[\],]+)(?:\]?))?)?/);

            // tokens[0]: match string; irrelevant
            // tokens[1]: instruction prefix; undefined if no prefix
            // tokens[2]: instruction mnemonic
            // tokens[3]: first operand's memory access qualifier; undefined if no qualifier or no operands
            // tokens[4]: segment override for first operand; undefined if no segment override or no operands
            // tokens[5]: first operand; undefined if no operands
            // tokens[6]: second operand's memory access qualifier; undefined if no qualifier or no second operand
            // tokens[7]: segment override for second operand; undefined if no segment override or no second operand
            // tokens[8]: second operand; undefined if no second operand

            var prefix = tokens[1];
            var mnemonic = tokens[2];

            var operand1 = {
                mem_access: _bits_types[tokens[3]],
                segovr: tokens[4],
                token: tokens[5]
            };

            var operand2 = {
                mem_access: _bits_types[tokens[6]],
                segovr: tokens[7],
                token: tokens[8]
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
                    // is_incdec: false
                },
                returns: {
                    bits: 0,
                    signed: true
                },
                vars: vars_args.filter(function(e) {
                    return (e.kind === 'var');
                }) || [],
                args: vars_args.filter(function(e) {
                    return (e.kind === 'arg' || e.kind === 'reg');
                }) || []
            };
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