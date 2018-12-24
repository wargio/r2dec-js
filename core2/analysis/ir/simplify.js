/* 
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

module.exports = (function() {
    const Expr = require('core2/analysis/ir/expressions');

    var _constant_folding = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // TODO: what happens when either one of them is a Long object?
            if ((lhand instanceof Expr.Val) && (rhand instanceof Expr.Val)) {
                var op = {
                    'Add': function(a, b) { return a + b; },
                    'Sub': function(a, b) { return a - b; },
                    'Mul': function(a, b) { return a * b; },
                    'Div': function(a, b) { return a / b; },
                    'Mod': function(a, b) { return a % b; },
                    'And': function(a, b) { return a & b; },
                    'Or' : function(a, b) { return a | b; },
                    'Xor': function(a, b) { return a ^ b; }
                }[expr.constructor.name];

                return new Expr.Val(op(lhand, rhand), lhand.size);
            }
        }

        return null;
    };

    var _correct_arith = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // x + 0
            // x - 0
            if ((expr instanceof Expr.Add) || (expr instanceof Expr.Sub)) {
                const ZERO = new Expr.Val(0, lhand.size);

                if (rhand.equals(ZERO)) {
                    return lhand;
                }
            }

            // x * 1
            // x / 1
            else if ((expr instanceof Expr.Mul) || (expr instanceof Expr.Div)) {
                const ONE = new Expr.Val(1, lhand.size);

                if (rhand.equals(ONE)) {
                    return lhand;
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
                    return new Expr.BoolOr(new Expr.BoolNot(inner_lhand), new Expr.BoolNot(inner_rhand));
                } else if (op instanceof Expr.BoolOr) {
                    return new Expr.BoolAnd(new Expr.BoolNot(inner_lhand), new Expr.BoolNot(inner_rhand));
                } else if (op instanceof Expr.EQ) {
                    return new Expr.NEQ(inner_lhand, inner_rhand);
                } else if (op instanceof Expr.NEQ) {
                    return new Expr.EQ(inner_lhand, inner_rhand);
                } else if (op instanceof Expr.GT) {
                    return new Expr.LTE(inner_lhand, inner_rhand);
                } else if (op instanceof Expr.GTE) {
                    return new Expr.LT(inner_lhand, inner_rhand);
                } else if (op instanceof Expr.LT) {
                    return new Expr.GTE(inner_lhand, inner_rhand);
                } else if (op instanceof Expr.LTE) {
                    return new Expr.GT(inner_lhand, inner_rhand);
                }

                // !(x + y)
                // !(x - y)
                else if (op instanceof Expr.Add) {
                    return new Expr.EQ(inner_lhand, new Expr.Neg(inner_rhand));
                } else if (op instanceof Expr.Sub) {
                    return new Expr.EQ(inner_lhand, inner_rhand);
                }
            }

            else if (op instanceof Expr.UExpr) {
                var inner_op = op.operands[0]; 

                // !(!x)
                if (op instanceof Expr.BoolNot) {
                    return inner_op;
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
                return (e instanceof Expr.Val) && (e.value < 0);
            };

            // x + -y
            if ((expr instanceof Expr.Add) && isNegativeValue(expr.operands[1])) {
                rhand.value = Math.abs(rhand.value);

                return new Expr.Sub(lhand, rhand);
            }

            // x - -y
            else if ((expr instanceof Expr.Sub) && isNegativeValue(expr.operands[1])) {
                rhand.value = Math.abs(rhand.value);

                return new Expr.Add(lhand, rhand);
            }
        }

        return null;
    };

    var _correct_ref = function(expr) {
        if (expr instanceof Expr.UExpr) {
            var op = expr.operands[0];

            // &*x
            if ((expr instanceof Expr.AddrOf) && (op instanceof Expr.Deref)) {
                return op.operands[0];
            }

            // *&x
            else if ((expr instanceof Expr.Deref) && (op instanceof Expr.AddrOf)) {
                return op.operands[0];
            }
        }

        return null;
    };

    var _correct_bitwise = function(expr) {
        if (expr instanceof Expr.BExpr) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            const ZERO = new Expr.Val(0, lhand.size);

            // x ^ 0
            // x ^ x
            if (expr instanceof Expr.Xor) {
                if (rhand.equals(ZERO)) {
                    return lhand;
                }

                if (rhand.equals(lhand)) {
                    return ZERO;
                }
            }

            // x | 0
            // x | x
            else if (expr instanceof Expr.Or) {
                if (rhand.equals(ZERO) || rhand.equals(lhand)) {
                    return lhand;
                }
            }

            // x & 0
            // x & x
            else if (expr instanceof Expr.And) {
                if (rhand.equals(ZERO) || rhand.equals(lhand)) {
                    return rhand;
                }
            }

            // ((x >> c) << c) yields (x & ~((1 << c) - 1))
            else if (expr instanceof Expr.Shl) {
                if ((lhand instanceof Expr.Shr) && (rhand instanceof Expr.Val)) {
                    var inner_lhand = lhand.operands[0];
                    var inner_rhand = lhand.operands[1];
        
                    if (inner_rhand instanceof Expr.Val && inner_rhand.equals(rhand)) {
                        var mask = new Expr.Val(~((1 << rhand.value) - 1), rhand.size);

                        return new Expr.And(inner_lhand, mask);
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
                            return new Expr.EQ(x, new Expr.Val(c2.value - c1.value));
                        }

                        // ((x - c1) == c2) yields (x == c3) where c3 = c2 + c1
                        if (lhand instanceof Expr.Sub) {
                            return new Expr.EQ(x, new Expr.Val(c2.value + c1.value));
                        }
                    }
                }

                if (rhand.equals(new Expr.Val(0, rhand.size))) {

                    // ((x - y) == 0) yields (x == y)
                    if (lhand instanceof Expr.Sub) {
                        return new Expr.EQ(x, y);
                    } else if (lhand instanceof Expr.Add) {
                        return new Expr.EQ(x, new Expr.Neg(y));
                    }
                }
            }
        }

        return null;
    };

    // TODO: 'or' conditions and 'eq', 'ne' comparisons are commotative
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
                        return new Expr.GE(x0, y0);
                    }

                    // ((x < y) || (x == y)) yields (x <= y)
                    if ((lhand instanceof Expr.LT) && (rhand instanceof Expr.EQ)) {
                        return new Expr.LE(x0, y0);
                    }

                    // ((x < y) || (x > y))  yields (x != y)
                    if ((lhand instanceof Expr.LT) && (rhand instanceof Expr.GT)) {
                        return new Expr.NE(x0, y0);
                    }
                }
            }
        }

        return null;
    };

    // --------------------

    var _rules = [
        _correct_arith,
        _correct_sign,
        _correct_ref,
        _correct_bitwise,
        _equality,
        _negate,
        _converged_cond,
        _constant_folding
    ];

    return {
        // [!] note that simplifications are done in-place
        run: function(stmt) {
            var modified;

            do {
                modified = false;

                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands().forEach(function(op) {
                        _rules.forEach(function(rule) {
                            var alt = rule(op);

                            if (alt) {
                                op.replace(alt);

                                modified = true;
                            }
                        });
                    });
                });
            } while (modified);
        }
    };
})();