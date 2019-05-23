/* 
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
    const Long = require('libdec/long');
    const Expr = require('core2/analysis/ir/expressions');

    const wssa = ['idx', 'def'];

    var _ctx_fold_assoc = function(expr) {
        var assoc_ops = [
            Expr.Add,
            Expr.Mul,
            Expr.And,
            Expr.Or,
            Expr.Xor
        ];

        // handle an expression of the form: ((x op c1) op c0)
        // where op is an associative operation and c0, c1 are known values.

        // outter expression
        var oexpr = expr;
        var oexpr_op = oexpr.constructor;

        if (assoc_ops.indexOf(oexpr_op) !== (-1)) {
            // implied: (oexpr instanceof Expr.BExpr)
            var olhand = expr.operands[0];
            var orhand = expr.operands[1];

            // inner expression (left hand of the outter one)
            var iexpr = olhand;
            var iexpr_op = iexpr.constructor;

            if (assoc_ops.indexOf(iexpr_op) !== (-1)) {
                // implied: (iexpr instanceof Expr.BExpr)
                var ilhand = iexpr.operands[0];
                var irhand = iexpr.operands[1];

                // ((ilhand op irhand) op orhand) --> (ilhand op (irhand op orhand))
                if ((oexpr_op === iexpr_op) && (orhand instanceof Expr.Val) && (irhand instanceof Expr.Val)) {
                    var new_lhand = ilhand.clone(wssa);
                    var new_rhand = new iexpr_op(irhand, orhand);

                    return new oexpr_op(new_lhand, new_rhand);
                }
            }
        }

        return null;
    };

    var _ctx_fold_arith = function(expr) {
        var arith_ops = [
            Expr.Add,
            Expr.Sub
        ];

        // handle an expression of the form: ((x op1 c1) op0 c0)
        // where op1, op0 are arithmetic operations and c0, c1 are known values.

        // outter expression
        var oexpr = expr;
        var oexpr_op = oexpr.constructor;

        if (arith_ops.indexOf(oexpr_op) !== (-1)) {
            // implied: (oexpr instanceof Expr.BExpr)
            var olhand = expr.operands[0];
            var orhand = expr.operands[1];

            // inner expression (left hand of the outter one)
            var iexpr = olhand;
            var iexpr_op = iexpr.constructor;

            if (arith_ops.indexOf(iexpr_op) !== (-1)) {
                // implied: (iexpr instanceof Expr.BExpr)
                var ilhand = iexpr.operands[0];
                var irhand = iexpr.operands[1];

                // ((x iexpr_op a) oexpr_op b)
                if ((orhand instanceof Expr.Val) && (irhand instanceof Expr.Val)) {
                    var sign = (oexpr_op === iexpr_op ? Long.UONE : Long.NEG_ONE);

                    // ((x - a) - b) == (x - (a + b))
                    // ((x + a) + b) == (x + (a + b))
                    // ((x - a) + b) == (x + (-a + b))
                    // ((x + a) - b) == (x - (-a + b))

                    var new_lhand = ilhand.clone(wssa);
                    var new_rhand = new Expr.Val(irhand.value.mul(sign).add(orhand.value), irhand.size);

                    // (x oexpr_op (sign * a + b))
                    return new oexpr_op(new_lhand, new_rhand);
                }
            }
        }

        return null;
    };

    var _constant_folding = function(expr) {
        var operations = {
            'Add': Long.prototype.add,
            'Sub': Long.prototype.sub,
            'Mul': Long.prototype.mul,
            'Div': Long.prototype.div,
            'Mod': Long.prototype.mod,
            'And': Long.prototype.and,
            'Or' : Long.prototype.or,
            'Xor': Long.prototype.xor
        };

        if ((expr instanceof Expr.BExpr) && (expr.constructor.name in operations)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];
            var op = operations[expr.constructor.name];

            if ((lhand instanceof Expr.Val) && (rhand instanceof Expr.Val)) {
                return new Expr.Val(op.call(lhand.value, rhand.value), lhand.size);
            }
        }

        return null;
    };

    var _correct_arith = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if ((expr instanceof Expr.Add) || (expr instanceof Expr.Sub)) {
                const ZERO = new Expr.Val(Long.UZERO, rhand.size);

                // x + 0
                // x - 0
                if (rhand.equals(ZERO)) {
                    return lhand.clone(wssa);
                }
            }

            else if ((expr instanceof Expr.Mul) || (expr instanceof Expr.Div)) {
                const ONE = new Expr.Val(Long.UONE, rhand.size);

                // x * 1
                // x / 1
                if (rhand.equals(ONE)) {
                    return lhand.clone(wssa);
                }
            }
        }

        return null;
    };

    var _negate = function(expr) {
        if (expr instanceof Expr.BoolNot) {
            var op = expr.operands[0];

            if (op instanceof Expr.BExpr) {
                var inner_lhand = op.operands[0];
                var inner_rhand = op.operands[1];

                // deMorgan rules
                if (op instanceof Expr.BoolAnd) {
                    return new Expr.BoolOr(new Expr.BoolNot(inner_lhand.clone(wssa)), new Expr.BoolNot(inner_rhand.clone(wssa)));
                } else if (op instanceof Expr.BoolOr) {
                    return new Expr.BoolAnd(new Expr.BoolNot(inner_lhand.clone(wssa)), new Expr.BoolNot(inner_rhand.clone(wssa)));
                } else if (op instanceof Expr.EQ) {
                    return new Expr.NEQ(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.NEQ) {
                    return new Expr.EQ(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.GT) {
                    return new Expr.LTE(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.GTE) {
                    return new Expr.LT(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.LT) {
                    return new Expr.GTE(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.LTE) {
                    return new Expr.GT(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                }

                // !(x + y)
                // !(x - y)
                else if (op instanceof Expr.Add) {
                    return new Expr.EQ(inner_lhand.clone(wssa), new Expr.Neg(inner_rhand.clone(wssa)));
                } else if (op instanceof Expr.Sub) {
                    return new Expr.EQ(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                }
            }

            else if (op instanceof Expr.UExpr) {
                var inner_op = op.operands[0]; 

                // !(!x)
                if (op instanceof Expr.BoolNot) {
                    return inner_op.clone(wssa);
                }
            }
        }

        return null;
    };
    
    var _correct_sign = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            var isNegativeValue = function(e) {
                return (e instanceof Expr.Val) && (e.value.isNegative());
            };

            // x + -y
            if ((expr instanceof Expr.Add) && isNegativeValue(rhand)) {
                rhand.value = rhand.value.negate();

                return new Expr.Sub(lhand.clone(wssa), rhand.clone(wssa));
            }

            // x - -y
            else if ((expr instanceof Expr.Sub) && isNegativeValue(rhand)) {
                rhand.value = rhand.value.negate();

                return new Expr.Add(lhand.clone(wssa), rhand.clone(wssa));
            }
        }

        return null;
    };

    var _correct_ref = function(expr) {
        if (expr instanceof Expr.UExpr) {
            var op = expr.operands[0];

            // &*x
            if ((expr instanceof Expr.AddrOf) && (op instanceof Expr.Deref)) {
                return op.operands[0].clone(wssa);
            }

            // *&x
            else if ((expr instanceof Expr.Deref) && (op instanceof Expr.AddrOf)) {
                return op.operands[0].clone(wssa);
            }
        }

        return null;
    };

    var _correct_bitwise = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // create an FF's mask that matches lhand size
            const ffmask = Long.UONE.shl(lhand.size).sub(Long.UONE);

            const ZERO = new Expr.Val(Long.UZERO, lhand.size);
            const FF = new Expr.Val(ffmask, lhand.size);

            if (expr instanceof Expr.Xor) {
                // x ^ 0
                if (rhand.equals(ZERO)) {
                    return lhand.clone(wssa);
                }

                // x ^ x
                if (rhand.equals(lhand)) {
                    return ZERO;
                }

                // x ^ 0xff...
                if (rhand.equals(FF)) {
                    return new Expr.Not(lhand.clone(wssa));
                }
            }

            else if (expr instanceof Expr.Or) {
                // x | 0
                // x | x
                if (rhand.equals(ZERO) || rhand.equals(lhand)) {
                    return lhand.clone(wssa);
                }

                // x | 0xff...
                if (rhand.equals(FF)) {
                    return FF;
                }
            }

            else if (expr instanceof Expr.And) {
                // x & 0
                // x & x
                if (rhand.equals(ZERO) || rhand.equals(lhand)) {
                    return rhand.clone(wssa);
                }

                // x & 0xff...
                if (rhand.equals(FF)) {
                    return lhand.clone(wssa);
                }
            }

            // ((x >> c) << c) yields (x & ~((1 << c) - 1))
            else if (expr instanceof Expr.Shl) {
                if ((lhand instanceof Expr.Shr) && (rhand instanceof Expr.Val)) {
                    var inner_lhand = lhand.operands[0];
                    var inner_rhand = lhand.operands[1];

                    if (inner_rhand instanceof Expr.Val && inner_rhand.equals(rhand)) {
                        var mask = new Expr.Val(Long.UONE.shl(rhand.value).sub(Long.UONE).not(), rhand.size);

                        return new Expr.And(inner_lhand.clone(wssa), mask);
                    }
                }
            }
        }

        return null;
    };

    var _equality = function(expr) {
        if (expr instanceof Expr.EQ) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if (lhand instanceof Expr.BExpr) {
                var x = lhand.operands[0];
                var y = lhand.operands[1];

                if (y instanceof Expr.Val) {
                    var c1 = y;

                    if (rhand instanceof Expr.Val) {
                        var c2 = rhand;

                        // ((x + c1) == c2) yields (x == c3) where c3 = c2 - c1
                        if (lhand instanceof Expr.Add) {
                            return new Expr.EQ(x.clone(wssa), new Expr.Val(c2.value.sub(c1.value), c2.size));
                        }

                        // ((x - c1) == c2) yields (x == c3) where c3 = c2 + c1
                        if (lhand instanceof Expr.Sub) {
                            return new Expr.EQ(x.clone(wssa), new Expr.Val(c2.value.add(c1.value), c2.size));
                        }
                    }
                }

                if (rhand.equals(new Expr.Val(0, rhand.size))) {

                    // ((x - y) == 0) yields (x == y)
                    if (lhand instanceof Expr.Sub) {
                        return new Expr.EQ(x.clone(wssa), y.clone(wssa));
                    } else if (lhand instanceof Expr.Add) {
                        return new Expr.EQ(x.clone(wssa), new Expr.Neg(y.clone(wssa)));
                    }
                }
            }
        }

        return null;
    };

    // TODO: 'or' conditions and 'eq', 'ne' comparisons are commutative
    var _converged_cond = function(expr) {
        if (expr instanceof Expr.BoolOr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if ((lhand instanceof Expr.BExpr) && (rhand instanceof Expr.BExpr)) {
                // lhand inner operands
                var x0 = lhand.operands[0];
                var y0 = lhand.operands[1];

                // rhand inner operands
                var x1 = rhand.operands[0];
                var y1 = rhand.operands[1];

                if (x0.equals(x1) && y0.equals(y1)) {
                    // ((x > y) || (x == y)) yields (x >= y)
                    if ((lhand instanceof Expr.GT) && (rhand instanceof Expr.EQ)) {
                        return new Expr.GE(x0.clone(wssa), y0.clone(wssa));
                    }

                    // ((x < y) || (x == y)) yields (x <= y)
                    if ((lhand instanceof Expr.LT) && (rhand instanceof Expr.EQ)) {
                        return new Expr.LE(x0.clone(wssa), y0.clone(wssa));
                    }

                    // ((x < y) || (x > y))  yields (x != y)
                    if ((lhand instanceof Expr.LT) && (rhand instanceof Expr.GT)) {
                        return new Expr.NE(x0.clone(wssa), y0.clone(wssa));
                    }
                }
            }
        }

        return null;
    };

    // --------------------

    var rules = [
        _correct_arith,
        _correct_sign,
        _correct_ref,
        _correct_bitwise,
        _equality,
        _negate,
        _converged_cond,
        _constant_folding,
        _ctx_fold_assoc,
        _ctx_fold_arith
    ];

    // simplify an expression and break as soon as it is modified
    var _reduce_expr_once = function(expr) {
        var operands = expr.iter_operands(true);

        for (var o in operands) {
            o = operands[o];

            for (var r in rules) {
                r = rules[r];
                var alt = r(o);

                if (alt) {
                    o.replace(alt);

                    return alt;
                }
            }
        }

        return null;
    };

    // keep simplifying `expr` until it cannot be simplified any further
    var _reduce_expr = function(expr) {
        while (_reduce_expr_once(expr)) { /* empty */ }
    };

    // simplify a statement along with the expressions it contains
    var _reduce_stmt = function(stmt) {
        stmt.expressions.forEach(_reduce_expr);
    };

    // note: simplifications are done in-place
    return {
        reduce_expr: _reduce_expr,
        reduce_stmt: _reduce_stmt
    };
})();