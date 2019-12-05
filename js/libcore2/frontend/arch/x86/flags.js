/* 
 * Copyright (C) 2019 elicn
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
    const Expr = require('js/libcore2/analysis/ir/expressions');

    /**
     * Flag abstract base class; a flag is in fact a 1-bit register.
     * It has to be a register so it would get indexed by ssa
     * @param {string} id flag name
     * @constructor
     */
    function Flag(id) {
        Expr.Reg.call(this, id, 1);
    }

    Flag.prototype = Object.create(Expr.Reg.prototype);
    Flag.prototype.constructor = Flag;

    /**
     * Flag operation abstract base class; a flag operation describes how the
     * flag operates on a given expression.
     * 
     * e.g. 'Carry(Add(Reg('eax', 32), Val(5, 32)))' means 'the carry of eax + 5'
     * @param {Expr.Expr|Expr.Literal} expr Expression or literal to operate on
     * @constructor
     */
    function FlagOp(expr) {
        Expr.UExpr.call(this, expr);
    }

    FlagOp.prototype = Object.create(Expr.UExpr.prototype);
    FlagOp.prototype.constructor = FlagOp;

    function Carry    (expr) { FlagOp.call(this, expr); }
    function Parity   (expr) { FlagOp.call(this, expr); }
    function Adjust   (expr) { FlagOp.call(this, expr); }
    function Zero     (expr) { FlagOp.call(this, expr); }
    function Sign     (expr) { FlagOp.call(this, expr); }
    function Overflow (expr) { FlagOp.call(this, expr); }

    Carry.prototype    = Object.create(FlagOp.prototype);
    Parity.prototype   = Object.create(FlagOp.prototype);
    Adjust.prototype   = Object.create(FlagOp.prototype);
    Zero.prototype     = Object.create(FlagOp.prototype);
    Sign.prototype     = Object.create(FlagOp.prototype);
    Overflow.prototype = Object.create(FlagOp.prototype);

    Carry.prototype.constructor    = Carry;
    Parity.prototype.constructor   = Parity;
    Adjust.prototype.constructor   = Adjust;
    Zero.prototype.constructor     = Zero;
    Sign.prototype.constructor     = Sign;
    Overflow.prototype.constructor = Overflow;

    const FLAG_OPS = {
        CF: Carry,
        PF: Parity,
        AF: Adjust,
        ZF: Zero,
        SF: Sign,
        OF: Overflow
    };

    /**
     * Create a special expression representing the operation of the given flag.
     * Note that the returned expression is arch-specific.
     * @param {string} id Flag id
     * @param {Expr.Expr} expr Expression to operate on (i.e. whose carry)
     * @returns {FlagOp}
     */
    var make_op = function(id, expr) {
        return new FLAG_OPS[id](expr);
    };

    var cmp_from_flags = function(expr) {
        var cmp = null;
        var op = null;

        if (expr instanceof FlagOp) {
            var fop = expr.operands[0];

            // equal
            if (expr instanceof Zero) {
                cmp = Expr.EQ;
                op = fop;
            }

            // below (unsigned)
            else if (expr instanceof Carry) {
                cmp = Expr.LT;
                op = fop;
            }
        }

        else if (expr instanceof Expr.UExpr) {
            var uop = expr.operands[0];

            // above (unsigned)
            if ((expr instanceof Expr.BoolNot) &&
                (uop instanceof Carry)) {
                    cmp = Expr.GE;
                    op = uop.operands[0];
            }
        }

        else if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // less (signed)
            if ((expr instanceof Expr.NE) && (lhand instanceof Sign) && (rhand instanceof Overflow) &&
                (lhand.operands[0].equals(rhand.operands[0]))) {
                    cmp = Expr.LT;
                    op = lhand.operands[0];
            }

            // greater (signed)
            else if ((expr instanceof Expr.EQ) && (lhand instanceof Sign) && (rhand instanceof Overflow) &&
                (lhand.operands[0].equals(rhand.operands[0]))) {
                    cmp = Expr.GE;
                    op = lhand.operands[0];
            }
        }

        return cmp ? new cmp(op.clone(['idx', 'def']), new Expr.Val(0, op.size)) : op;
    };

    return {
        Flag   : Flag,
        FlagOp : FlagOp,

        CF: new Flag('eflags.cf'),
        PF: new Flag('eflags.pf'),
        AF: new Flag('eflags.af'),
        ZF: new Flag('eflags.zf'),
        SF: new Flag('eflags.sf'),
        DF: new Flag('eflags.df'),
        OF: new Flag('eflags.of'),

        make_op : make_op,
        cmp_from_flags : cmp_from_flags
    };
});