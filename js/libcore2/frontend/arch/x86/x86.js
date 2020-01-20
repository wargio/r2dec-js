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

(function() {
    const ArchRegs = require('js/libcore2/frontend/arch/x86/archregs');
    const Flags = require('js/libcore2/frontend/arch/x86/flags');
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Stmt = require('js/libcore2/analysis/ir/statements');

    /** @constructor */
    function x86(iIj) {
        var nbits = iIj.bits;

        /** @type {number} */
        this.bits = nbits.toInt();

        this.archregs = new ArchRegs(this.bits);

        /** System frame pointer */
        this.FRAME_REG = new Expr.Reg({
            16: 'bp',
            32: 'ebp',
            64: 'rbp'
        }[nbits], this.bits);

        /** System result register */
        this.RESULT_REG = new Expr.Reg({
            16: 'ax',
            32: 'eax',
            64: 'rax'
        }[nbits], this.bits);

        /** System counter register */
        this.COUNT_REG = new Expr.Reg({
            16: 'cx',
            32: 'ecx',
            64: 'rcx'
        }[nbits], this.bits);

        /** System stack pointer */
        this.STACK_REG = new Expr.Reg({
            16: 'sp',
            32: 'esp',
            64: 'rsp'
        }[nbits], this.bits);

        /** System program counter */
        this.PC_REG = new Expr.Reg({
            16: 'ip',
            32: 'eip',
            64: 'rip'
        }[nbits], this.bits);

        /** System flags register */
        this.FLAGS_REG = new Expr.Reg({
            16: 'flags',
            32: 'eflags',
            64: 'rflags'
        }[nbits], this.bits);

        /** Address size value */
        this.ASIZE_VAL = new Expr.Val(this.bits / 8, this.bits);

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
            'ja'    : _ja.bind(this),
            'jae'   : _jae.bind(this),
            'jb'    : _jb.bind(this),
            'jbe'   : _jbe.bind(this),
            'jc'    : _jb.bind(this),
            'je'    : _je.bind(this),
            'jg'    : _jg.bind(this),
            'jge'   : _jge.bind(this),
            'jl'    : _jl.bind(this),
            'jle'   : _jle.bind(this),
            'jna'   : _jbe.bind(this),
            'jnae'  : _jb.bind(this),
            'jnb'   : _jae.bind(this),
            'jnbe'  : _ja.bind(this),
            'jnc'   : _jae.bind(this),
            'jne'   : _jne.bind(this),
            'jng'   : _jle.bind(this),
            'jnge'  : _jl.bind(this),
            'jnl'   : _jge.bind(this),
            'jnle'  : _jg.bind(this),
            'jno'   : _jno.bind(this),
            'jns'   : _jns.bind(this),
            'jnz'   : _jne.bind(this),
            'jo'    : _jo.bind(this),
            'jpe'   : _jp.bind(this),
            'jpo'   : _jnp.bind(this),
            'js'    : _js.bind(this),
            'jz'    : _je.bind(this),

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
            'cmovs'  : _cmovs.bind(this),

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
            'sets'  : _sets.bind(this),

            // flags manipulations
            'clc' : _clc.bind(this),
            'cld' : _cld.bind(this),
            'stc' : _stc.bind(this),
            'std' : _std.bind(this),

            // signed assingments
            'movsx' : _mov.bind(this),  // TODO: dest is signed
            'movsxd': _mov.bind(this),  // TODO: dest is signed
            'movzx' : _mov.bind(this),  // TODO: dest is unsigned

            // sign exention
            'cbw'   : _cbw.bind(this),  // TODO: source is signed
            'cwde'  : _cwde.bind(this), // TODO: source is signed
            'cdqe'  : _cdqe.bind(this), // TODO: source is signed

            // string operations
            'cmpsb' : _cmps.bind(this),
            'cmpsw' : _cmps.bind(this),
            'cmpsd' : _cmps.bind(this),
            'cmpsq' : _cmps.bind(this),
            'stosb' : _stos.bind(this),
            'stosw' : _stos.bind(this),
            'stosd' : _stos.bind(this),
            'stosq' : _stos.bind(this),

            // sse
            'movaps': _mov.bind(this),
            'xorps' : _xor.bind(this),

            // rare stuff
            'movbe' : _movbe.bind(this),
            'popcnt': _popcnt.bind(this),

            // misc
            'nop'   : _nop.bind(this),
            'ud2'   : _ud2.bind(this),
            'hlt'   : _hlt.bind(this)
        };

        // as instruction size info is not carried by ir objects, we have to handle pc reg references as soon
        // as the insruction is transformed.
        //
        // in case of a pie, a wrapper function is set up to handle pc reg references. that wrapper internally
        // calls the original instruction handler and then scans the result to identify references to pc reg.
        // if there are, it places a pc reg definition on top of the generated expressions; that definition
        // simply assigns the appropriate address to the pc reg that is about to be used. since all transformed
        // expressions are originated from the same assembly instructions, all pc reg references reference the
        // same address. the assignment will be propagated to its users later on.
        if (iIj.pic) {
            var pc_reg = this.PC_REG;

            this.instructions = new Proxy(this.instructions, {
                get: function(obj, key) {
                    var ihandler = obj[key];

                    var wrapped = function(p) {
                        var exprs = ihandler(p);

                        var has_pic = exprs.some ? exprs.some(function(e) {
                            var __ref_pc_reg = function(op) {
                                return op.equals(pc_reg);
                            };

                            return (e instanceof Expr.Expr) && e.iter_operands().some(__ref_pc_reg);
                        }) : false;

                        if (has_pic) {
                            var pc_val = new Expr.Val(p.address.add(p.isize), pc_reg.size);

                            exprs.unshift(new Expr.Assign(pc_reg.clone(), pc_val));
                        }

                        return exprs;
                    };

                    return ihandler && wrapped;
                }
            });
        }

        this.invalid = _invalid;
    }

    /**
     * Create an Assign expression to system flags
     * @param {string} fname Name of the flag to modify
     * @param {number} val Either 0 or 1
     * @returns {Expr.Expr}
     */
    var set_flag = function(fname, val) {
        var flag = Flags[fname].clone();
        var bit = new Expr.Val(val, 1);

        return new Expr.Assign(flag, bit);
    };

    x86.prototype.eval_flags = function(expr, flist) {
        var flreg = this.FLAGS_REG;
        var e = [new Expr.Assign(flreg.clone(), expr.clone())];

        return e.concat(flist.map(function(fname) {
            var flag = Flags[fname].clone();
            var flag_op = Flags.make_op(fname, flreg.clone());

            return new Expr.Assign(flag, flag_op);
        }));
    };

    /**
     * List of possible instruction prefixes.
     * see R_ANAL_OP_PREFIX_* definitions in r2.
     * @enum {number}
     * @readonly
     */
    const INSN_PREF = {
        NONE  : 0,
        REP   : 2,
        REPNZ : 4,
        LOCK  : 8
    };

    x86.prototype.r2decode = function(aoj) {
        // r2cmd creates Long objects for all numeric values it finds. though it is required
        // for the assembly listing, it is not required for its metadata and generates redundant
        // overhead.
        // to make things simpler and lighter, we prefer to convert all meatadata Long objects
        // back to primitive numeric values.
        var toInt = function(n) {
            return n && n.__isLong__ ? parseInt(n) : n;
        };

        var process_ops = function(op) {
            return {
                /**
                 * Operand size in bits
                 * @type {number}
                 */
                size: toInt(op.size) * 8,

                /**
                 * Access type to operand: either read, write or none
                 * @type {number}
                 */
                access: toInt(op.rw),

                /**
                 * Operand type: either register, memory or immediate
                 * @type {string}
                 */
                type: op.type,

                /**
                 * Operand value: either register name or a numeric literal
                 * @type {string|Long}
                 */
                value: op.value,

                mem: {
                    base:  op.base,
                    index: op.index,
                    scale: toInt(op.scale),
                    disp:  toInt(op.disp)
                }
            };
        };

        var parsed = {
            address : aoj.addr,
            isize   : toInt(aoj.size),
            disasm  : aoj.disasm,
            prefix  : toInt(aoj.prefix),
            mnemonic: aoj.mnemonic,
            operands: aoj.opex.operands.map(process_ops)
        };

        return parsed;
    };

    var _make_new_reg = function(name, size) {
        return name && new Expr.Reg(name, size);
    };

    var _make_new_val = function(value, size) {
        return value && new Expr.Val(value, size);
    };

    /**
     * Analyze a textual assembly operand and create a matching IR expression for it.
     * @inner
     */
    x86.prototype.get_operand_expr = function(op) {
        var expr;

        switch (op.type) {
        case 'reg':
            expr = new Expr.Reg(op.value, op.size);
            break;

        case 'imm':
            expr = new Expr.Val(op.value, op.size);
            break;

        case 'mem':
            var bsize = op.mem.base ? this.archregs.get_reg_size(op.mem.base) : this.bits;

            var base  = _make_new_reg(op.mem.base,  bsize);
            var index = _make_new_reg(op.mem.index, bsize);
            var scale = _make_new_val(op.mem.scale, bsize);
            var disp  = _make_new_val(op.mem.disp,  bsize);       

            // [base + index*scale + disp]
            if (base && index && disp) {
                expr = new Expr.Add(base, new Expr.Add(scale ? new Expr.Mul(index, scale) : index, disp));
            }

            // [base + index*scale]
            else if (base && index) {
                expr = new Expr.Add(base, scale ? new Expr.Mul(index, scale) : index);
            }

            // [base + disp]
            else if (base && disp) {
                expr = new Expr.Add(base, disp);
            }

            // [base]
            else if (base) {
                expr = base;
            }

            // [disp]
            else if (disp) {
                expr = disp;
            }

            expr = new Expr.Deref(expr, op.size);
            break;

        default:
            throw new Error('unknown operand type: ' + op.type);
        }

        return expr;
    };

    x86.prototype.is_stack_reg = function(expr) {
        return this.STACK_REG.equals_no_idx(expr);
    };

    x86.prototype.is_aligned_stack_var = function(expr) {
        if (expr instanceof Expr.And) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            return (rhand instanceof Expr.Val) && (this.is_stack_reg(lhand) || this.is_stack_var(lhand));
        }

        return false;
    };

    x86.prototype.is_stack_var = function(expr) {
        // Expr.Sub: expr is an sp-based variable
        // Expr.Add: expr is an sp-based argument
        if ((expr instanceof Expr.Sub) || (expr instanceof Expr.Add)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            return (rhand instanceof Expr.Val) && (this.is_stack_reg(lhand) || this.is_aligned_stack_var(lhand));
        }

        return false;
    };

    x86.prototype.is_frame_reg = function(expr) {
        return this.FRAME_REG.equals_no_idx(expr);
    };

    x86.prototype.is_frame_var = function(expr) {
        // Expr.Sub: expr is a bp-based variable
        // Expr.Add: expr is a bp-based argument
        if ((expr instanceof Expr.Sub) || (expr instanceof Expr.Add)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            return (rhand instanceof Expr.Val) && (this.is_frame_reg(lhand));
        }

        return false;
    };

    // ---------- common handlers ----------//

    /** common handler for unary operators */
    var _common_uop = function(p, op) {
        var expr = this.get_operand_expr(p.operands[0]);

        // expr = op expr
        return [new Expr.Assign(expr.clone(), new op(expr))];
    };

    /** common handler for binary operators */
    var _common_bop = function(p, op) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        // lexpr = lexpr op rexpr
        return [new Expr.Assign(lexpr.clone(), new op(lexpr, rexpr))];
    };

    var _common_bitwise = function(p, op) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

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
        var taken = this.get_operand_expr(p.operands[0]);
        var not_taken = new Expr.Val(p.address.add(p.isize), p.operands[0].size);

        // if cond goto taken, otherwise fallthrough to not_taken
        return [new Stmt.Branch(p.address, cond, taken, not_taken)];
    };

    /** common handler for conditional movs */
    var _common_cmov = function(p, cond) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        // lexpr = cond ? lexpr : rexpr
        return [new Expr.Assign(lexpr.clone(), new Expr.TCond(cond, lexpr, rexpr))];
    };

    /** common handler for conditional sets */
    var _common_setcc = function(p, cond) {
        var expr = this.get_operand_expr(p.operands[0]);

        // expr = cond ? 1 : 0
        return [new Expr.Assign(expr, cond)];
    };

    var _common_set_flag = function(f, bval) {
        return [set_flag(f, bval)];
    };

    var _common_sign_ext = function(narrow) {
        var wide = {
            8:  'ax',
            16: 'eax',
            32: 'rax',
        }[narrow.size];

        // TODO: narrow should be sign-extended; tag this as signed operation somwhoe
        return [new Expr.Assign(new Expr.Reg(wide, narrow.size * 2), narrow)];
    };

    // ---------- instructions ----------//

    var _mov = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        // lexpr = rexpr
        return [new Expr.Assign(lexpr, rexpr)];
    };

    var _add = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        var op = new Expr.Add(lexpr, rexpr);

        // lexpr = lexpr + rexpr
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _adc = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        var op = new Expr.Add(new Expr.Add(lexpr, rexpr), Flags.CF.clone());

        // lexpr = lexpr + rexpr + eflags.cf
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _sub = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        var op = new Expr.Sub(lexpr, rexpr);

        // lexpr = lexpr - rexpr
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _div = function(p) {
        var divisor = this.get_operand_expr(p.operands[0]);
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
            new Expr.Assign(arg_remainder, new Expr.Mod(arg_dividend.clone(), divisor.clone())),
            new Expr.Assign(arg_quotient,  new Expr.Div(arg_dividend, divisor))
        ];
    };

    var _mul = function(p) {
        var multiplicand = this.get_operand_expr(p.operands[0]);
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
        var multiplicand = this.get_operand_expr(p.operands[p.operands.length - 2]);
        var multiplier = this.get_operand_expr(p.operands[p.operands.length - 1]);
        var product = this.get_operand_expr(p.operands[0]);

        // TODO: %of, %cf = (see intel sdm)

        // product = multiplier * multiplicand
        return [new Expr.Assign(product, new Expr.Mul(multiplier, multiplicand))];
    };

    var _inc = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var one = new Expr.Val(1, p.operands[0].size);

        var op = new Expr.Add(lexpr, one);

        // lexpr = lexpr + 1
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _dec = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var one = new Expr.Val(1, p.operands[0].size);

        var op = new Expr.Sub(lexpr, one);

        // lexpr = lexpr - 1
        return [new Expr.Assign(lexpr.clone(), op)].concat(
            this.eval_flags(lexpr, ['PF', 'AF', 'ZF', 'SF', 'OF'])
        );
    };

    var _push = function(p) {
        var expr = this.get_operand_expr(p.operands[0]);
        var sreg = this.STACK_REG;
        var asize = this.ASIZE_VAL;

        // rsp = rsp - asize
        // *rsp = expr
        return [
            new Expr.Assign(sreg.clone(), new Expr.Sub(sreg.clone(), asize.clone())),
            new Expr.Assign(new Expr.Deref(sreg.clone(), asize.size), expr)
        ];
    };

    var _pop = function(p) {
        var expr = this.get_operand_expr(p.operands[0]);
        var sreg = this.STACK_REG;
        var asize = this.ASIZE_VAL;

        // expr = *rsp
        // rsp = rsp + asize
        return [
            new Expr.Assign(expr, new Expr.Deref(sreg.clone(), asize.size)),
            new Expr.Assign(sreg.clone(), new Expr.Add(sreg.clone(), asize.clone()))
        ];
    };

    var _pushad = function(p) {
        var sreg = this.STACK_REG;
        var asize = this.ASIZE_VAL;

        var push_step = function(r) {
            return [
                new Expr.Assign(sreg.clone(), new Expr.Sub(sreg.clone(), asize.clone())),
                new Expr.Assign(new Expr.Deref(sreg.clone(), asize.size), r)
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

        return Array.prototype.concat(pushed_regs.map(push_step));
    };

    var _popad = function(p) {
        var sreg = this.STACK_REG;
        var asize = this.ASIZE_VAL;

        var pop_step = function(r) {
            return Array.prototype.concat(
                r ? [new Expr.Assign(r, new Expr.Deref(sreg.clone(), asize.size))] : [],
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

        return Array.prototype.concat(poped_regs.map(pop_step));
    };

    var _nop = function(p) {
        return [];
    };

    var _lea = function(p) {
        var lexpr = this.get_operand_expr(p.operands[0]);
        var rexpr = this.get_operand_expr(p.operands[1]);

        // lexpr = &rexpr
        return [new Expr.Assign(lexpr, new Expr.AddrOf(rexpr))];
    };

    var _leave = function(p) {
        var freg = this.FRAME_REG;
        var sreg = this.STACK_REG;
        var asize = this.ASIZE_VAL;

        // rsp = rbp
        // rbp = *rsp
        // rsp = rsp + asize
        return [
            new Expr.Assign(sreg.clone(), freg.clone()),
            new Expr.Assign(freg.clone(), new Expr.Deref(sreg.clone(), asize.size)),
            new Expr.Assign(sreg.clone(), new Expr.Add(sreg.clone(), asize.clone()))
        ];
    };

    var _call = function(p) {
        var args = [];
        var callee = this.get_operand_expr(p.operands[0]);
        var rreg = this.RESULT_REG;

        // the function call arguments list will be populated later on, according to calling convention
        return [new Expr.Assign(rreg.clone(), new Expr.Call(callee, args))];
    };

    var _ret = function(p) {
        // stack unwinding value [e.g. "ret 8"] is safely ignored
        return [new Stmt.Return(p.address, this.RESULT_REG.clone())];
    };

    // bitwise operations
    var _and = function(p) { return _common_bitwise.call(this, p, Expr.And); };
    var _or  = function(p) { return _common_bitwise.call(this, p, Expr.Or);  };
    var _xor = function(p) { return _common_bitwise.call(this, p, Expr.Xor); };

    var _shr = function(p) { return _common_bop.call(this, p, Expr.Shr); };    // TODO: evaluate flags for shr
    var _shl = function(p) { return _common_bop.call(this, p, Expr.Shl); };    // TODO: evaluate flags for shl
    var _sar = function(p) { return _common_bop.call(this, p, Expr.Shr); };    // TODO: evaluate flags for sar

    var _neg = function(p) { return _common_uop.call(this, p, Expr.Neg); };    // cf = (opnd is non-zero)
    var _not = function(p) { return _common_uop.call(this, p, Expr.Not); };

    var _cmp = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);

        return this.eval_flags(new Expr.Sub(lhand, rhand), ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']);
    };

    var _test = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);

        return this.eval_flags(new Expr.And(lhand, rhand), ['PF', 'ZF', 'SF']).concat([
            set_flag('CF', 0),
            set_flag('OF', 0)
        ]);
    };

    var _jmp = function(p) {
        var dst = this.get_operand_expr(p.operands[0]);

        return [new Stmt.Goto(p.address, dst)];
    };

    var _ja = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.ZF.clone()), new Expr.BoolNot(Flags.CF.clone())));
    };

    var _jae = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolNot(Flags.CF.clone()));
    };

    var _jb = function(p) {
        return _common_jcc.call(this, p, Flags.CF.clone());
    };

    var _jbe = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), Flags.CF.clone()));
    };

    var _je = function(p) {
        return _common_jcc.call(this, p, Flags.ZF.clone());
    };

    var _jg = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.ZF.clone()), new Expr.EQ(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _jge = function(p) {
        return _common_jcc.call(this, p, new Expr.EQ(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _jl = function(p) {
        return _common_jcc.call(this, p, new Expr.NE(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _jle = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), new Expr.NE(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _jne = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolNot(Flags.ZF.clone()));
    };

    var _jno = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolNot(Flags.OF.clone()));
    };

    var _jnp = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolNot(Flags.PF.clone()));
    };

    var _jns = function(p) {
        return _common_jcc.call(this, p, new Expr.BoolNot(Flags.SF.clone()));
    };

    var _jo = function(p) {
        return _common_jcc.call(this, p, Flags.OF.clone());
    };

    var _jp = function(p) {
        return _common_jcc.call(this, p, Flags.PF.clone());
    };

    var _js = function(p) {
        return _common_jcc.call(this, p, Flags.SF.clone());
    };

    var _cmova = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.ZF.clone()), new Expr.BoolNot(Flags.CF.clone())));
    };

    var _cmovae = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolNot(Flags.CF.clone()));
    };

    var _cmovb = function(p) {
        return _common_cmov.call(this, p, Flags.CF.clone());
    };

    var _cmovbe = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), Flags.CF.clone()));
    };

    var _cmovg = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.lag('ZF')), new Expr.EQ(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _cmovge = function(p) {
        return _common_cmov.call(this, p, new Expr.EQ(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _cmovl = function(p) {
        return _common_cmov.call(this, p, new Expr.NE(Flags.lag('SF'), Flags.OF.clone()));
    };

    var _cmovle = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), new Expr.NE(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _cmove = function(p) {
        return _common_cmov.call(this, p, Flags.ZF.clone());
    };

    var _cmovne = function(p) {
        return _common_cmov.call(this, p, new Expr.BoolNot(Flags.ZF.clone()));
    };

    var _cmovs = function(p) {
        return _common_cmov.call(this, p, Flags.SF.clone());
    };

    var _seta = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.ZF.clone()), new Expr.BoolNot(Flags.CF.clone())));
    };

    var _setae = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolNot(Flags.CF.clone()));
    };

    var _setb = function(p) {
        return _common_setcc.call(this, p, Flags.CF.clone());
    };

    var _setbe = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), Flags.CF.clone()));
    };

    var _setg = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolAnd(new Expr.BoolNot(Flags.ZF.clone()), new Expr.EQ(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _setge = function(p) {
        return _common_setcc.call(this, p, new Expr.EQ(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _setl = function(p) {
        return _common_setcc.call(this, p, new Expr.NE(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _setle = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolOr(Flags.ZF.clone(), new Expr.NE(Flags.SF.clone(), Flags.OF.clone())));
    };

    var _sete = function(p) {
        return _common_setcc.call(this, p, Flags.ZF.clone());
    };

    var _setne = function(p) {
        return _common_setcc.call(this, p, new Expr.BoolNot(Flags.ZF.clone()));
    };

    var _sets = function(p) {
        return _common_setcc.call(this, p, Flags.SF.clone());
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

    var _cbw = function(p) {
        var reg = new Expr.Reg('al', 8);

        return _common_sign_ext(reg);
    };

    var _cwde = function(p) {
        var reg = new Expr.Reg('ax', 16);

        return _common_sign_ext(reg);
    };

    var _cdqe = function(p) {
        var reg = new Expr.Reg('eax', 32);

        return _common_sign_ext(reg);
    };

    var _cmps = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);
        var expr;

        if (p.prefix === INSN_PREF.REP) {
            var s1 = new Expr.AddrOf(lhand);
            var s2 = new Expr.AddrOf(rhand);
            var n = new Expr.Mul(new Expr.Val(lhand.size / 8, this.nbits), this.COUNT_REG.clone());

            // TODO: using Expr.Reg for intrinsic name is cheating! it will get indexed by ssa
            expr = new Expr.Call(new Expr.Sym('memcmp'), [s1, s2, n]);
        } else {
            expr = new Expr.Sub(lhand, rhand);
        }

        // TODO: do we need to advance edi and esi pointers?
        return this.eval_flags(expr, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']);
    };

    var _stos = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);
        var expr;

        if (p.prefix === INSN_PREF.REP) {
            var s = new Expr.AddrOf(lhand);
            var c = rhand;
            var n = this.COUNT_REG.clone();

            // TODO: using Expr.Reg for intrinsic name is cheating! it will get indexed by ssa
            expr = new Expr.Call(new Expr.Sym('memset'), [s, c, n]);
        } else {
            expr = new Expr.Assign(lhand, rhand);
        }

        // TODO: do we need to advance edi and esi pointers?
        return [expr];
    };

    var _movbe = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);

        var bifunc = {
            16: '__builtin_bswap16',
            32: '__builtin_bswap32',
            64: '__builtin_bswap64'
        }[rhand.size];

        // TODO: using Expr.Reg for intrinsic name is cheating! it will get indexed by ssa
        return [new Expr.Assign(lhand, new Expr.Call(new Expr.Reg(bifunc), [rhand]))];
    };

    var _popcnt = function(p) {
        var lhand = this.get_operand_expr(p.operands[0]);
        var rhand = this.get_operand_expr(p.operands[1]);

        var bifunc = {
            32: '__builtin_popcount',
            64: '__builtin_popcountll'
        }[rhand.size];

        // TODO: using Expr.Reg for intrinsic name is cheating! it will get indexed by ssa
        return [new Expr.Assign(lhand, new Expr.Call(new Expr.Reg(bifunc), [rhand]))].concat(this.eval_flags(rhand, ['ZF']).concat([
            set_flag('PF', 0),
            set_flag('CF', 0),
            set_flag('AF', 0),
            set_flag('SF', 0),
            set_flag('OF', 0)
        ]));
    };

    var _hlt = function(p) {
        return [new Expr.Call(new Expr.Sym('_hlt'), [])];
    };

    var _ud2 = function(p) {
        return [new Expr.Call(new Expr.Sym('__builtin_trap'), [])];
    };

    var _invalid = function(p) {
        // TODO: improve handling of unknown instructions by generating dependencies
        // based on esil code for that instruction
        return [new Expr.Unknown(p.disasm)];
    };

    // TODO: to be implemented
    // idiv
    // movabs
    // rol
    // ror
    // lods{b,w,d,q}
    // movs{b,w,d,q}
    // scas{b,w,d,q}
    // pushf{,d,q}
    // popf{,d,q}
    // pusha
    // popa

    return x86;
});