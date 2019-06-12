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

    /**
     * Checks whether an expression is an instance of a comparison expression
     * @param {Expr.Expr} expr An expression instance to check
     * @returns `true` if `expr` is an instance of a comparison expression; `false` otherwise
     * @private
     */
    var __is_compare_expr = function(expr) {
        const equalities = [
            Expr.EQ.prototype.constructor.name,
            Expr.NE.prototype.constructor.name,
            Expr.LT.prototype.constructor.name,
            Expr.LE.prototype.constructor.name,
            Expr.GT.prototype.constructor.name,
            Expr.GE.prototype.constructor.name,
        ];

        return expr && (equalities.indexOf(expr.constructor.name) !== (-1));
    };

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
                    return new Expr.NE(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.NE) {
                    return new Expr.EQ(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.GT) {
                    return new Expr.LE(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.GT) {
                    return new Expr.LT(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.LT) {
                    return new Expr.GE(inner_lhand.clone(wssa), inner_rhand.clone(wssa));
                } else if (op instanceof Expr.LT) {
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
                // 0 ^ x
                if (lhand.equals(ZERO)) {
                    return rhand.clone(wssa);
                }

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
                // 0 | x
                if (lhand.equals(ZERO)) {
                    return rhand.clone(wssa);
                }

                // x | 0
                if (rhand.equals(ZERO)) {
                    return lhand.clone(wssa);
                }

                // x | x
                if (rhand.equals(lhand)) {
                    return lhand.clone(wssa);
                }

                // x | 0xff...
                if (rhand.equals(FF)) {
                    return FF;
                }
            }

            else if (expr instanceof Expr.And) {
                // 0 & x
                if (lhand.equals(ZERO)) {
                    return ZERO;
                }

                // x & 0
                if (rhand.equals(ZERO)) {
                    return ZERO;
                }

                // x & x
                if (rhand.equals(lhand)) {
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
        // the following comments demonstrate equality as '==', but this
        // simplification is not limited to that only. rather it applies to 
        // all kind of comparisons.

        if (__is_compare_expr(expr)) {
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
                            return new expr.constructor(x.clone(wssa), new Expr.Val(c2.value.sub(c1.value), c2.size));
                        }

                        // ((x - c1) == c2) yields (x == c3) where c3 = c2 + c1
                        else if (lhand instanceof Expr.Sub) {
                            return new expr.constructor(x.clone(wssa), new Expr.Val(c2.value.add(c1.value), c2.size));
                        }
                    }
                }

                if (rhand.equals(new Expr.Val(0, rhand.size))) {

                    // ((x - y) == 0) yields (x == y)
                    if (lhand instanceof Expr.Sub) {
                        return new expr.constructor(x.clone(wssa), y.clone(wssa));
                    }

                    // ((x + y) == 0) yields (x == -y)
                    else if (lhand instanceof Expr.Add) {
                        return new expr.constructor(x.clone(wssa), new Expr.Neg(y.clone(wssa)));
                    }
                }
            }
        }

        return null;
    };

    var _converged_cond = function(expr) {
        var inner_or = function(lhand, rhand) {
            if (__is_compare_expr(lhand) && __is_compare_expr(rhand)) {
                // lhand inner operands
                var x0 = lhand.operands[0];
                var y0 = lhand.operands[1];

                // rhand inner operands
                var x1 = rhand.operands[0];
                var y1 = rhand.operands[1];

                // TODO: 'eq', 'ne' comparisons are commutative
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

            return null;
        };

        var inner_and = function(lhand, rhand) {
            if (__is_compare_expr(lhand) && __is_compare_expr(rhand)) {
                // lhand inner operands
                var x0 = lhand.operands[0];
                var y0 = lhand.operands[1];

                // rhand inner operands
                var x1 = rhand.operands[0];
                var y1 = rhand.operands[1];

                // TODO: 'eq', 'ne' comparisons are commutative

                // (x CMP0 y) && (x CMP1 y)
                if (x0.equals(x1) && y0.equals(y1)) {
                    if (lhand instanceof Expr.NE) {
                        // ((x != y) && (x >= y)) yields (x > y)
                        if (rhand instanceof Expr.GE) {
                            return new Expr.GT(x0.clone(wssa), y0.clone(wssa));
                        }

                        // ((x != y) && (x <= y)) yields (x < y)
                        else if (rhand instanceof Expr.LE) {
                            return new Expr.LT(x0.clone(wssa), y0.clone(wssa));
                        }
                    }

                    else if (lhand instanceof Expr.EQ) {
                        // ((x == y) && (x >= y)) yields (x == y)
                        if (rhand instanceof Expr.GE) {
                            return lhand.clone(wssa);
                        }

                        // ((x == y) && (x <= y)) yields (x == y)
                        else if (rhand instanceof Expr.LE) {
                            return lhand.clone(wssa);
                        }
                    }

                    // ((x <= y) && (x >= y))  yields (x == y)
                    else if ((lhand instanceof Expr.LE) && (rhand instanceof Expr.GE)) {
                        return new Expr.EQ(x0.clone(wssa), y0.clone(wssa));
                    }
                }
            }

            return null;
        };

        if (expr instanceof Expr.BoolOr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // Boolean OR is a commutative operation; try both original and swapped positions
            return inner_or(lhand, rhand) || inner_or(rhand, lhand);
        }

        // (rflags != 0 && rflags >= 0)
        if (expr instanceof Expr.BoolAnd) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // Boolean AND is a commutative operation; try both original and swapped positions
            return inner_and(lhand, rhand) || inner_and(rhand, lhand);
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
                var alt = rules[r](o);

                if (alt) {
                    o.replace(alt);

                    return o === expr ? null : alt;
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