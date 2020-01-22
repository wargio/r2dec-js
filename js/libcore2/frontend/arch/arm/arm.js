/** 
 * Copyright (C) 2020 deroad
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
    const CGOpt = require('js/libcore2/backend/cgoptions');
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Stmt = require('js/libcore2/analysis/ir/statements');

    /** @constructor */
    function Arm(iIj) {
        // TODO: add 64 bit
        /** @type {number} */
        this.bits = 32; // iIj.bits.toInt();

        /** System result register */
        this.RESULT_REG = new Expr.Reg('r3', this.bits);

        /** System frame pointer */
        this.FRAME_REG = new Expr.Reg('fp', this.bits);

        /** System stack pointer */
        this.STACK_REG = new Expr.Reg('sp', this.bits);

        /** System program counter */
        this.PC_REG = new Expr.Reg('pc', this.bits);

        /** Intra procedure call scratch register */
        this.IP_REG = new Expr.Reg('ip', this.bits);

        /** Current Processor Status Register register */
        // https://community.arm.com/developer/ip-products/processors/b/processors-ip-blog/posts/condition-codes-1-condition-flags-and-codes
        this.CPSR_REG = new Expr.Reg('cpsr', this.bits);

        /** Address size value */
        this.ASIZE_VAL = new Expr.Val(this.bits / 8, this.bits);

        this.instructions = {
            /** math related */
            'add': _add.bind(this),
            'sub': _sub.bind(this),
            'and': _and.bind(this),
            'eor': _eor.bind(this),
            'xor': _xor.bind(this),
            'lsr': _lsr.bind(this),
            'lsl': _lsl.bind(this),
            'sar': _sar.bind(this),
            'neg': _neg.bind(this),
            'not': _not.bind(this),

            /** control flow related */
            'cmp': _cmp.bind(this),

            /** load and store */
            'ldr': _assign.bind(this),
            'str': _assign.bind(this),
            'ldrh': _assign.bind(this),
            'strh': _assign.bind(this),
            'ldrb': _assign.bind(this),
            'strb': _assign.bind(this),
            'ldrsh': _assign.bind(this),
            'strsh': _assign.bind(this),
            'ldrsb': _assign.bind(this),
            'strsb': _assign.bind(this),
            'ldm': _ldm.bind(this),

            /** generic */
            'mov': _assign.bind(this),
            'mvn': _mvn.bind(this),

            /** branch related */
            'b': _b.bind(this),
            'bl': _bl.bind(this),
            'beq': _beq.bind(this),
            'bne': _bne.bind(this),

            /** stack related */
            'push': _push.bind(this),
            'pop': _pop.bind(this),

            /** nop operations */
            'nop': _nop.bind(this),
        };

        this.invalid = _invalid;

        // as instruction size info is not carried by ir objects, we have to handle pc reg references as soon
        // as the insruction is transformed.
        //
        // in case of a pie, a wrapper function is set up to handle pc reg references. that wrapper internally
        // calls the original instruction handler and then scans the result to identify references to pc reg.
        // if there are, it places a pc reg definition on top of the generated expressions; that definition
        // simply assigns the appropriate address to the pc reg that is about to be used. since all transformed
        // expressions are originated from the same assembly instructions, all pc reg references reference the
        // same address. the assignment will be propagated to its users later on.
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
                        var pc_val = new Expr.Val(p.address.add(p.isize + 4), pc_reg.size);

                        exprs.unshift(new Expr.Assign(pc_reg.clone(), pc_val));
                    }

                    return exprs;
                };

                return ihandler && wrapped;
            }
        });
    }

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
    Arm.prototype.get_operand_expr = function(p, idx) {
        var op = p.operands[idx];
        var expr;

        switch (op.type) {
        case 'reg':
            expr = new Expr.Reg(op.value, 32);
            break;

        case 'imm':
            expr = new Expr.Val(op.value, 16);
            break;

        case 'mem':
            var base  = _make_new_reg(op.mem.base,  this.bits);
            var disp  = _make_new_val(op.mem.disp,  this.bits);       

            // [base + disp]
            if (base && disp) {
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

    Arm.prototype.is_pc_reg = function(expr) {
        return this.PC_REG.equals_no_idx(expr);
    };

    Arm.prototype.is_stack_reg = function(expr) {
        return this.STACK_REG.equals_no_idx(expr);
    };

    Arm.prototype.is_stack_var = function(expr) {
        // Expr.Sub: expr is an sp-based variable
        // Expr.Add: expr is an sp-based argument
        if ((expr instanceof Expr.Sub) || (expr instanceof Expr.Add)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            return (rhand instanceof Expr.Val) && (this.is_stack_reg(lhand));
        }

        return false;
    };

    Arm.prototype.is_frame_reg = function(expr) {
        return this.FRAME_REG.equals_no_idx(expr);
    };

    Arm.prototype.is_frame_var = function(expr) {
        // Expr.Sub: expr is a fp-based variable
        // Expr.Add: expr is a fp-based argument
        if ((expr instanceof Expr.Sub) || (expr instanceof Expr.Add)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            return (rhand instanceof Expr.Val) && (this.is_frame_reg(lhand));
        }

        return false;
    };

    Arm.prototype.r2decode = function(aoj) {
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

    Arm.prototype.cgopt = function() {
        const opts = new CGOpt();
        opts.numeric_deref = true;
        return opts;
    };

    // ---------- common handlers ----------//

    /** common handler for unary operators */
    var _common_uop = function(p, op) {
        var expr = this.get_operand_expr(p, 0);

        // expr = op expr
        return [new Expr.Assign(expr.clone(), new op(expr))];
    };

    /** common handler for binary operators */
    var _common_bop = function(p, op) {
        var lexpr = this.get_operand_expr(p, 0);
        var rexpr = this.get_operand_expr(p, 1);

        // lexpr = lexpr op rexpr
        return [new Expr.Assign(lexpr.clone(), new op(lexpr, rexpr))];
    };

    var _common_bitwise = function(p, op) {
        var lexpr = this.get_operand_expr(p, 0);
        var rexpr = this.get_operand_expr(p, 1);

        var op_expr = new op(lexpr, rexpr);

        // lexpr = lexpr op rexpr
        return [new Expr.Assign(lexpr.clone(), op_expr)];
    };

    // conditional branch
    var _common_cb = function(p, cond) {
        var taken = this.get_operand_expr(p, 0);
        var not_taken = new Expr.Val(p.address.add(p.isize), p.operands[0].size);
        // if cond goto taken, otherwise fallthrough to not_taken
        return [new Stmt.Branch(p.address, cond, taken, not_taken)];
    };

    // conditional operation
    var _common_cop = function(p, cond, op) {
        var taken = new Expr.Val(p.address.add(p.isize), p.operands[0].size);
        var not_taken = new Expr.Val(p.address, p.operands[0].size);
        // if cond goto taken, otherwise fallthrough to not_taken
        return [new Stmt.Branch(p.address, new Expr.BoolNot(cond), taken, not_taken), op];
    };

    /** instructions */

    var _and = function(p) {
        return _common_bitwise.call(this, p, Expr.And);
    };

    var _eor = function(p) {
        return _common_bitwise.call(this, p, Expr.Or);
    };

    var _xor = function(p) {
        return _common_bitwise.call(this, p, Expr.Xor);
    };

    var _lsr = function(p) {
        return _common_bop.call(this, p, Expr.Shr);
    };

    var _lsl = function(p) {
        return _common_bop.call(this, p, Expr.Shl);
    };

    var _sar = function(p) {
        return _common_bop.call(this, p, Expr.Shr);
    };

    var _neg = function(p) {
        return _common_uop.call(this, p, Expr.Neg);
    };

    var _not = function(p) {
        return _common_uop.call(this, p, Expr.Not);
    };

    var _add = function(p) {
        // dst = srcA + srcB
        var dst  = this.get_operand_expr(p, 0);
        var srcA = this.get_operand_expr(p, 1);
        var srcB = this.get_operand_expr(p, 2);
        return [new Expr.Assign(dst, new Expr.Add(srcA, srcB))];
    };

    var _sub = function(p) {
        // dst = srcA - srcB
        var dst  = this.get_operand_expr(p, 0);
        var srcA = this.get_operand_expr(p, 1);
        var srcB = this.get_operand_expr(p, 2);
        return [new Expr.Assign(dst, new Expr.Sub(srcA, srcB))];
    };

    var _assign = function(p) {
        // dst = src
        var dst = this.get_operand_expr(p, 0);
        var src = this.get_operand_expr(p, 1);

        return [new Expr.Assign(dst, src)];
    };

    var _mvn = function(p) {
        var dst = this.get_operand_expr(p, 0);
        var src = this.get_operand_expr(p, 1);

        var expr = new Expr.Assign(dst, src);
        return _common_cop.call(this, p, new Expr.BoolNot(this.CPSR_REG.clone()), expr);
    };

    var _push = function(p) {
        var ops = [];
        for (var i = 0; i < p.operands.length; i++) {
            var expr = this.get_operand_expr(p, i);
            var sreg = this.STACK_REG;
            var asize = new Expr.Val((this.bits / 8) * (i + 1), this.bits);
            //  sp = sp - asize
            // *sp = expr
            var sub = new Expr.Sub(sreg.clone(), asize.clone());
            var ptr = new Expr.Deref(sreg.clone(), asize.size);
            ops.push(new Expr.Assign(sreg.clone(), sub));
            ops.push(new Expr.Assign(ptr, expr));
        }

        return ops; 
    };

    var _pop = function(p) {
        var ops = [];
        for (var i = 0; i < p.operands.length; i++) {
            var expr = this.get_operand_expr(p, i);
            var sreg = this.STACK_REG;
            var asize = new Expr.Val((this.bits / 8) * (i + 1), this.bits);
            // *sp = expr
            //  sp = sp + asize
            var add = new Expr.Add(sreg.clone(), asize.clone());
            var ptr = new Expr.Deref(sreg.clone(), asize.size);
            ops.push(new Expr.Assign(expr, ptr));
            ops.push(new Expr.Assign(sreg.clone(), add));
        }

        return ops; 
    };

    var _ldm = function(p) {
        var ops = [];
        var sreg = this.get_operand_expr(p, 0);
        for (var i = 1; i < p.operands.length; i++) {
            var expr = this.get_operand_expr(p, i);
            var asize = new Expr.Val((this.bits / 8) * (i + 1), this.bits);
            // *sp = expr
            //  sp = sp + asize
            var add = new Expr.Add(sreg.clone(), asize.clone());
            var ptr = new Expr.Deref(sreg.clone(), asize.size);
            ops.push(new Expr.Assign(expr, ptr));
            ops.push(new Expr.Assign(sreg.clone(), add));
        }

        return ops; 
    };

    var _bl = function(p) {
        var args = [];
        var callee = this.get_operand_expr(p, 0);
        var rreg = this.RESULT_REG;

        // the function call arguments list will be populated later on, according to calling convention
        return [new Expr.Assign(rreg.clone(), new Expr.Call(callee, args))];
    };

    var _b = function(p) {
        var dst = this.get_operand_expr(p, 0);

        return [new Stmt.Goto(p.address, dst)];
    };

    var _beq = function(p) {
        var dst = this.get_operand_expr(p, 0);

        return _common_cb.call(this, p, this.CPSR_REG.clone());
    };

    var _bne = function(p) {
        var dst = this.get_operand_expr(p, 0);

        return _common_cb.call(this, p, new Expr.BoolNot(this.CPSR_REG.clone()));
    };

    var _bge = function(p) {
        var dst = this.get_operand_expr(p, 0);

        return _common_cb.call(this, p, new Expr.EQ(Flags.SF.clone(), Flags.OF.clone()));
    };

    var _cmp = function(p) {
        var lhand = this.get_operand_expr(p, 0);
        var rhand = this.get_operand_expr(p, 1);

        return [new Expr.Assign(this.CPSR_REG.clone(), new Expr.Sub(lhand, rhand))];
    };

    // ---------- common handlers ----------//

    var _nop = function(p) {
        return [];
    };

    var _invalid = function(p) {
        // TODO: improve handling of unknown instructions by generating dependencies
        // based on esil code for that instruction
        return [new Expr.Unknown(p.disasm)];
    };

    return Arm;
});