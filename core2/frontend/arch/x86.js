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

module.exports = x86;

const Expr = require('core2/analysis/ir/expressions');
const Stmt = require('core2/analysis/ir/statements');
const ArchRegs = require('core2/frontend/arch/archregs');

/** @constructor */
function x86(nbits, btype, endianess) {

    /** @type {number} */
    this.bits = nbits;

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

        // arithmetic operations
        'add'   : _add.bind(this),
        'adc'   : _adc.bind(this),
        'sub'   : _sub.bind(this),
        'div'   : _div.bind(this),
        'mul'   : _mul.bind(this),
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

x86.prototype.assign_fcall_args = function(stmts) {
    var sreg = this.get_stack_reg();
    var i = 0;

    // TODO: this is a poc for x86-cdecl. need to determine calling convention and
    // track arguments setup accordingly.

    // walk through all statements generated for the current basic block to identify
    // call sites. a call site is a subset of a basic block which includes arguments
    // setup and ends with a function call. there may be any number of call sites in
    // a single basic block: none, one or more

   while (i < stmts.length) {
        var fcall = null;
        var nargs = 0;

        while (i < stmts.length) {
            var curr = stmts[i++].expressions[0];

            if (curr instanceof Expr.Assign) {
                var lhand = curr.operands[0];
                var rhand = curr.operands[1];

                // reached a function call
                if (rhand instanceof Expr.Call) {
                    fcall = rhand;
                    break;
                }

                // reached an assignment to a stack location; that is probably an argument for the upcoming function call
                else if ((lhand instanceof Expr.Deref) && lhand.operands[0].equals(sreg)) {
                    nargs++;
                }

                // reached a stack pointer adjustment, which most likely to end a call site. restart.
                else if (lhand.equals(sreg) && (rhand instanceof Expr.Add) && rhand.operands[0].equals(sreg)) {
                    nargs = 0;
                }
            }
        }

        if (fcall) {
            for (var j = 0; j < nargs; j++) {
                var stack_loc = new Expr.Add(this.get_stack_reg(), this.get_asize_val(j + 1));

                fcall.push_operand(new Expr.Deref(stack_loc, this.nbits));
            }
        }
   }
};

var gen_overlaps = function(stmts) {
    var copy = [];

    stmts.forEach(function(s) {
        copy.push(s);

        s.expressions.forEach(function(e) {
            if (e instanceof Expr.Assign) {
                var lhand = e.operands[0];

                if (lhand instanceof Expr.Reg) {
                    Array.prototype.push.apply(copy, ArchRegs.gen_overlaps(lhand));
                }
            }
        });
    });

    // replace stmts with copy array that includes generated overlaps
    Array.prototype.splice.apply(stmts, [0, stmts.length].concat(copy));
};

x86.prototype.post_transform = function(stmts) {
    // TODO: make StackVar objects?

    // analyze and assign function calls arguments.
    // note: stmts array is not modified by this function
    this.assign_fcall_args(stmts);

    // duplicate assignments for overlapping registers to maintain def-use correctness. this
    // generates a lot of redundant statements that eventually eliminated if they are not used.
    // note: stmts array is modified by this function
    gen_overlaps(stmts);
};

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
 * Get a copy of the system [pseudo] flags register.
 * @returns {Expr.Reg}
 */
x86.prototype.get_flags_reg = function() {
    return new Expr.Reg(this.FLAGS_REG, this.bits);
};

/**
 * Get a copy of the system native address size value.
 * @param {number} scalar A numeric scalar to multiple (default: 1)
 * @returns {Expr.Val}
 */
x86.prototype.get_asize_val = function(scalar) {
    return new Expr.Val(this.bits / 8 * (scalar || 1), this.bits);
};

// function StackVar(expr) { Expr.Deref.call(this, expr); }
//
// StackVar.prototype = Object.create(Expr.Deref.prototype);
// StackVar.prototype.constructor = StackVar;

/**
 * Lists system flags.
 * @enum {number}
 * @readonly
 */
const FLAGS = {
    CF: (1 << 0),
    PF: (1 << 2),
    AF: (1 << 4),
    ZF: (1 << 6),
    SF: (1 << 7),
    DF: (1 << 10),
    OF: (1 << 11)
};

var Flag = function(f) {
    var flags = {
        'CF': 'eflags.cf',
        'PF': 'eflags.pf',
        'AF': 'eflags.af',
        'ZF': 'eflags.zf',
        'SF': 'eflags.sf',
        'DF': 'eflags.df',
        'OF': 'eflags.of'
    };

    // create a new instance of a 1-bit register
    return new Expr.Reg(flags[f], 1);
};

function Carry    (op) { Expr.UExpr.call(this, '<carry>', op); }
function Parity   (op) { Expr.UExpr.call(this, '<parity>', op); }
function Adjust   (op) { Expr.UExpr.call(this, '<adjust>', op); }
function Zero     (op) { Expr.UExpr.call(this, '<zero>', op); }
function Sign     (op) { Expr.UExpr.call(this, '<sign of>', op); }
function Overflow (op) { Expr.UExpr.call(this, '<overflow of>', op); }

Carry.prototype    = Object.create(Expr.UExpr.prototype);
Parity.prototype   = Object.create(Expr.UExpr.prototype);
Adjust.prototype   = Object.create(Expr.UExpr.prototype);
Zero.prototype     = Object.create(Expr.UExpr.prototype);
Sign.prototype     = Object.create(Expr.UExpr.prototype);
Overflow.prototype = Object.create(Expr.UExpr.prototype);

Carry.prototype.constructor    = Carry;
Parity.prototype.constructor   = Parity;
Adjust.prototype.constructor   = Adjust;
Zero.prototype.constructor     = Zero;
Sign.prototype.constructor     = Sign;
Overflow.prototype.constructor = Overflow;

/**
 * Create a special expression representing the operation of the given flag.
 * Note that the returned expression is arch-specific.
 * @param {string} f Flag token
 * @param {Expr.Expr} expr Expression to operate on (i.e. whose carry)
 * @returns {Expr.Expr}
 */
var FlagOp = function(f, expr) {
    var ops = {
        'CF': Carry,
        'PF': Parity,
        'AF': Adjust,
        'ZF': Zero,
        'SF': Sign,
        'OF': Overflow
    };

    return new ops[f](expr);
};

/**
 * Create an Assign expression to system flags
 * @param {string} f Flag token to modify
 * @param {number} bval Either 0 or 1
 * @returns {Expr.Expr}
 */
var set_flag = function(f, bval) {
    return new Expr.Assign(Flag(f), new Expr.Val(bval, 1));
};

x86.prototype.eval_flags = function(expr, flist) {
    var flreg = this.get_flags_reg();
    var e = [new Expr.Assign(flreg, expr.clone())];

    return e.concat(flist.map(function(f) {
        return new Expr.Assign(Flag(f), FlagOp(f, flreg.clone()));
    }));
};

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
                disp:  op.disp
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
 * Analyze a textual assembly operand and create a matching IR expression for it.
 * @inner
 */
var get_operand_expr = function(op) {
    var expr;

    switch (op.type) {
    case 'reg':
        expr = new Expr.Reg(op.value, op.size);
        break;

    case 'imm':
        expr = new Expr.Val(op.value, op.size);
        break;

    case 'mem':
        var base = op.mem.base && new Expr.Reg(op.mem.base, op.size);
        var index = op.mem.index && new Expr.Reg(op.mem.index, op.size);
        var scale = op.mem.scale && new Expr.Val(op.mem.scale, op.size);
        var disp = op.mem.disp && new Expr.Val(op.mem.disp, op.size);

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

        expr = new Expr.Deref(expr, op.size);
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

    var op = new Expr.Add(new Expr.Add(lexpr, rexpr), Flag('CF'));

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
    return [new Expr.Assign(arg_product, new Expr.Div(arg_multiplier, multiplicand))];
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

    // *rsp = expr
    // rsp = rsp - asize
    return [
        new Expr.Assign(new Expr.Deref(sreg, this.bits), expr),
        new Expr.Assign(sreg.clone(), new Expr.Sub(sreg.clone(), asize))
    ];
};

var _pop = function(p) {
    var expr = get_operand_expr(p.operands[0]);
    var sreg = this.get_stack_reg();
    var asize = this.get_asize_val();

    // rsp = rsp + asize
    // expr = *rsp
    return [
        new Expr.Assign(sreg, new Expr.Add(sreg.clone(), asize)),
        new Expr.Assign(expr, new Expr.Deref(sreg.clone(), this.bits))
    ];
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
    // rsp = rsp + asize
    // rbp = *rsp
    return [
        new Expr.Assign(sreg, freg),
        new Expr.Assign(sreg.clone(), new Expr.Add(sreg.clone(), asize)),
        new Expr.Assign(freg.clone(), new Expr.Deref(sreg.clone(), this.bits))
    ];
};

var _call = function(p) {
    var args = [];  // TODO: determine calling convension and arguments
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

    // TODO: identify tail call optimizations

    return [new Stmt.Goto(p.address, dst)];
};

var _je = function(p) {
    return _common_jcc(p, Flag('ZF'));
};

var _ja = function(p) {
    return _common_jcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.BoolNot(Flag('CF'))));
};

var _jb = function(p) {
    return _common_jcc(p, Flag('CF'));
};

var _jg = function(p) {
    return _common_jcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.EQ(Flag('SF'), Flag('OF'))));
};

var _jl = function(p) {
    return _common_jcc(p, new Expr.NE(Flag('SF'), Flag('OF')));
};

var _jo = function(p) {
    return _common_jcc(p, Flag('OF'));
};

var _js = function(p) {
    return _common_jcc(p, Flag('SF'));
};

var _jne = function(p) {
    return _common_jcc(p, new Expr.BoolNot(Flag('ZF')));
};

var _jae = function(p) {
    return _common_jcc(p, new Expr.BoolNot(Flag('CF')));
};

var _jbe = function(p) {
    return _common_jcc(p, new Expr.BoolOr(Flag('ZF'), Flag('CF')));
};

var _jge = function(p) {
    return _common_jcc(p, new Expr.EQ(Flag('SF'), Flag('OF')));
};

var _jle = function(p) {
    return _common_jcc(p, new Expr.BoolOr(Flag('ZF'), new Expr.NE(Flag('SF'), Flag('OF'))));
};

var _jns = function(p) {
    return _common_jcc(p, new Expr.BoolNot(Flag('SF')));
};

var _jno = function(p) {
    return _common_jcc(p, new Expr.BoolNot(Flag('OF')));
};

var _cmova = function(p) {
    return _common_cmov(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.BoolNot(Flag('CF'))));
};

var _cmovae = function(p) {
    return _common_cmov(p, new Expr.BoolNot(Flag('CF')));
};

var _cmovb = function(p) {
    return _common_cmov(p, Flag('CF'));
};

var _cmovbe = function(p) {
    return _common_cmov(p, new Expr.BoolOr(Flag('ZF'), Flag('CF')));
};

var _cmovg = function(p) {
    return _common_cmov(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.EQ(Flag('SF'), Flag('OF'))));
};

var _cmovge = function(p) {
    return _common_cmov(p, new Expr.EQ(Flag('SF'), Flag('OF')));
};

var _cmovl = function(p) {
    return _common_cmov(p, new Expr.NE(Flag('SF'), Flag('OF')));
};

var _cmovle = function(p) {
    return _common_cmov(p, new Expr.BoolOr(Flag('ZF'), new Expr.NE(Flag('SF'), Flag('OF'))));
};

var _cmove = function(p) {
    return _common_cmov(p, Flag('ZF'));
};

var _cmovne = function(p) {
    return _common_cmov(p, new Expr.BoolNot(Flag('ZF')));
};

var _seta = function(p) {
    return _common_setcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.BoolNot(Flag('CF'))));
};

var _setae = function(p) {
    return _common_setcc(p, new Expr.BoolNot(Flag('CF')));
};

var _setb = function(p) {
    return _common_setcc(p, Flag('CF'));
};

var _setbe = function(p) {
    return _common_setcc(p, new Expr.BoolOr(Flag('ZF'), Flag('CF')));
};

var _setg = function(p) {
    return _common_setcc(p, new Expr.BoolAnd(new Expr.BoolNot(Flag('ZF')), new Expr.EQ(Flag('SF'), Flag('OF'))));
};

var _setge = function(p) {
    return _common_setcc(p, new Expr.EQ(Flag('SF'), Flag('OF')));
};

var _setl = function(p) {
    return _common_setcc(p, new Expr.NE(Flag('SF'), Flag('OF')));
};

var _setle = function(p) {
    return _common_setcc(p, new Expr.BoolOr(Flag('ZF'), new Expr.NE(Flag('SF'), Flag('OF'))));
};

var _sete = function(p) {
    return _common_setcc(p, Flag('ZF'));
};

var _setne = function(p) {
    return _common_setcc(p, new Expr.BoolNot(Flag('ZF')));
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
    return [new Expr.Unknown(p.disasm)]; // TODO: improve handling of unknown instructions
};

// TODO: to be implemented
// imul
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
// pusha{,d}
// popa{,d}