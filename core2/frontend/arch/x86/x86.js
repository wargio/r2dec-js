/** 
 * Copyright (C) 2018-2019 elicn
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
    const Flags = require('core2/frontend/arch/x86/flags');
    const Expr = require('core2/analysis/ir/expressions');
    const Stmt = require('core2/analysis/ir/statements');

    /** @constructor */
    function x86(nbits, btype, endianess) {

        /** @type {number} */
        this.bits = nbits.toInt();

        /** @type {string} */
        this.bintype = btype;

        /** @type {string} */
        this.endianess = endianess;

        /** @type {string} */
        this.FRAME_REG = {
            16: 'bp',
            32: 'ebp',
            64: 'rbp'
        }[nbits];

        /** @type {string} */
        this.RESULT_REG = {
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[nbits];

        /** @type {string} */
        this.STACK_REG = {
            16: 'sp',
            32: 'esp',
            64: 'rsp'
        }[nbits];

        /** @type {string} */
        this.PC_REG = {
            16: 'ip',
            32: 'eip',
            64: 'rip'
        }[nbits];

        /** @type {string} */
        this.FLAGS_REG = {
            16: 'flags',
            32: 'eflags',
            64: 'rflags'
        }[nbits];

        this.instructions = {
            // basic
            'mov'   : _mov.bind(this),
            'push'  : _push.bind(this),
            'pop'   : _pop.bind(this),
            'lea'   : _lea.bind(this),
            'leave' : _leave.bind(this),
            'call'  : _call.bind(this),
            'ret'   : _ret.bind(this),

            'pushad': _pushad.bind(this),
            'popad' : _popad.bind(this),

            // arithmetic operations
            'add'   : _add.bind(this),
            'adc'   : _adc.bind(this),
            'sub'   : _sub.bind(this),
            'div'   : _div.bind(this),
            'mul'   : _mul.bind(this),
            'imul'  : _imul.bind(this),
            'inc'   : _inc.bind(this),
            'dec'   : _dec.bind(this),

            // bitwise operations
            'and'   : _and.bind(this),
            'or'    : _or.bind(this),
            'xor'   : _xor.bind(this),
            'shr'   : _shr.bind(this),
            'shl'   : _shl.bind(this),
            'sar'   : _sar.bind(this),
            'neg'   : _neg.bind(this),
            'not'   : _not.bind(this),

            // comparisons
            'cmp'   : _cmp.bind(this),
            'test'  : _test.bind(this),

            // branches
            'jmp'   : _jmp.bind(this),
            'je'    : _je.bind(this),
            'jne'   : _jne.bind(this),
            'ja'    : _ja.bind(this),
            'jae'   : _jae.bind(this),
            'jb'    : _jb.bind(this),
            'jbe'   : _jbe.bind(this),
            'jg'    : _jg.bind(this),
            'jge'   : _jge.bind(this),
            'jl'    : _jl.bind(this),
            'jle'   : _jle.bind(this),
            'jo'    : _jo.bind(this),
            'jno'   : _jno.bind(this),
            'js'    : _js.bind(this),
            'jns'   : _jns.bind(this),

            // conditional assignments
            'cmova'  : _cmova.bind(this),
            'cmovae' : _cmovae.bind(this),
            'cmovb'  : _cmovb.bind(this),
            'cmovbe' : _cmovbe.bind(this),
            'cmovg'  : _cmovg.bind(this),
            'cmovge' : _cmovge.bind(this),
            'cmovl'  : _cmovl.bind(this),
            'cmovle' : _cmovle.bind(this),
            'cmove'  : _cmove.bind(this),
            'cmovne' : _cmovne.bind(this),

            // conditional set
            'seta'  : _seta.bind(this),
            'setae' : _setae.bind(this),
            'setb'  : _setb.bind(this),
            'setbe' : _setbe.bind(this),
            'setg'  : _setg.bind(this),
            'setge' : _setge.bind(this),
            'setl'  : _setl.bind(this),
            'setle' : _setle.bind(this),
            'sete'  : _sete.bind(this),
            'setne' : _setne.bind(this),

            // flags manipulations
            'clc' : _clc.bind(this),
            'cld' : _cld.bind(this),
            'stc' : _stc.bind(this),
            'std' : _std.bind(this),

            // signed assingments
            'movsx' : _mov.bind(this),  // TODO: dest is signed
            'movsxd': _mov.bind(this),  // TODO: dest is signed
            'movzx' : _mov.bind(this),  // TODO: dest is unsigned

            // rare stuff
            'movbe' : _movbe.bind(this),
            'popcnt': _popcnt.bind(this),

            // misc
            'nop'   : _nop.bind(this),
            'hlt'   : _hlt.bind(this)
        };

        this.invalid = _invalid;
    }

    /**
     * Get a copy of the system frame pointer.
     * @returns {Expr.Reg}
     */
    x86.prototype.get_frame_reg = function() {
        return new Expr.Reg(this.FRAME_REG, this.bits);
    };

    /**
     * Get a copy of the system function result register.
     * @returns {Expr.Reg}
     */
    x86.prototype.get_result_reg = function() {
        return new Expr.Reg(this.RESULT_REG, this.bits);
    };

    /**
     * Get a copy of the system stack pointer.
     * @returns {Expr.Reg}
     */
    x86.prototype.get_stack_reg = function() {
        return new Expr.Reg(this.STACK_REG, this.bits);
    };

    /**
     * Get a copy of the system program counter register.
     * @returns {Expr.Reg}
     */
    x86.prototype.get_pc_reg = function() {
        return new Expr.Reg(this.PC_REG, this.bits);
    };

    /**
     * Get a copy of the system [pseudo] flags register.
     * @returns {Expr.Reg}
     */
    x86.prototype.get_flags_reg = function() {
        return new Expr.Reg(this.FLAGS_REG, this.bits);
    };

    /**
     * Get a copy of the system native address size value.
     * @returns {Expr.Val}
     */
    x86.prototype.get_asize_val = function() {
        return new Expr.Val(this.bits / 8, this.bits);
    };

    /**
     * Create an Assign expression to system flags
     * @param {string} f Flag token to modify
     * @param {number} bval Either 0 or 1
     * @returns {Expr.Expr}
     */
    var set_flag = function(f, bval) {
        return new Expr.Assign(Flags.Flag(f), new Expr.Val(bval, 1));
    };

    x86.prototype.eval_flags = function(expr, flist) {
        var flreg = this.get_flags_reg();
        var e = [new Expr.Assign(flreg, expr.clone())];

        return e.concat(flist.map(function(f) {
            return new Expr.Assign(Flags.Flag(f), Flags.FlagOp(f, flreg.clone()));
        }));
    };

    /*
    x86.prototype.get_implicit_vars = function(afij) {
        const sreg = this.get_stack_reg();

        var max_val = {
            16: Expr.Val.MAX_VAL16,
            32: Expr.Val.MAX_VAL32,
            64: Expr.Val.MAX_VAL64
        }[sreg.size];

        return new Expr.Assign(sreg, new Expr.And(max_val, new Expr.Val(~(16 - 1), max_val.size)));
    };
    */

    /**
     * List of possible instruction prefixes.
     * see R_ANAL_OP_PREFIX_* definitions in r2.
     * @enum {number}
     * @readonly
     */
    const INSN_PREFIX = {
        NONE:       0,
        PREF_REP:   2,
        PREF_REPNZ: 4,
        PREF_LOCK:  8
    };

    x86.prototype.r2decode = function(aoj) {
        var abits = this.bits;

        var process_ops = function(op) {

            // r2cmd creates Long objects for all numeric values it finds. though it is required
            // for the assembly listing, it is not required for its metadata and generates redundant
            // overhead.
            // to make things simpler and lighter, we prefer to convert all meatadata Long objects
            // back to primitive numeric values.
            var toInt = function(n) {
                return n && n.__isLong__ ? parseInt(n) : n;
            };

            return {
                /**
                 * Operand size in bits
                 * @type {number}
                 */
                size: toInt(op.size) * 8,

                /**
                 * Access type to operand: either read, write or none
                 * @see {@link OP_ACCESS} for possible values
                 * @type {number}
                 */
                access: toInt(op.rw),

                /**
                 * Operand type: either register, memory or immediate
                 * @see {@link OP_TYPE} for possible values
                 * @type {string}
                 */
                type: op.type,

                /**
                 * Operand value: either register name or a numeric literal
                 * @type {string|number}
                 */
                value: op.value,

                mem: {
                    base:  op.base,
                    index: op.index,
                    scale: (op.scale > 1) ? op.scale : undefined,
                    disp:  op.disp,
                    abits: abits
                }
            };
        };

        var parsed = {
            address : aoj.addr,
            isize   : aoj.size,
            disasm  : aoj.disasm,
            prefix  : aoj.prefix,
            mnemonic: aoj.mnemonic,
            operands: aoj.opex.operands.map(process_ops)
        };

        return parsed;
    };

    /**
     * Determines the size (in bits) of a given register name.
     * @param {string} rname Register name
     * @returns {!number}
     */
    var get_reg_size = function(rname) {
        var elems = rname.match(/([re])?(.?[^dwhl]?)([dwhl])?/);

        // reg string will be splitted into an array of 4, where:
        //   [0]: match string
        //   [1]: prefix (either 'r', 'e' or undefined)
        //   [2]: reg name
        //   [3]: suffix (either 'h', 'l', 'w', 'd' or undefined)
        //
        // when coming to determine the register size, the aforementioned elements are inspected
        // in a certain order to look at the first that it isn't undefined: suffix -> prefix -> name

        var sz;

        if (elems[3] !== undefined) {
            sz = {
                'h': 8,
                'l': 8,
                'w': 16,
                'd': 32
            }[elems[3]];
        } else if (elems[1] !== undefined) {
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
     * Analyze a textual assembly operand and create a matching IR expression for it.
     * @inner
     */
    var get_operand_expr = function(op) {
        var expr;

        switch (op.type) {
        case 'reg':
            expr = new Expr.Reg(op.value, get_reg_size(op.value));
            break;

        case 'imm':
            expr = new Expr.Val(op.value, op.size);
            break;

        case 'mem':
            // TODO: fallback option should be arch.bits
            var bsize = op.mem.base ? get_reg_size(op.mem.base) : op.size;

            var base = op.mem.base && new Expr.Reg(op.mem.base, bsize);
            var index = op.mem.index && new Expr.Reg(op.mem.index, bsize);
            var scale = op.mem.scale && new Expr.Val(op.mem.scale, bsize);
            var disp = op.mem.disp && new Expr.Val(op.mem.disp, bsize);       

            if (base && index && disp) {
                // [base + index*scale + disp]
                expr = new Expr.Add(base, new Expr.Add(scale ? new Expr.Mul(index, scale) : index, disp));
            } else if (base && index) {
                // [base + index*scale]
                expr = new Expr.Add(base, scale ? new Expr.Mul(index, scale) : index);
            } else if (base && disp) {
                // [base + disp]
                expr = new Expr.Add(base, disp);
            } else if (base) {
                // [base]
                expr = base;
            } else if (disp) {
                // [disp]
                expr = disp;
            }

            expr = new Expr.Deref(expr);
            break;

        default:
            throw new Error('unknown operand type: ' + op.type);
        }

        return expr;
    };

    // ---------- common handlers ----------//

    /** common handler for unary operators */
    var _common_uop = function(p, op) {
        var expr = get_operand_expr(p.operands[0]);

        // expr = op expr
        return [new Expr.Assign(expr.clone(), new op(expr))];
    };

    /** common handler for binary operators */
    var _common_bop = function(p, op) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        // lexpr = lexpr op rexpr
        return [new Expr.Assign(lexpr.clone(), new op(lexpr, rexpr))];
    };

    var _common_bitwise = function(p, op) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        var op_expr = new op(lexpr, rexpr);

        // lexpr = lexpr op rexpr
        return [new Expr.Assign(lexpr.clone(), op_expr)].concat(
            this.eval_flags(lexpr, ['PF', 'ZF', 'SF']).concat([
            set_flag('CF', 0),
            set_flag('OF', 0)
        ]));
    };

    /** common handler for conditional jumps */
    var _common_jcc = function(p, cond) {
        var taken = get_operand_expr(p.operands[0]);
        var not_taken = new Expr.Val(p.address.add(p.isize), p.operands[0].size);

        // if cond goto taken, otherwise fallthrough to not_taken
        return [new Stmt.Branch(p.address, cond, taken, not_taken)];
    };

    /** common handler for conditional movs */
    var _common_cmov = function(p, cond) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        // lexpr = cond ? lexpr : rexpr
        return [new Expr.Assign(lexpr.clone(), new Expr.TCond(cond, lexpr, rexpr))];
    };

    /** common handler for conditional sets */
    var _common_setcc = function(p, cond) {
        var expr = get_operand_expr(p.operands[0]);

        // expr = cond ? 1 : 0
        return [new Expr.Assign(expr, cond)];
    };

    var _common_set_flag = function(f, bval) {
        return [set_flag(f, bval)];
    };

    // ---------- instructions ----------//

    var _mov = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        // lexpr = rexpr
        return [new Expr.Assign(lexpr, rexpr)];
    };

    var _add = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        var op = new Expr.Add(lexpr, rexpr);

        // lexpr = lexpr + rexpr
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _adc = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        var op = new Expr.Add(new Expr.Add(lexpr, rexpr), Flags.Flag('CF'));

        // lexpr = lexpr + rexpr + eflags.cf
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _sub = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        var op = new Expr.Sub(lexpr, rexpr);

        // lexpr = lexpr - rexpr
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _div = function(p) {
        var divisor = get_operand_expr(p.operands[0]);
        var osize = divisor.size;

        var dividend = {
            8:  ['ax'],
            16: ['dx',  'ax'],
            32: ['edx', 'eax'],
            64: ['rdx', 'rax']
        }[osize];

        var quotient = {
            8:  'al',
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[osize];

        var remainder = {
            8:  'ah',
            16: 'dx',
            32: 'edx',
            64: 'rdx',
        }[osize];

        // TODO: the dividend is actually composed of: (hi << osize) | (lo)
        // this may appear funny if osize = 64 and regs are shifted by this number.
        var arg_dividend  = new Expr.Reg(dividend[dividend.length - 1]);
        var arg_quotient  = new Expr.Reg(quotient,  osize);
        var arg_remainder = new Expr.Reg(remainder, osize);

        // quotient = dividend / divisor
        // remainder = dividend % divisor
        return [
            new Expr.Assign(arg_quotient,  new Expr.Div(arg_dividend, divisor)),
            new Expr.Assign(arg_remainder, new Expr.Mod(arg_dividend.clone(), divisor.clone()))
        ];
    };

    var _mul = function(p) {
        var multiplicand = get_operand_expr(p.operands[0]);
        var osize = multiplicand.size;

        var product = {
            8:  ['ax'],
            16: ['dx',  'ax'],
            32: ['edx', 'eax'],
            64: ['rdx', 'rax']
        }[osize];

        var multiplier = {
            8:  'al',
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[osize];

        // TODO: the product is actually composed of: (hi << osize) | (lo)
        // this may appear funny if osize = 64 and regs are shifted by this number.
        var arg_product = new Expr.Reg(product[product.length - 1]);
        var arg_multiplier = new Expr.Reg(multiplier, osize);

        // TODO: %of, %cf = (upper part is non-zero)

        // product = multiplier * multiplicand
        return [new Expr.Assign(arg_product, new Expr.Mul(arg_multiplier, multiplicand))];
    };

    var _imul = function(p) {
        var num_ops = p.operands.length;

        if (num_ops === 1) {
            return _mul(p);
        }

        // num_ops == 2: op[0] = op[0] * op[1]
        // num_ops == 3: op[0] = op[1] * op[2]
        var multiplicand = get_operand_expr(p.operands[p.operands.length - 2]);
        var multiplier = get_operand_expr(p.operands[p.operands.length - 1]);
        var product = get_operand_expr(p.operands[0]);

        // TODO: %of, %cf = (see intel sdm)

        // product = multiplier * multiplicand
        return [new Expr.Assign(product, new Expr.Mul(multiplier, multiplicand))];
    };

    var _inc = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var one = new Expr.Val(1, p.operands[0].size);

        var op = new Expr.Add(lexpr, one);

        // lexpr = lexpr + 1
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _dec = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var one = new Expr.Val(1, p.operands[0].size);

        var op = new Expr.Sub(lexpr, one);

        // lexpr = lexpr - 1
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _push = function(p) {
        var expr = get_operand_expr(p.operands[0]);
        var sreg = this.get_stack_reg();
        var asize = this.get_asize_val();

        // rsp = rsp - asize
        // *rsp = expr
        return [
            new Expr.Assign(sreg.clone(), new Expr.Sub(sreg.clone(), asize)),
            new Expr.Assign(new Expr.Deref(sreg), expr)
        ];
    };

    var _pop = function(p) {
        var expr = get_operand_expr(p.operands[0]);
        var sreg = this.get_stack_reg();
        var asize = this.get_asize_val();

        // expr = *rsp
        // rsp = rsp + asize
        return [
            new Expr.Assign(expr, new Expr.Deref(sreg.clone())),
            new Expr.Assign(sreg, new Expr.Add(sreg.clone(), asize))
        ];
    };

    var _pushad = function(p) {
        var sreg = this.get_stack_reg();
        var asize = this.get_asize_val();

        var push_step = function(r) {
            return [
                new Expr.Assign(sreg.clone(), new Expr.Sub(sreg.clone(), asize.clone())),
                new Expr.Assign(new Expr.Deref(sreg.clone()), r)
            ];
        };

        var pushed_regs = [
            new Expr.Reg('eax', 32),
            new Expr.Reg('ecx', 32),
            new Expr.Reg('edx', 32),
            new Expr.Reg('ebx', 32),
            new Expr.Add(new Expr.Reg('esp', 32), new Expr.Val(asize.value.mul(5), asize.size)),
            new Expr.Reg('ebp', 32),
            new Expr.Reg('esi', 32),
            new Expr.Reg('edi', 32)
        ];

        return Array.prototype.concat.apply([], pushed_regs.map(push_step));
    };

    var _popad = function(p) {
        var sreg = this.get_stack_reg();
        var asize = this.get_asize_val();

        var pop_step = function(r) {
            return Array.prototype.concat(
                r ? [new Expr.Assign(r, new Expr.Deref(sreg.clone()))] : [],
                [new Expr.Assign(sreg.clone(), new Expr.Add(sreg.clone(), asize.clone()))]
            );
        };

        var poped_regs = [
            new Expr.Reg('edi', 32),
            new Expr.Reg('esi', 32),
            new Expr.Reg('ebp', 32),
            null,
            new Expr.Reg('ebx', 32),
            new Expr.Reg('edx', 32),
            new Expr.Reg('ecx', 32),
            new Expr.Reg('eax', 32)
        ];

        return Array.prototype.concat.apply([], poped_regs.map(pop_step));
    };

    var _nop = function(p) {
        return [];
    };

    var _lea = function(p) {
        var lexpr = get_operand_expr(p.operands[0]);
        var rexpr = get_operand_expr(p.operands[1]);

        // lexpr = &rexpr
        return [new Expr.Assign(lexpr, new Expr.AddrOf(rexpr))];
    };

    var _leave = function(p) {
        var freg = this.get_frame_reg();
        var sreg = this.get_stack_reg();
        var asize = this.get_asize_val();

        // rsp = rbp
        // rbp = *rsp
        // rsp = rsp + asize
        return [
            new Expr.Assign(sreg, freg),
            new Expr.Assign(freg.clone(), new Expr.Deref(sreg.clone())),
            new Expr.Assign(sreg.clone(), new Expr.Add(sreg.clone(), asize))
        ];
    };

    var _call = function(p) {
        var args = [];
        var callee = get_operand_expr(p.operands[0]);
        var rreg = this.get_result_reg();

        // the function call arguments list will be populated later on, according to calling convention
        return [new Expr.Assign(rreg, new Expr.Call(callee, args))];
    };

    var _ret = function(p) {
        // a function might need to clean up a few bytes from the stack as it returns
        var cleanup = p.operands.length > 0 ?
            [new Expr.Add(this.get_stack_reg(), get_operand_expr(p.operands[0]))] :
            [];

        return [new Stmt.Return(p.address, this.get_result_reg())].concat(cleanup);
    };

    // bitwise operations
    var _and = function(p) { return _common_bitwise.call(this, p, Expr.And); };
    var _or  = function(p) { return _common_bitwise.call(this, p, Expr.Or);  };
    var _xor = function(p) { return _common_bitwise.call(this, p, Expr.Xor); };

    var _shr = function(p) { return _common_bop(p, Expr.Shr); };    // TODO: evaluate flags for shr
    var _shl = function(p) { return _common_bop(p, Expr.Shl); };    // TODO: evaluate flags for shl
    var _sar = function(p) { return _common_bop(p, Expr.Sar); };    // TODO: evaluate flags for sar

    var _neg = function(p) { return _common_uop(p, Expr.Neg); };    // cf = (opnd is non-zero)
    var _not = function(p) { return _common_uop(p, Expr.Not); };

    var _cmp = function(p) {
        var lhand = get_operand_expr(p.operands[0]);
        var rhand = get_operand_expr(p.operands[1]);

        return this.eval_flags(new Expr.Sub(lhand, rhand), ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']);
    };

    var _test = function(p) {
        var lhand = get_operand_expr(p.operands[0]);
        var rhand = get_operand_expr(p.operands[1]);

        return this.eval_flags(new Expr.And(lhand, rhand), ['PF', 'ZF', 'SF']).concat([
            set_flag('CF', 0),
            set_flag('OF', 0)
        ]);
    };

    var _jmp = function(p) {
        var dst = get_operand_expr(p.operands[0]);

        return [new Stmt.Goto(p.address, dst)];
    };

    var _je = function(p) {
        return _common_jcc(p, Flags.Flag('ZF'));
    };

    var _ja = function(p) {
        return _common_jcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.Flag('ZF')), new Expr.BoolNot(Flags.Flag('CF'))));
    };

    var _jb = function(p) {
        return _common_jcc(p, Flags.Flag('CF'));
    };

    var _jg = function(p) {
        return _common_jcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.Flag('ZF')), new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _jl = function(p) {
        return _common_jcc(p, new Expr.NE(Flags.Flag('SF'), Flags.Flag('OF')));
    };

    var _jo = function(p) {
        return _common_jcc(p, Flags.Flag('OF'));
    };

    var _js = function(p) {
        return _common_jcc(p, Flags.Flag('SF'));
    };

    var _jne = function(p) {
        return _common_jcc(p, new Expr.BoolNot(Flags.Flag('ZF')));
    };

    var _jae = function(p) {
        return _common_jcc(p, new Expr.BoolNot(Flags.Flag('CF')));
    };

    var _jbe = function(p) {
        return _common_jcc(p, new Expr.BoolOr(Flags.Flag('ZF'), Flags.Flag('CF')));
    };

    var _jge = function(p) {
        return _common_jcc(p, new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF')));
    };

    var _jle = function(p) {
        return _common_jcc(p, new Expr.BoolOr(Flags.Flag('ZF'), new Expr.NE(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _jns = function(p) {
        return _common_jcc(p, new Expr.BoolNot(Flags.Flag('SF')));
    };

    var _jno = function(p) {
        return _common_jcc(p, new Expr.BoolNot(Flags.Flag('OF')));
    };

    var _cmova = function(p) {
        return _common_cmov(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.Flag('ZF')), new Expr.BoolNot(Flags.Flag('CF'))));
    };

    var _cmovae = function(p) {
        return _common_cmov(p, new Expr.BoolNot(Flags.Flag('CF')));
    };

    var _cmovb = function(p) {
        return _common_cmov(p, Flags.Flag('CF'));
    };

    var _cmovbe = function(p) {
        return _common_cmov(p, new Expr.BoolOr(Flags.Flag('ZF'), Flags.Flag('CF')));
    };

    var _cmovg = function(p) {
        return _common_cmov(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.lag('ZF')), new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _cmovge = function(p) {
        return _common_cmov(p, new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF')));
    };

    var _cmovl = function(p) {
        return _common_cmov(p, new Expr.NE(Flags.lag('SF'), Flags.Flag('OF')));
    };

    var _cmovle = function(p) {
        return _common_cmov(p, new Expr.BoolOr(Flags.Flag('ZF'), new Expr.NE(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _cmove = function(p) {
        return _common_cmov(p, Flags.Flag('ZF'));
    };

    var _cmovne = function(p) {
        return _common_cmov(p, new Expr.BoolNot(Flags.Flag('ZF')));
    };

    var _seta = function(p) {
        return _common_setcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.Flag('ZF')), new Expr.BoolNot(Flags.Flag('CF'))));
    };

    var _setae = function(p) {
        return _common_setcc(p, new Expr.BoolNot(Flags.Flag('CF')));
    };

    var _setb = function(p) {
        return _common_setcc(p, Flags.Flag('CF'));
    };

    var _setbe = function(p) {
        return _common_setcc(p, new Expr.BoolOr(Flags.Flag('ZF'), Flags.Flag('CF')));
    };

    var _setg = function(p) {
        return _common_setcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flags.Flag('ZF')), new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _setge = function(p) {
        return _common_setcc(p, new Expr.EQ(Flags.Flag('SF'), Flags.Flag('OF')));
    };

    var _setl = function(p) {
        return _common_setcc(p, new Expr.NE(Flags.Flag('SF'), Flags.Flag('OF')));
    };

    var _setle = function(p) {
        return _common_setcc(p, new Expr.BoolOr(Flags.Flag('ZF'), new Expr.NE(Flags.Flag('SF'), Flags.Flag('OF'))));
    };

    var _sete = function(p) {
        return _common_setcc(p, Flags.Flag('ZF'));
    };

    var _setne = function(p) {
        return _common_setcc(p, new Expr.BoolNot(Flags.Flag('ZF')));
    };

    var _clc = function(p) {
        return _common_set_flag('CF', 0);
    };

    var _cld = function(p) {
        return _common_set_flag('DF', 0);
    };

    var _stc = function(p) {
        return _common_set_flag('CF', 1);
    };

    var _std = function(p) {
        return _common_set_flag('DF', 1);
    };

    var _movbe = function(p) {
        var lhand = get_operand_expr(p.operands[0]);
        var rhand = get_operand_expr(p.operands[1]);

        var bifunc = {
            16: '__builtin_bswap16',
            32: '__builtin_bswap32',
            64: '__builtin_bswap64'
        }[rhand.size];

        return [new Expr.Assign(lhand, new Expr.Call(bifunc, [rhand]))];
    };

    var _popcnt = function(p) {
        var lhand = get_operand_expr(p.operands[0]);
        var rhand = get_operand_expr(p.operands[1]);

        var bifunc = {
            32: '__builtin_popcount',
            64: '__builtin_popcountll'
        }[rhand.size];

        return [new Expr.Assign(lhand, new Expr.Call(bifunc, [rhand]))].concat(this.eval_flags(rhand, ['ZF']).concat([
            set_flag('PF', 0),
            set_flag('CF', 0),
            set_flag('AF', 0),
            set_flag('SF', 0),
            set_flag('OF', 0)
        ]));
    };

    var _hlt = function(p) {
        return [new Expr.Call('_hlt', [])];
    };

    var _invalid = function(p) {
        // TODO: improve handling of unknown instructions. consider generate expressions based on
        // esil code for that instruction; that would help generate helpful dependencies although
        // it will not be an accurate description
        return [new Expr.Unknown(p.disasm)];
    };

    // TODO: to be implemented
    // idiv
    // movabs
    // cbw
    // cwde
    // cdqe
    // rol
    // ror
    // lods{b,w,d,q}
    // stos{b,w,d,q}
    // movs{b,w,d,q}
    // cmps{b,w,d,q}
    // scas{b,w,d,q}
    // pushf{,d,q}
    // popf{,d,q}
    // pusha
    // popa

    return x86;
})();