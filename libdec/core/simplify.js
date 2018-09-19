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
    var Expr = require('libdec/core/ir/expressions');

    var _correct_arith = function(expr) {
        if (expr instanceof Expr.assign) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            var one = new Expr.val(1, lhand.size);

            // x = x + 1
            if ((rhand instanceof Expr.add) && (rhand.operands[0].equals(lhand)) && (rhand.operands[1].equals(one))) {
                expr.replace(new Expr.inc(lhand));

                return true;
            }

            // x = x - 1
            if ((rhand instanceof Expr.sub) && (rhand.operands[0].equals(lhand)) && (rhand.operands[1].equals(one))) {
                expr.replace(new Expr.dec(lhand));

                return true;
            }
        }

        return false;
    };

    var _correct_sign = function(expr) {
        // x + -y
        if ((expr instanceof Expr.add) && (expr.operands[1] instanceof Expr.val) && (expr.operands[1].value < 0)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            rhand.value = Math.abs(rhand.value);

            expr.replace(new Expr.sub(lhand, rhand));

            return true;
        }

        // x - -y
        if ((expr instanceof Expr.sub) && (expr.operands[1] instanceof Expr.val) && (expr.operands[1].value < 0)) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            rhand.value = Math.abs(rhand.value);

            expr.replace(new Expr.add(lhand, rhand));

            return true;
        }

        return false;
    };

    var _correct_ref = function(expr) {
        // &*x
        if ((expr instanceof Expr.address_of) && (expr.operands[0] instanceof Expr.deref)) {
            expr.replace(expr.operands[0].operands[0]);

            return true;
        }

        // *&x
        if ((expr instanceof Expr.deref) && (expr.operands[0] instanceof Expr.address_of)) {
            expr.replace(expr.operands[0].operands[0]);

            return true;
        }

        return false;
    };

    var _correct_bitwise = function(expr) {
        // x ^ 0
        // x ^ x
        if (expr instanceof Expr.xor) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            var zero = new Expr.val(0, lhand.size);
            
            if (rhand.equals(zero)) {
                expr.replace(lhand);

                return true;
            } else if (lhand.equals(rhand)) {
                expr.replace(zero);

                return true;
            }
        }

        // x & 0
        // x & x
        if (expr instanceof Expr.and) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];
            
            var zero = new Expr.val(0, lhand.size);

            if (rhand.equals(zero)) {
                expr.replace(zero);

                return true;
            } else if (lhand.equals(rhand)) {
                expr.replace(lhand);

                return true;
            }
        }

        return false;
    };

    var _equality = function(expr) {
        if (expr instanceof Expr.cmp_eq) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            if (rhand instanceof Expr.val) {
                // ((x + c1) == c2) yields (x == c3) where c3 = c2 - c1
                if ((lhand instanceof Expr.add) && (lhand.operands[1] instanceof Expr.val)) {
                    var new_lhand = lhand.operands[0];
                    var new_rhand = new Expr.val(rhand.value - lhand.operands[1].value);

                    expr.replace(new Expr.cmp_eq(new_lhand, new_rhand));
                }

                // ((x - c1) == c2) yields (x == c3) where c3 = c2 + c1
                if ((lhand instanceof Expr.sub) && (lhand.operands[1] instanceof Expr.val)) {
                    var new_lhand = lhand.operands[0];
                    var new_rhand = new Expr.val(rhand.value + lhand.operands[1].value);

                    expr.replace(new Expr.cmp_eq(new_lhand, new_rhand));
                }
            }
        }
    };

    // TODO: 'or' conditions and 'eq', 'ne' comparisons are commotative
    var _converged_cond = function(expr) {
        if (expr instanceof Expr.bool_or) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // ((x > y) || (x == y)) yields (x >= y)
            if ((lhand instanceof Expr.cmp_gt) &&
                (rhand instanceof Expr.cmp_eq) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
               expr.replace(new Expr.cmp_ge(lhand.operands[0], lhand.operands[1]));

               return true;
            }

            // ((x < y) || (x == y)) yields (x <= y)
            if ((lhand instanceof Expr.cmp_lt) &&
                (rhand instanceof Expr.cmp_eq) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
               expr.replace(new Expr.cmp_le(lhand.operands[0], lhand.operands[1]));

               return true;
            }

            // ((x < y) || (x > y))  yields (x != y)
            if ((lhand instanceof Expr.cmp_lt) &&
                (rhand instanceof Expr.cmp_gt) &&
                (lhand.operands[0].equals(rhand.operands[0])) &&
                (lhand.operands[1].equals(rhand.operands[1]))) {
               expr.replace(new Expr.cmp_ne(lhand.operands[0], lhand.operands[1]));

               return true;
            }
        }

        // (!(x > y))  yields (x <= y)
        // (!(x < y))  yields (x >= y)
        // (!(x == y)) yields (x != y)
        // (!(x != y)) yields (x == y)
        if (expr instanceof Expr.bool_not) {
            /*
            var inv = {
                Expr.cmp_eq : Expr.cmp_ne,
                Expr.cmp_ne : Expr.cmp_eq,
                Expr.cmp_gt : Expr.cmp_le,
                Expr.cmp_ge : Expr.cmp_lt,
                Expr.cmp_lt : Expr.cmp_ge,
                Expr.cmp_le : Expr.cmp_gt
            };
            */

        }

        return false;
    };


    // --------------------

    var _filters = [
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
                    var operands = e.iter_operands();

                    operands.forEach(function(o) {
                        modified |= _filters.some(function(f) {
                            return f(o);
                        });
                    });
                });
            } while (modified);
        }
    };
})();