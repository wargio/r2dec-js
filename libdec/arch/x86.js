/** 
 * Copyright (C) 2018 elicn
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

var Expr = require('libdec/core/ir/expressions');
var Stmt = require('libdec/core/ir/statements');

/** @constructor */
function x86(nbits, btype, endianess) {

    /** @type {number} */
    this.asize = nbits / 8;

    /** @type {string} */
    this.bintype = btype;

    /** @type {string} */
    this.endianess = endianess;

    this.FRAME_REG = {
        16: 'bp',
        32: 'ebp',
        64: 'rbp'
    }[nbits];

    this.RESULT_REG = {
        16: 'ax',
        32: 'eax',
        64: 'rax'
    }[nbits];

    this.STACK_REG = {
        16: 'sp',
        32: 'esp',
        64: 'rsp'
    }[nbits];

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
        'movsx': _mov.bind(this),   // TODO: dest is signed
        'movsxd':_mov.bind(this),   // TODO: dest is signed
        'movzx':_mov.bind(this),    // TODO: dest is unsigned

        // misc
        'nop'   : _nop.bind(this),
        'hlt'   : _hlt.bind(this)
    };

    this.invalid = _invalid;
}

x86.prototype.get_frame_reg = function() {
    return new Expr.reg(this.FRAME_REG, this.asize);
};

x86.prototype.get_result_reg = function() {
    return new Expr.reg(this.RESULT_REG, this.asize);
};

x86.prototype.get_stack_reg = function() {
    return new Expr.reg(this.STACK_REG, this.asize);
};

x86.prototype.get_flags_reg = function() {
    return new Expr.reg(this.FLAGS_REG, this.asize);
};

// system flags
var CF = (1 << 0);
var PF = (1 << 2);
var AF = (1 << 4);
var ZF = (1 << 6);
var SF = (1 << 7);
var DF = (1 << 10);
var OF = (1 << 11);

var get_flag = function(f) {
    var flags = {
        'CF': function() { return new Expr.reg('eflags.cf', 1); },
        'PF': function() { return new Expr.reg('eflags.pf', 1); },
        'AF': function() { return new Expr.reg('eflags.af', 1); },
        'ZF': function() { return new Expr.reg('eflags.zf', 1); },
        'SF': function() { return new Expr.reg('eflags.sf', 1); },
        'DF': function() { return new Expr.reg('eflags.df', 1); },
        'OF': function() { return new Expr.reg('eflags.of', 1); }
    };

    return flags[f]();
};

var _carry    = function(op) { Expr._uexpr.call(this, '<carry>', op); };
var _parity   = function(op) { Expr._uexpr.call(this, '<parity>', op); };
var _adjust   = function(op) { Expr._uexpr.call(this, '<adjust>', op); };
var _zero     = function(op) { Expr._uexpr.call(this, '<zero>', op); };
var _sign     = function(op) { Expr._uexpr.call(this, '<sign of>', op); };
var _overflow = function(op) { Expr._uexpr.call(this, '<overflow of>', op); };

_carry.prototype    = Object.create(Expr._uexpr.prototype);
_parity.prototype   = Object.create(Expr._uexpr.prototype);
_adjust.prototype   = Object.create(Expr._uexpr.prototype);
_zero.prototype     = Object.create(Expr._uexpr.prototype);
_sign.prototype     = Object.create(Expr._uexpr.prototype);
_overflow.prototype = Object.create(Expr._uexpr.prototype);

var get_flag_op = function(f, expr) {
    var ops = {
        'CF': function() { return new _carry(expr);    },
        'PF': function() { return new _parity(expr);   },
        'AF': function() { return new _adjust(expr);   },
        'ZF': function() { return new _zero(expr);     },
        'SF': function() { return new _sign(expr);     },
        'OF': function() { return new _overflow(expr); }
    };

    return ops[f]();
};

var set_flag = function(f, bval) {
    return new Expr.assign(get_flag(f), new Expr.val(bval, 1));
};

x86.prototype.eval_flags = function(expr, flist) {
    var e = [new Expr.assign(this.get_flags_reg(), expr.clone())];

    return e.concat(flist.map(function(f) {
        return new Expr.assign(get_flag(f), get_flag_op(f, expr.clone()));
    }));
};

x86.prototype.r2decode = function(aoj) {
    var process_ops = function(op) {

        var toInt = function(n) {
            return typeof n === 'string' ? n : parseInt(n);
        };

        var processed = {
            /**
             * Operand size in bytes
             * @type {number}
             */
            size: toInt(op.size),

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
             * @type {string|number}
             */
            value: toInt(op.value),

            mem: {
                base:  op.base,
                index: op.index,
                scale: (op.scale > 1) ? op.scale : undefined,
                disp:  op.disp
            }
        };

        return processed;
    };

    var parsed = {
        //TODO: get instruction prefix
        address : aoj.addr,
        isize   : aoj.size,
        mnemonic: aoj.mnemonic,
        operands: aoj.opex.operands.map(process_ops),
    };

    return parsed;
};

var OP_ACCESS_NONE  = 0;
var OP_ACCESS_READ  = 1;
var OP_ACCESS_WRITE = 2;

/** @inner */
var get_operand_expr = function(op) {
    var expr;

    switch (op.type) {
    case 'reg':
        expr = new Expr.reg(op.value, op.size);
        break;

    case 'imm':
        expr = new Expr.val(op.value, op.size);
        break;

    case 'mem':
        var base = op.mem.base && new Expr.reg(op.mem.base, op.size);
        var index = op.mem.index && new Expr.reg(op.mem.index, op.size);
        var scale = op.mem.scale && new Expr.val(op.mem.scale, op.size);
        var disp = op.mem.disp && new Expr.val(op.mem.disp, op.size);

        if (base && index && disp) {
            // [base + index*scale + disp]
            expr = new Expr.add(base, new Expr.add(scale ? new Expr.mul(index, scale) : index, disp));
        } else if (base && index) {
            // [base + index*scale]
            expr = new Expr.add(base, scale ? new Expr.mul(index, scale) : index);
        } else if (base && disp) {
            // [base + disp]
            expr = new Expr.add(base, disp);
        } else if (base) {
            // [base]
            expr = base;
        } else if (disp) {
            // [disp]
            expr = disp;
        }

        expr = new Expr.deref(expr, op.size);
        break;

    default:
        throw 'unknown operand type: ' + op.type;
    }

    return expr;
};

// ---------- common handlers ----------//

/** common handler for unary operators */
var _common_uop = function(p, op) {
    var expr = get_operand_expr(p.operands[0]);

    // expr = op expr
    return [new Expr.assign(expr.clone(), op(expr))];
};

/** common handler for binary operators */
var _common_bop = function(p, op) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    // lexpr = lexpr op rexpr
    return [new Expr.assign(lexpr.clone(), new op(lexpr, rexpr))];
};

var _common_bitwise = function(p, op) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    var op_expr = new op(lexpr, rexpr);

    // lexpr = lexpr op rexpr
    return [
        new Expr.assign(lexpr.clone(), op_expr),
        set_flag('CF', 0),
        set_flag('OF', 0)
    ].concat(this.eval_flags(op_expr, ['PF', 'ZF', 'SF']));
};

/** common handler for conditional jumps */
var _common_jcc = function(p, cond) {
    var taken = get_operand_expr(p.operands[0]);
    var not_taken = new Expr.val(p.address + p.isize, p.operands[0].size);

    // if cond goto taken otherwise fallthrough to not_taken
    return [new Stmt.branch(p.address, cond, taken, not_taken)];
};

/** common handler for conditional movs */
var _common_cmov = function(p, cond) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    // lexpr = cond ? lexpr : rexpr
    return [new Expr.assign(lexpr.clone(), new Expr.tcond(cond, lexpr, rexpr))];
};

/** common handler for conditional sets */
var _common_setcc = function(p, cond) {
    var expr = get_operand_expr(p.operands[0]);

    // expr = cond ? 1 : 0
    return [new Expr.assign(expr, cond)];
};

var _common_set_flag = set_flag;

// ---------- instructions ----------//

var _mov = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    // lexpr = rexpr
    return [new Expr.assign(lexpr, rexpr)];
};

var _add = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    var op = new Expr.add(lexpr, rexpr);

    // lexpr = lexpr + rexpr
    return [
        new Expr.assign(lexpr.clone(), op)
    ].concat(this.eval_flags(op, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']));
};

var _sub = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    var op = new Expr.sub(lexpr, rexpr);

    // lexpr = lexpr - rexpr
    return [
        new Expr.assign(lexpr.clone(), op)
    ].concat(this.eval_flags(op, ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']));
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
    var arg_dividend  = new Expr.reg(dividend[dividend.length - 1]);
    var arg_quotient  = new Expr.reg(quotient,  osize);
    var arg_remainder = new Expr.reg(remainder, osize);

    // quotient = dividend / divisor
    // remainder = dividend % divisor
    return [
        new Expr.assign(arg_quotient,  new Expr.div(arg_dividend, divisor)),
        new Expr.assign(arg_remainder, new Expr.mod(arg_dividend.clone(), divisor.clone()))
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
    var arg_product = new Expr.reg(product[product.length - 1]);
    var arg_multiplier = new Expr.reg(multiplier, osize);

    // TODO: %of, %cf = (upper part is non-zero)

    // product = multiplier * multiplicand
    return [new Expr.assign(arg_product, new Expr.div(arg_multiplier, multiplicand))];
};

var _inc = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var one = new Expr.val(1, p.operands[0].size);

    var op = new Expr.add(lexpr, one);

    // lexpr = lexpr + 1
    return [
        new Expr.assign(lexpr.clone(), op)
    ].concat(this.eval_flags(op, ['PF', 'AF', 'ZF', 'SF', 'OF']));
};

var _dec = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var one = new Expr.value(1, p.operands[0].size);

    var op = new Expr.sub(lexpr, one);

    // lexpr = lexpr - 1
    return [
        new Expr.assign(lexpr.clone(), op)
    ].concat(this.eval_flags(op, ['PF', 'AF', 'ZF', 'SF', 'OF']));
};

var _push = function(p) {
    var expr = get_operand_expr(p.operands[0]);
    var sreg = this.get_stack_reg();

    // *rsp = expr
    // rsp = rsp - asize
    return [
        new Expr.assign(new Expr.deref(sreg, this.asize), expr),
        new Expr.assign(sreg.clone(), new Expr.sub(sreg.clone(), new Expr.val(this.asize, this.asize)))
    ];
};

var _pop = function(p) {
    var expr = get_operand_expr(p.operands[0]);
    var sreg = this.get_stack_reg();

    // rsp = rsp + asize
    // expr = *rsp
    return [
        new Expr.assign(sreg, new Expr.add(sreg.clone(), new Expr.val(this.asize, this.asize))),
        new Expr.assign(expr, new Expr.deref(sreg.clone(), this.asize))
    ];
};

var _nop = function(p) {
    return [new Expr.nop()];
};

var _lea = function(p) {
    var lexpr = get_operand_expr(p.operands[0]);
    var rexpr = get_operand_expr(p.operands[1]);

    // lexpr = &rexpr
    return [new Expr.assign(lexpr, new Expr.address_of(rexpr))];
};

var _leave = function(p) {
    var freg = this.get_frame_reg();
    var sreg = this.get_stack_reg();

    // rsp = rbp
    // rsp = rsp + asize
    // rbp = *rsp
    return [
        new Expr.assign(sreg, freg),
        new Expr.assign(sreg.clone(), new Expr.add(sreg.clone(), new Expr.val(this.asize, this.asize))),
        new Expr.assign(freg.clone(), new Expr.deref(sreg.clone(), this.asize))
    ];
};

var _call = function(p) {
    var callee = get_operand_expr(p.operands[0]);
    var rreg = this.get_result_reg();
    var fargs = []; // TODO: populate function call arguments list

    return [new Expr.assign(rreg, new Expr.fcall(callee, fargs))];
};

var _ret = function(p) {
    return [new Stmt.ret(p.address, this.get_result_reg())];
};

var _and = function(p) { return _common_bitwise.call(this, p, Expr.and); };
var _or  = function(p) { return _common_bitwise.call(this, p, Expr.or);  };
var _xor = function(p) { return _common_bitwise.call(this, p, Expr.xor); };

var _shr = function(p) { return _common_bop(p, Expr.shr); };    // TODO: evaluate flags for shr
var _shl = function(p) { return _common_bop(p, Expr.shl); };    // TODO: evaluate flags for shl
var _sar = function(p) { return _common_bop(p, Expr.sar); };    // TODO: evaluate flags for sar

var _neg = function(p) { return _common_uop(p, Expr.neg); };    // cf = (opnd is non-zero)
var _not = function(p) { return _common_uop(p, Expr.not); };

var _cmp = function(p) {
    var lhand = get_operand_expr(p.operands[0]);
    var rhand = get_operand_expr(p.operands[1]);

    return this.eval_flags(new Expr.sub(lhand, rhand), ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF']);
};

var _test = function(p) {
    var lhand = get_operand_expr(p.operands[0]);
    var rhand = get_operand_expr(p.operands[1]);

    return [
        set_flag('CF', 0),
        set_flag('OF', 0)
    ].concat(this.eval_flags(new Expr.and(lhand, rhand), ['PF', 'ZF', 'SF']));
};

var _jmp = function(p) {
    var dst = get_operand_expr(p.operands[0]);

    // TODO: identify tail call optimizations

    return [new Stmt.goto(p.address, dst)];
};

var _je = function(p) {
    return _common_jcc(p, get_flag('ZF'));
};

var _ja = function(p) {
    return _common_jcc(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.bool_not(get_flag('CF'))));
};

var _jb = function(p) {
    return _common_jcc(p, get_flag('CF'));
};

var _jg = function(p) {
    return _common_jcc(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.cmp_eq(get_flag('SF'), get_flag('OF'))));
};

var _jl = function(p) {
    return _common_jcc(p, new Expr.cmp_ne(get_flag('SF'), get_flag('OF')));
};

var _jo = function(p) {
    return _common_jcc(p, get_flag('OF'));
};

var _js = function(p) {
    return _common_jcc(p, get_flag('SF'));
};

var _jne = function(p) {
    return _common_jcc(p, new Expr.bool_not(get_flag('ZF')));
};

var _jae = function(p) {
    return _common_jcc(p, new Expr.bool_not(get_flag('CF')));
};

var _jbe = function(p) {
    return _common_jcc(p, new Expr.bool_or(get_flag('ZF'), get_flag('CF')));
};

var _jge = function(p) {
    return _common_jcc(p, new Expr.cmp_eq(get_flag('SF'), get_flag('OF')));
};

var _jle = function(p) {
    return _common_jcc(p, new Expr.bool_or(get_flag('ZF'), new Expr.cmp_ne(get_flag('SF'), get_flag('OF'))));
};

var _jns = function(p) {
    return _common_jcc(p, new Expr.bool_not(get_flag('SF')));
};

var _jno = function(p) {
    return _common_jcc(p, new Expr.bool_not(get_flag('OF')));
};

var _cmova = function(p) {
    return _common_cmov(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.bool_not(get_flag('CF'))));
};

var _cmovae = function(p) {
    return _common_cmov(p, new Expr.bool_not(get_flag('CF')));
};

var _cmovb = function(p) {
    return _common_cmov(p, get_flag('CF'));
};

var _cmovbe = function(p) {
    return _common_cmov(p, new Expr.bool_or(get_flag('ZF'), get_flag('CF')));
};

var _cmovg = function(p) {
    return _common_cmov(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.cmp_eq(get_flag('SF'), get_flag('OF'))));
};

var _cmovge = function(p) {
    return _common_cmov(p, new Expr.cmp_eq(get_flag('SF'), get_flag('OF')));
};

var _cmovl = function(p) {
    return _common_cmov(p, new Expr.cmp_ne(get_flag('SF'), get_flag('OF')));
};

var _cmovle = function(p) {
    return _common_cmov(p, new Expr.bool_or(get_flag('ZF'), new Expr.cmp_ne(get_flag('SF'), get_flag('OF'))));
};

var _cmove = function(p) {
    return _common_cmov(p, get_flag('ZF'));
};

var _cmovne = function(p) {
    return _common_cmov(p, new Expr.bool_not(get_flag('ZF')));
};

var _seta = function(p) {
    return _common_setcc(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.bool_not(get_flag('CF'))));
};

var _setae = function(p) {
    return _common_setcc(p, new Expr.bool_not(get_flag('CF')));
};

var _setb = function(p) {
    return _common_setcc(p, get_flag('CF'));
};

var _setbe = function(p) {
    return _common_setcc(p, new Expr.bool_or(get_flag('ZF'), get_flag('CF')));
};

var _setg = function(p) {
    return _common_setcc(p, new Expr.bool_and(new Expr.bool_not(get_flag('ZF')), new Expr.cmp_eq(get_flag('SF'), get_flag('OF'))));
};

var _setge = function(p) {
    return _common_setcc(p, new Expr.cmp_eq(get_flag('SF'), get_flag('OF')));
};

var _setl = function(p) {
    return _common_setcc(p, new Expr.cmp_ne(get_flag('SF'), get_flag('OF')));
};

var _setle = function(p) {
    return _common_setcc(p, new Expr.bool_or(get_flag('ZF'), new Expr.cmp_ne(get_flag('SF'), get_flag('OF'))));
};

var _sete = function(p) {
    return _common_setcc(p, get_flag('ZF'));
};

var _setne = function(p) {
    return _common_setcc(p, new Expr.bool_not(get_flag('ZF')));
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

var _hlt = function() {
    return [new Expr.call('_hlt', [])];
};

var _invalid = function() {
    return [new Expr.nop()];
};

// imul
// idiv
// pand
// por
// pxor
// bswap
// movabs
// cbw
// cwde
// cdqe
// rol
// ror
// lodsb
// lodsw
// lodsd
// lodsq
// stosb
// stosw
// stosd
// stosq
// movsb
// movsw
// movsd
// movsq
// cmpsb
// cmpsw
// cmpsd
// cmpsq
// scasb
// scasw
// scasd
// scasq
