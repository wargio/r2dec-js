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
    var Expr = require('core2/analysis/ir/expressions');

    var _correct_arith = function(expr) {
        if (expr instanceof Expr.Assign) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            var one = new Expr.Val(1, lhand.size);

            // x = x + 1
            if ((rhand instanceof Expr.Add) && (rhand.operands[0].equals(lhand)) && (rhand.operands[1].equals(one))) {
                return new Expr.Inc(lhand);
            }

            // x = x - 1
            if ((rhand instanceof Expr.Sub) && (rhand.operands[0].equals(lhand)) && (rhand.operands[1].equals(one))) {
                return new Expr.Dec(lhand);
            }
        }

        // x + 0
        // x - 0
        if ((expr instanceof Expr.Add) || (expr instanceof Expr.Sub)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if ((rhand instanceof Expr.Val) && rhand.value == 0) {
                return lhand;
            }
        }

        return null;
    };

    var _correct_sign = function(expr) {
        // x + -y
        if ((expr instanceof Expr.Add) && (expr.operands[1] instanceof Expr.Val) && (expr.operands[1].value < 0)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            rhand.value = Math.abs(rhand.value);

            return new Expr.Sub(lhand, rhand);
        }

        // x - -y
        if ((expr instanceof Expr.Sub) && (expr.operands[1] instanceof Expr.Val) && (expr.operands[1].value < 0)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            rhand.value = Math.abs(rhand.value);

            return new Expr.Add(lhand, rhand);
        }

        return null;
    };

    var _correct_ref = function(expr) {
        // &*x
        if ((expr instanceof Expr.AddrOf) && (expr.operands[0] instanceof Expr.Deref)) {
            return expr.operands[0].operands[0];
        }

        // *&x
        if ((expr instanceof Expr.Deref) && (expr.operands[0] instanceof Expr.AddrOf)) {
            return expr.operands[0].operands[0];
        }

        return null;
    };

    var _correct_bitwise = function(expr) {
        // x ^ 0
        // x ^ x
        if (expr instanceof Expr.Xor) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            var zero = new Expr.Val(0, lhand.size);
            
            if (rhand.equals(zero)) {
                return lhand;
            }

            if (rhand.equals(lhand)) {
                return zero;
            }
        }

        // x & 0
        // x & x
        if (expr instanceof Expr.And) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];
            
            var zero = new Expr.Val(0, lhand.size);

            if (rhand.equals(zero)) {
                return zero;
            }

            if (rhand.equals(lhand)) {
                return lhand;
            }
        }

        // ((x >> c) << c) yields (x & ~((1 << c) - 1))
        if (expr instanceof Expr.Shl) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if ((lhand instanceof Expr.Shr) && (rhand instanceof Expr.Val)) {
                var inner_lhand = lhand.operands[0];
                var inner_rhand = lhand.operands[1];
    
                if (inner_rhand instanceof Expr.Val && inner_rhand.equals(rhand)) {
                    var mask = new Expr.Val(~((1 << rhand.value) - 1), rhand.size);

                    return new Expr.And(inner_lhand, mask);
                }
            }
        }

        return null;
    };

    var _equality = function(expr) {
        if (expr instanceof Expr.EQ) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if (rhand instanceof Expr.Val) {
                // ((x + c1) == c2) yields (x == c3) where c3 = c2 - c1
                if ((lhand instanceof Expr.Add) && (lhand.operands[1] instanceof Expr.Val)) {
                    var new_lhand = lhand.operands[0];
                    var new_rhand = new Expr.Val(rhand.value - lhand.operands[1].value);

                    return new Expr.EQ(new_lhand, new_rhand);
                }

                // ((x - c1) == c2) yields (x == c3) where c3 = c2 + c1
                if ((lhand instanceof Expr.Sub) && (lhand.operands[1] instanceof Expr.Val)) {
                    var new_lhand = lhand.operands[0];
                    var new_rhand = new Expr.Val(rhand.value + lhand.operands[1].value);

                    return new Expr.EQ(new_lhand, new_rhand);
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

            // ((x > y) || (x == y)) yields (x >= y)
            if ((lhand instanceof Expr.GT) &&
                (rhand instanceof Expr.EQ) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
                    return new Expr.GE(lhand.operands[0], lhand.operands[1]);
            }

            // ((x < y) || (x == y)) yields (x <= y)
            if ((lhand instanceof Expr.LT) &&
                (rhand instanceof Expr.EQ) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
                    return new Expr.LE(lhand.operands[0], lhand.operands[1]);
            }

            // ((x < y) || (x > y))  yields (x != y)
            if ((lhand instanceof Expr.LT) &&
                (rhand instanceof Expr.GT) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
                    return new Expr.NE(lhand.operands[0], lhand.operands[1]);
            }
        }

        // (!(x > y))  yields (x <= y)
        // (!(x < y))  yields (x >= y)
        // (!(x == y)) yields (x != y)
        // (!(x != y)) yields (x == y)
        if (expr instanceof Expr.BoolNot) {
            /*
            var inv = {
                Expr.EQ : Expr.NE,
                Expr.NE : Expr.EQ,
                Expr.GT : Expr.LE,
                Expr.GE : Expr.LT,
                Expr.LT : Expr.GE,
                Expr.LE : Expr.GT
            };
            */

        }

        return null;
    };

    // --------------------

    // TODO: convert this to a Map, where prototypes are mapped to simplification routines
    var _rules = [
        _correct_arith,
        _correct_sign,
        _correct_ref,
        _correct_bitwise,
        _equality,
        _converged_cond
    ];

    return {
        // [!] note that simplifications are done in-place
        run: function(stmt) {
            var modified;

            do {
                modified = false;

                stmt.expressions.forEach(function(e) {
                    e.iter_operands().forEach(function(o) {
                        _rules.forEach(function(r) {
                            var new_expr = r(o);

                            if (new_expr) {
                                o.replace(new_expr);
                            }
                        });
                    });
                });
            } while (modified);
        }
    };
})();