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
    const Syscalls = require('libdec/db/syscalls');

    /**
     * Maps a return register to its corresponding size in bits, This is used to
     * determine the size of the returned value according to the register that is
     * used to return it.
     * @type {Object<string,number>}
     */
    var _return_regs_bits = {
        'al': 8,
        'ax': 16,
        'eax': 32,
        'rax': 64,
    };

    /**
     * General purpose registers, plus a few others
     * @type {Array.<string>}
     */
    var _x86_x64_registers = [
        'rax', 'eax', 'ax', 'al', 'ah',
        'rbx', 'ebx', 'bx', 'bl', 'bh',
        'rcx', 'ecx', 'cx', 'cl', 'ch',
        'rdx', 'edx', 'dx', 'dl', 'dh',
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

    var _REGEX_STACK_REG = /^[re]?sp$/;

    /**
     * Indicates whether a register name is the system's stack pointer.
     * @param {string} name A string literal
     * @returns {boolean}
     */
    var _is_stack_reg = function(name) {
        return name && _REGEX_STACK_REG.test(name);
    };

    var _is_xmm = function(op) {
        return op.token && op.token.startsWith('xmm');
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
     * Indicates whether the current function has an argument with a specified named.
     * @param {string} name A string literal
     * @returns {boolean} `true` if function has an argument named `name, `false` otherwise
     */
    var _is_func_arg = function(name, context) {
        return context.args.some(function(a) {
            return (a.name === name);
        });
    };

    /**
     * Indicates whether the current function has a local variable named `name`.
     * @param {string} name A string literal
     * @param {Object} context
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

    /**
     * For a given local variable `name`, retreive its offset from the frame pointer. This become handy when
     * local variables are referred by their name, but there is a need to query their offset; e.g. returns
     * 16 when a variable is referred by rbp + 16.
     * @param {string} name A string literal
     * @param {Object} context
     * @returns {number} Offset from frame pointer (in bytes), or undefined if no such variable name or
     * variable exists, but is not on stack
     */
    var _get_var_offset = function(name, context) {
        // TODO: could be done simply with 'find' on ES6, unfortunately Duktape does not recognize it yet
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
     * Queries whether a given instruction is the last instruction in function.
     * @param {Object} instr Instruction instance to check
     * @param {Array<Object>} instructions Array of all instructions in the enclosing function
     * @returns {boolean} `true` if given instruction appears as the last instruction in function, `false` otherwise
     */
    var _is_last_instruction = function(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    };

    /**
     * Queries whether a given instruction jumps to a location external to its enclosing function.
     * @param {Object} instr Instruction instance to check
     * @param {Array<Object>} instructions Array of all instructions in the enclosing function
     * @returns {boolean} `true` if given instruction jumps outside of its enclosing function, `false` otherwise
     */
    var _is_jumping_externally = function(instr, instructions) {
        var first_inst = instructions[0];
        var last_inst = instructions[instructions.length - 1];

        return instr.jump && (instr.jump.gt(last_inst) || instr.jump.lt(first_inst.location));
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
                'e': 32,
                'r': 64
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
     * Get the number of operands populated for this instruction.
     * @param {Object} p Parsed instruction structure
     * @returns {number} Number of populated operands
     */
    var _num_operands = function(p) {
        var operands = p.opd.slice();

        while (operands.length > 0) {
            if (operands.pop().token != undefined) {
                return operands.length + 1;
            }
        }

        return 0;
    };

    /**
     * Handles most of arithmetic and bitwise operations.
     * @param {Object} p Parsed instruction structure
     * @param {Object} op Operator constructor to use
     * @param {boolean} flags Whether this operation affects system's flags (for conditions)
     * @param {Object} context Context object
     * @returns {Object} Instruction instance representing the required operation
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
     * @param {Object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {Object} context Context object
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
     * @param {Object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {Object} context Context object
     * @returns {Object} Multiply instruction instance
     */
    var _math_multiply = function(p, signed, context) {
        var multiplier;
        var multiplicand;
        var destination;

        // operation size: this is determined by the size of the first operand
        var osize = p.opd[0].mem_access || _find_bits(p.opd[0].token);

        // while the "mul" instruction supports only one variant, in which there is only one operand, the
        // "imul" instruction supports three of them: with one, two or three operands. each of which has
        // a different meaning for the operands.

        switch (_num_operands(p)) {
            case 3:
                multiplier   = p.opd[2];
                multiplicand = p.opd[1];
                destination  = [p.opd[0].token];
                break;
            case 2:
                multiplier   = p.opd[1];
                multiplicand = p.opd[0];
                destination  = [p.opd[0].token];
                break;
            case 1:
                multiplier = p.opd[0];

                multiplicand = {
                    token: {
                        8: 'al',
                        16: 'ax',
                        32: 'eax',
                        64: 'rax'
                    }[osize]
                };

                destination = {
                    8: ['ax'],
                    16: ['dx', 'ax'],
                    32: ['edx', 'eax'],
                    64: ['rdx', 'rax']
                }[osize];

                break;
        }

        _has_changed_return(destination[destination.length - 1], signed, context);

        var multiplicand_type = multiplicand.mem_access ? 'pointer' : 'local';
        var multiplier_type = multiplier.mem_access ? 'pointer' : 'local';

        var arg_destination = Variable.local(destination.join(':'), osize * destination.length, signed, false, false);
        var arg_multiplicand = Variable[multiplicand_type](multiplicand.token, osize, signed);
        var arg_multiplier = Variable[multiplier_type](multiplier.token, osize, signed);

        // destination = multiplicand * multiplier
        return Base.multiply(arg_destination, arg_multiplicand, arg_multiplier);
    };

    /**
     * Handles bitwise rotation operations.
     * @param {Object} p Parsed instruction structure
     * @param {Object} op Operator constructor to use
     * @param {Object} context Context object
     * @returns {Object} Bitwise rotation instruction instance
     */
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
     * Handles SETcc (conditional set) instructions.
     * @param {Object} p Parsed instruction structure
     * @param {boolean} signed Signed operation or operands
     * @param {string} condition Operation string literal
     * @param {Object} context Context object
     */
    var _setcc_common = function(p, signed, condition, context) {
        var dest = p.opd[0];

        _has_changed_return(dest.token, signed, context);
        // destination, source_a, source_b, cond, src_true, src_false
        return Base.conditional_assign(dest.token, context.cond.a, context.cond.b, condition, '1', '0');
    };

    /**
     * Handles Jcc (conditional jump) instructions.
     * @param {Object} p Parsed instruction structure
     * @param {Object} context Context object
     * @param {string} type Condition type symbol
     */
    var _jcc_common = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);

        return Base.nop();
    };

    /**
     * Handles CMOV (conditional mov) instructions.
     * @param {Object} p Parsed instruction structure
     * @param {Object} context Context object
     * @param {Array<Object>} instrs Array of function's instructions
     * @param {string} type Condition type symbol
     */
    var _cmov_common = function(instr, context, instrs, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instrs[instrs.indexOf(instr) + 1].location;

        return _standard_mov(instr, context);
    };

    // TODO: the following function should be moved to a higher analysis level, and be applied by operand size
    // rather than the number of bits in the architecture.

    /**
     * Convert known magic values known to represent negative numbers.
     * @param {string} x Value string
     * @returns {string} Negative representation of `x` if known to be a negative value, `x` otherwise
     */
    var _check_known_neg = function(x) {
        var arch_minus_one;

        switch (Global.evars.archbits) {
            case 64: arch_minus_one = '0xffffffffffffffff'; break;
            case 32: arch_minus_one = '0xffffffff'; break;
            case 16: arch_minus_one = '0xffff'; break;
        }

        return (x === arch_minus_one ? '-1' : x);
    };

    /**
     * Try to guess the number of arguments passed to a specific cdecl function call, when
     * number of arguments is either unknown or may vary (i.e. like in variadic functions).
     * @param {Array<Object>} instrs Array of instructions preceding the function call
     * @param {Object} context Context object
     * @returns {number} Number of guessed arguments passed in this cdecl function call
     */
    var _guess_cdecl_nargs = function(instrs, context) {
        var nargs = 0;

        // scan preceding instructions backwards, in order to find evidece for passed args
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
                // reached the previous function call cleanup, stop searching
                break;
            } else if (mnem === 'call') {
                // reached the previous function call, stop searching
                break;
            }
        }

        return nargs;
    };

    /**
     * Try to guess the number of arguments passed to a specific amd64 systemv function call,
     * when number of arguments is either unknown or may vary (i.e. like in variadic functions).
     * @param {Array<Object>} instrs Array of instructions preceding the function call
     * @param {Object} context Context object
     * @returns {number} Number of guessed arguments passed in this cdecl function call
     */
    var _guess_amd64_nargs = function(instrs, context) {
        var nargs = 0;

        // TODO: implement this

        return nargs;
    };

    /**
     * Return a list of the cdecl function call arguments.
     * @param {Array<Object>} instrs Array of instructions preceding the function call
     * @param {number} nargs Number of arguments expected for this function call
     * @param {Object} context Context object
     * @returns {Array<Variable>} An array of arguments instances, ordered as declared in callee
     */
    var _populate_cdecl_call_args = function(instrs, nargs, context) {
        var args = [];
        var argidx = 0;
        var arg;

        for (var i = (instrs.length - 1); (i >= 0) && (nargs > 0); i--) {
            var mnem = instrs[i].parsed.mnem;
            var opd1 = instrs[i].parsed.opd[0];
            var opd2 = instrs[i].parsed.opd[1];

            // passing argument by referring to stack pointer directly rather than pushing
            if (mnem === 'mov') {
                // normally arguments will be passed in the order they are defined at the callee declaration. however
                // it is not guaranteed, so we will need the stack offset that is used to determine which argument
                // is being set; for example, "mov [esp + 12], val" indicates that the 3rd argument is being set

                var offset;

                // opd1.token may be set to a variable name, and therefore mask the stack pointer dereference. for that
                // reason we also check whether it appears as a stack variable, to extract its offset from stack pointer.
                // [another option would be undefining that variable manually using the "afvs-" r2 command]

                // check whether this is a plain stack pointer dereference, or a stack pointer dereference masekd by a
                // variable name. if the former, extract the offset manually; if the latter, use r2 data to retreive
                // that value.
                if (opd1.mem_access && _is_stack_reg(opd1.token)) {
                    var deref = opd1.token.match(/[er]?sp(?:\s+\+\s+(\d+))/);

                    offset = deref ? parseInt(deref[1]) : 0;
                } else if (_is_stack_based_local_var(opd1.token, context)) {
                    offset = Math.abs(_get_var_offset(opd1.token, context));
                } else {
                    // an irrelevant 'mov' isntruction; nothing to do here
                    continue;
                }

                arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable[opd2.mem_access ? 'pointer' : 'local'](opd2.token, Extra.to.type(opd2.mem_access, false));

                instrs[i].valid = false;
                args[offset / (Global.evars.archbits / 8)] = arg;
                nargs--;
            }

            // passing argument by pushing them to stack
            if (mnem === 'push') {
                arg = instrs[i].string ?
                    Variable.string(instrs[i].string) :
                    Variable[opd1.mem_access ? 'pointer' : 'local'](opd1.token, Extra.to.type(opd1.mem_access, false));

                instrs[i].valid = false;
                args[argidx++] = arg;
                nargs--;
            }
        }

        return args;
    };

    /**
     * Return a list of the amd64 systemv function call arguments.
     * @param {Array<Object>} instrs Array of instructions preceding the function call
     * @param {number} nargs Number of arguments expected for this function call
     * @param {Object} context Context object (not used)
     * @returns {Array<Variable>} An array of arguments instances, ordered as declared in callee
     */
    var _populate_amd64_call_args = function(instrs, nargs, context) {
        var _regs64 = ['rdi', 'rsi', 'rdx', 'rcx', 'r8',  'r9' ];
        var _regs32 = ['edi', 'esi', 'edx', 'ecx', 'r8d', 'r9d'];
        var _krnl64 = [     ,      ,      , 'r10',      ,      ]; // kernel interface uses r10 instead of rcx
        var _krnl32 = [     ,      ,      , 'r10d',     ,      ];

        var amd64 = Array.prototype.concat(_regs64, _regs32, _krnl64, _krnl32);

        // arguments are set to default values which will be used in case we cannot find any reference to them
        // in the preceding assembly code. for example, the caller passes its first argument ('rdi') as the first
        // argument to the callee; in such case we won't find its initialization instruction, so we'll just use 'rdi'.
        var args = _regs64.slice(0, nargs);

        // scan the preceding instructions to find where args registers are used, to take their values
        for (var i = (instrs.length - 1); (i >= 0) && (nargs > 0); i--) {
            var opd1 = instrs[i].parsed.opd[0];
            var opd2 = instrs[i].parsed.opd[1];

            // look for an instruction that has two arguments. we assume that such an instruction would use
            // its second operand to set the value of the first. although this is not an accurate observation,
            // it could be used to replace the argument with its value on the arguments list
            if (opd2.token) {
                var argidx = amd64.indexOf(opd1.token) % _regs64.length;

                // is destination operand an amd64 systemv argument which has not been considered yet?
                if ((argidx > (-1)) && (typeof args[argidx] === 'string')) {

                    // take the second operand value, that is likely to be used as the first operand's
                    // initialization value.
                    var arg = instrs[i].string ?
                        Variable.string(instrs[i].string) :
                        Variable[opd2.mem_access ? 'pointer' : 'local'](opd2.token, Extra.to.type(opd2.mem_access, false));

                    instrs[i].valid = false;
                    args[argidx] = arg;
                    nargs--;
                }
            }
        }

        return args;
    };

    var _call_function = function(instr, context, instrs, is_pointer) {
        var start = instrs.indexOf(instr);

        // indicates the function call return type (if used)
        var returnval = undefined;

        var tailcall = false;

        // is this a tail call?
        if (_is_last_instruction(instr, instrs)) {
            tailcall = true;
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
            var nargs = callee.name.startsWith('sym.') ?
                Extra.find.arguments_number(callee.name) :
                callee.nargs;

            // if number of arguments is unknown (either an unrecognized or a variadic function),
            // try to guess the number of arguments
            if (nargs == (-1)) {
                nargs = guess_nargs(instrs.slice(0, start), context);
            }

            args = populate_call_args(instrs.slice(0, start), nargs, context);
        }

        var callsite = instr.parsed.opd[0];
        var callname = instr.symbol || callsite.token;

        if (callsite.mem_access && callname.startsWith('0x')) {
            callname = Variable.functionPointer(callname.token, callname.mem_access, args);
        } else if (is_pointer || (!callsite.mem_access && _x86_x64_registers.indexOf(callname) > (-1))) {
            callname = Variable.functionPointer(callname, 0, args);
        }

        var call = Base.call(callname, args);

        if (tailcall) {
            // ControlFlow does not interpret well the specific case of a tail jmp through
            // a register. in this case, we will need to emit an explicit return statement
            if (_x86_x64_registers.indexOf(callsite.token) > (-1)) {
                return Base.return(call);
            }

            return call;
        }

        // if return value is used, assign it. otherwise just emit the call
        if (returnval) {
            return Base.assign(returnval, call);
        } else {
            return call;
        }
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
        var loop = p.pref && p.pref.match(/(rep)(n)?([ze])?/);

        if (loop) {
            instr.conditional(counter, '0', 'NE');
            instr.jump = instr.location;
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

    var _syscall_common = function(instr, instructions, sysinfo, regs) {
        if (!sysinfo) {
            return null;
        }
        if (sysinfo.comment) {
            instr.comments.push(sysinfo.comment);
        }
        if (!sysinfo.table) {
            return null;
        }
        var reglist = {};
        var pos = instructions.indexOf(instr);
        for (var i = pos - 1; i >= pos - regs.length; i--) {
            var prev = instructions[i] || {};
            if (!prev || !prev.parsed || prev.parsed.mnem != 'mov') {
                continue;
            }
            var dst = prev.parsed.opd[0];
            var src = prev.parsed.opd[1];
            if (prev.string) {
                src = Variable.string(prev.string);
            }
            if (!reglist[dst.token]) {
                reglist[dst.token] = {
                    value: src,
                    instr: prev,
                };
            }
        }
        var reg0 = regs.shift();
        if (!reglist[reg0]) {
            return null;
        }
        var syscall_num = parseInt(reglist[reg0].value.token).toString(16);
        if (typeof syscall_num != 'string') {
            return null;
        }
        sysinfo = sysinfo.table[syscall_num];
        if (!sysinfo) {
            return null;
        }
        if (sysinfo.comment) {
            instr.comments.push(sysinfo.comment);
        }
        reglist[reg0].instr.valid = false;
        regs = regs.slice(0, sysinfo.args);
        for (i = 0; i < regs.length; i++) {
            reglist[regs[i]].instr.valid = false;
            src = reglist[regs[i]].value;
            src = src.token ? Extra.tryas.int(src.token) : src;
            if (typeof src == 'number') {
                src = Variable.number(src);
            }
            regs[i] = src || regs[i];
        }

        return {
            args: regs,
            name: sysinfo.name
        };
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
            cld: function(instr, context) {
                return Base.nop();
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

                _has_changed_return(dst.token, false, context);

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

                return Base.assign(dst.token, arg);
            },
            call: _call_function,
            cmova: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'LE');
            },
            cmovae: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'LT');
            },
            cmovb: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'GE');
            },
            cmovbe: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'GT');
            },
            cmove: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'NE');
            },
            cmovg: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'LE');
            },
            cmovge: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'LT');
            },
            cmovl: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'GE');
            },
            cmovle: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'GT');
            },
            cmovne: function(instr, context, instructions) {
                return _cmov_common(instr, context, instructions, 'EQ');
            },
            bswap: function(instr, context) {
                var dst = instr.parsed.opd[0];

                return Base.swap_endian(dst.token, dst.token, _find_bits(dst.token));
            },
            mov: _standard_mov,
            movd: _standard_mov,
            movq: _standard_mov,
            movss: _standard_mov,
            /* movsd: See below. Conflict with string operator */
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
            nop: function(instr, context) {
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

                // in some cases, a jmp instruction would be considered as a function call

                if (dst.mem_access)
                {
                    if (_is_jumping_externally(instr, instructions) || dst.token.startsWith('reloc.')) {
                        // jumping to an address outside the function or to a relocatable symbol
                        return Base.call(dst.token);
                    } else if (_is_local_var(dst.token, context) || dst.token.startsWith('0x')) {
                        // indirectly jumping through a local variable or to an explicit memory address
                        return _call_function(instr, context, instructions, true);
                    }
                }

                var ref = dst.token.split(' ');

                // indirect jump through a register or an offset to register
                if (_x86_x64_registers.indexOf(ref[0]) > (-1)) {
                    return _call_function(instr, context, instructions, true);
                }

                return Base.nop();
            },
            cmp: function(instr, context) {
                var lhand = instr.parsed.opd[0];
                var rhand = instr.parsed.opd[1];

                var a = lhand.mem_access ? Variable.pointer(lhand.token, lhand.mem_access, true) : _check_known_neg(lhand.token);
                var b = rhand.mem_access ? Variable.pointer(rhand.token, rhand.mem_access, true) : _check_known_neg(rhand.token);

                context.cond.a = a;
                context.cond.b = b;

                return Base.nop();
            },
            test: function(instr, context) {
                var lhand = instr.parsed.opd[0];
                var rhand = instr.parsed.opd[1];

                var a = lhand.mem_access ? Variable.pointer(lhand.token, lhand.mem_access, true) : _check_known_neg(lhand.token);
                var b = rhand.mem_access ? Variable.pointer(rhand.token, rhand.mem_access, true) : _check_known_neg(rhand.token);

                context.cond.a = (a === b) ? a : '(' + a + ' & ' + b + ')';
                context.cond.b = '0';

                return Base.nop();
            },
            ret: function(instr, context, instructions) {
                var register = {
                    8: 'al',
                    16: 'ax',
                    32: 'eax',
                    64: 'rax'
                }[context.returns.bits] || '';

                // if the function is not returning anything, discard the empty "return" statement at the end
                if (_is_last_instruction(instr, instructions) && (register === '')) {
                    return Base.nop();
                }

                return Base.return(register);
            },
            push: function(instr, context) {
                instr.valid = false;

                var val = instr.parsed.opd[0];

                return val.mem_access ?
                    Variable.pointer(val.token, Extra.to.type(val.mem_access, false)) :
                    val.token;
            },
            pop: function(instr, context, instrs) {
                var dst = instr.parsed.opd[0];

                // unless this 'pop' restores the frame pointer, look for the
                // assignment pattern, which is commonly used by compilers:
                //      push n  \
                //      ...      } reg = n
                //      pop reg /
                if (!_is_frame_reg(dst.token) ) {
                    for (var i = instrs.indexOf(instr); i >= 0; i--) {
                        var mnem = instrs[i].parsed.mnem;
                        var opd1 = instrs[i].parsed.opd[0];

                        if (mnem === 'push') {
                            mnem = 'nop';

                            var value = instrs[i].string ?
                                Variable.string(instrs[i].string) :
                                opd1.token;

                            return Base.assign(dst.token, value);
                        } else if ((mnem === 'call') || _is_stack_reg(opd1.token)) {
                            break;
                        }
                    }
                }

                // poping into result register
                if (dst.token.match(/[er]?ax/)) {
                    context.returns.bits = _return_regs_bits[dst];
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
            movsd: function(instr, context) {
                var p = instr.parsed;
                var lhand = p.opd[0];
                var rhand = p.opd[1];

                if (_is_xmm(lhand) || _is_xmm(rhand)) {
                    return _standard_mov(instr, context);
                } else {
                    return _string_common(instr, context);
                }
            },
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
                return _jcc_common(i, c, 'NE');
            },
            je: function(i, c) {
                return _jcc_common(i, c, 'EQ');
            },
            ja: function(i, c) {
                return _jcc_common(i, c, 'GT');
            },
            jae: function(i, c) {
                return _jcc_common(i, c, 'GE');
            },
            jb: function(i, c) {
                return _jcc_common(i, c, 'LT');
            },
            jbe: function(i, c) {
                return _jcc_common(i, c, 'LE');
            },
            jg: function(i, c) {
                return _jcc_common(i, c, 'GT');
            },
            jge: function(i, c) {
                return _jcc_common(i, c, 'GE');
            },
            jle: function(i, c) {
                return _jcc_common(i, c, 'LE');
            },
            jl: function(i, c) {
                return _jcc_common(i, c, 'LT');
            },
            js: function(i, c) {
                return _jcc_common(i, c, 'LT');
            },
            jns: function(i, c) {
                return _jcc_common(i, c, 'GE');
            },
            xchg: function(instr, context) {
                var lhand = instr.parsed.opd[0];
                var rhand = instr.parsed.opd[1];

                var tmp = Variable.uniqueName('tmp');

                return Base.composed([
                    Base.assign(tmp, lhand.token),          // tmp = dest
                    Base.assign(lhand.token, rhand.token),  // dest = src
                    Base.assign(rhand.token, tmp)           // src = tmp
                ]);
            },
            int: function(instr, context, instructions) {
                var syscall_num = parseInt(instr.parsed.opd[0].token).toString(16);
                var name = 'syscall_' + syscall_num + 'h';
                var regs = ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'edp'];
                var info = _syscall_common(instr, instructions, Syscalls(syscall_num, 'x86'), regs);
                if (info) {
                    name = info.name;
                    regs = info.args;
                }
                return Base.assign('eax', Base.call(name, regs));
            },
            syscall: function(instr, context, instructions) {
                var name = 'syscall_80h';
                var regs = ['rax', 'rdi', 'rsi', 'rdx', 'r10', 'r8', 'r9'];
                var info = _syscall_common(instr, instructions, Syscalls('80', 'x86'), regs);
                if (info) {
                    name = info.name;
                    regs = info.args;
                }
                return Base.assign('rax', Base.call(name, regs));
            },
            hlt: function() {
                return Base.return(Base.call('_hlt', []));
            },
            invalid: function() {
                return Base.nop();
            }
        },
        preanalisys: function(instrs, context) {
            instrs.forEach(function(i) {
                var opd1 = i.parsed.opd[0];
                var opd2 = i.parsed.opd[1];

                // if dst is an argument or local variable, it should not appear as memory access
                if (_is_func_arg(opd1.token, context) ||
                    _is_local_var(opd1.token, context)) {
                    opd1.mem_access = undefined;
                }

                // attach segment override to operand token, if both exist
                // since c has no valid syntax for that, we use the common notation for a segment-prefixed pointer
                // TODO: look into non-standard gcc namespaces__seg_fs and __seg_gs
                if (opd1.segovr && opd1.token) {
                    opd1.token = opd1.segovr + opd1.token;
                }

                // if src is an argument or local variable, it should not appear as memory access
                if (_is_func_arg(opd2.token, context) ||
                    _is_local_var(opd2.token, context)) {
                    opd2.mem_access = undefined;
                }

                // attach segment override to operand token, if both exist
                // since c has no valid syntax for that, we use the common notation for a segment-prefixed pointer
                // TODO: look into non-standard gcc namespaces__seg_fs and __seg_gs
                if (opd2.segovr && opd2.token) {
                    opd2.token = opd2.segovr + opd2.token;
                }
            });
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
            //     ([d-gs]s:)?                             : optional segment override
            //     (?:\[?)                                 : optional opening bracket (stripped)
            //     ([^[\],]+)                              : first operand
            //     (?:\]?)                                 : optional closing bracket (stripped)
            // )?
            // (?:,                                        : separating comma
            //     (?:\s+
            //         (byte|(?:[dq]|[xyz]mm)?word)        : second operand's memory access qualifier
            //         (?: ptr)?
            //     )?
            //     (?:\s*
            //         ([d-g]s:)?                          : optional segment override
            //         (?:\[?)                             : optional opening bracket (stripped)
            //         ([^[\],]+)                          : second operand
            //         (?:\]?)                             : optional closing bracket (stripped)
            //     )?
            // )?
            // (?:,                                        : separating comma
            //     (?:\s+
            //         ([^[\],]+)                          : third operand
            //     )?
            // )?

            /** @type {Array.<string>} */
            var tokens = asm.match(/(?:(repn?[ez]?|lock)\s+)?(\w+)(?:\s+(byte|(?:[dq]|[xyz]mm)?word))?(?:\s*([d-gs]s:)?(?:\[?)([^[\],]+)(?:\]?))?(?:(?:,)(?:\s+(byte|(?:[dq]|[xyz]mm)?word)(?: ptr)?)?(?:\s*([d-g]s:)?(?:\[?)([^[\],]+)(?:\]?))?)?(?:,(?:\s+([^[\],]+))?)?/);

            // tokens[0]: match string; irrelevant
            // tokens[1]: instruction prefix; undefined if no prefix
            // tokens[2]: instruction mnemonic
            // tokens[3]: first operand's memory access qualifier; undefined if no qualifier or no operands
            // tokens[4]: segment override for first operand; undefined if no segment override or no operands
            // tokens[5]: first operand; undefined if no operands
            // tokens[6]: second operand's memory access qualifier; undefined if no qualifier or no second operand
            // tokens[7]: segment override for second operand; undefined if no segment override or no second operand
            // tokens[8]: second operand; undefined if no second operand
            // tokens[9]: third operand; undefined if no third operand

            var prefix = tokens[1];
            var mnemonic = tokens[2];

            /** @type {Object.<string,number>} */
            var qualifier = {
                'byte': 8,
                'word': 16,
                'dword': 32,
                'qword': 64,
                'xmmword': 128,
                'ymmword': 256,
                'zmmword': 512
            };

            var operand1 = {
                mem_access: qualifier[tokens[3]],
                segovr: tokens[4],
                token: tokens[5]
            };

            var operand2 = {
                mem_access: qualifier[tokens[6]],
                segovr: tokens[7],
                token: tokens[8]
            };

            // third operand is either a register or immediate; no memory access
            var operand3 = {
                mem_access: undefined,
                segovr: undefined,
                token: tokens[9]
            };

            return {
                pref: prefix,
                mnem: mnemonic,
                opd: [operand1, operand2, operand3]
            };
        },
        context: function(data) {
            var fcnargs = data.xrefs.arguments;

            var vars_args = Array.prototype.concat(fcnargs.bp, fcnargs.sp, fcnargs.reg).map(function(x) {
                if (x.type === 'int' || x.type === 'signed int') {
                    x.type = (Global.evars.archbits < 32) ? 'int16_t' : 'int32_t';
                } else if (x.type === 'unsigned int') {
                    x.type = (Global.evars.archbits < 32) ? 'uint16_t' : 'uint32_t';
                }

                return x;
            });

            return {
                cond: {
                    a: '?',
                    b: '?',
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
        globalvars: function(context) {
            return [];
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
