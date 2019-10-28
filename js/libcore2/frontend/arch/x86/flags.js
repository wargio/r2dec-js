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

module.exports = (function() {
    const Expr = require('js/libcore2/analysis/ir/expressions');

    var _flag_names = {
        'CF': 'eflags.cf',
        'PF': 'eflags.pf',
        'AF': 'eflags.af',
        'ZF': 'eflags.zf',
        'SF': 'eflags.sf',
        'DF': 'eflags.df',
        'OF': 'eflags.of'
    };

    var _flag_operations = {
        'CF': Carry,
        'PF': Parity,
        'AF': Adjust,
        'ZF': Zero,
        'SF': Sign,
        'OF': Overflow
    };

    // create a new instance of a 1-bit register
    var Flag = function(f) {
        return new Expr.Reg(_flag_names[f], 1);
    };

    function Carry    (op) { Expr.UExpr.call(this, op); }
    function Parity   (op) { Expr.UExpr.call(this, op); }
    function Adjust   (op) { Expr.UExpr.call(this, op); }
    function Zero     (op) { Expr.UExpr.call(this, op); }
    function Sign     (op) { Expr.UExpr.call(this, op); }
    function Overflow (op) { Expr.UExpr.call(this, op); }

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
        return new _flag_operations[f](expr);
    };

    var cmp_from_flags = function(expr) {
        var cmp = null;
        var op = null;

        // equal
        if (expr instanceof Zero) {
            cmp = Expr.EQ;
            op = expr.operands[0];
        }

        // less (signed)
        else if ((expr instanceof Expr.NE) &&
            (expr.operands[0] instanceof Sign) &&
            (expr.operands[1] instanceof Overflow) &&
            (expr.operands[0].operands[0].equals(expr.operands[1].operands[0]))) {
                cmp = Expr.LT;
                op = expr.operands[0].operands[0];
        }

        // greater (signed)
        else if ((expr instanceof Expr.EQ) &&
            (expr.operands[0] instanceof Sign) &&
            (expr.operands[1] instanceof Overflow) &&
            (expr.operands[0].operands[0].equals(expr.operands[1].operands[0]))) {
                cmp = Expr.GE;
                op = expr.operands[0].operands[0];
        }

        // below (unsigned)
        else if (expr instanceof Carry) {
            cmp = Expr.LT;
            op = expr.operands[0];
        }

        // above (unsigned)
        else if ((expr instanceof Expr.BoolNot) &&
            (expr.operands[0] instanceof Carry)) {
                cmp = Expr.GT;
                op = expr.operands[0];
        }

        return op ? new cmp(op.clone(['idx', 'def']), new Expr.Val(0, op.size)) : op;
    };

    return {
        Flag    : Flag,
        FlagOp  : FlagOp,
        cmp_from_flags : cmp_from_flags,

        Carry    : Carry,
        Parity   : Parity,
        Adjust   : Adjust,
        Zero     : Zero,
        Sign     : Sign,
        Overflow : Overflow
    };
})();