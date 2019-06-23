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
    const Expr = require('core2/analysis/ir/expressions');
    const Simplify = require('core2/analysis/ir/simplify');

    // dead code elimination
    var eliminate_def_zero_uses = function(ctx) {
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                if (def.uses.length === 0) {
                    var p = def.parent;         // p is Expr.Assign
                    var lhand = p.operands[0];  // def
                    var rhand = p.operands[1];  // assigned expression

                    // function calls may have side effects, and cannot be eliminated altogether.
                    // instead, they are extracted from the assignment and kept as standalone
                    if (rhand instanceof Expr.Call) {
                        p.replace(rhand.pluck());

                        return true;
                    }

                    // phi assignments 
                    else if (rhand instanceof Expr.Phi) {
                        p.pluck(true);

                        return true;
                    }

                    // memory dereferences cannot be eliminated as they may have side effects
                    else if (!(lhand instanceof Expr.Deref) && !(rhand instanceof Expr.Deref)) {
                        p.pluck(true);

                        return true;
                    }
                }
            }

            return false;
        });
    };

    // eliminate a variable that has only one use, which is a phi assignment to self
    // e.g. x2 has only one use, and: x2 = Phi(..., x2, ...)
    var eliminate_def_single_phi = function(ctx) {
        return ctx.iterate(function(def) {
            if (def.uses.length === 1) {
                var p = def.parent;         // assignment expr
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                var u = def.uses[0];

                // the only use is as a phi arg, which assigned to self
                if ((u.parent instanceof Expr.Phi) && (u.parent.equals(rhand))) {
                    p.pluck(true);

                    return true;
                }
            }

            return false;
        });
    };

    // propagate definitions with only one use to their users
    var propagate_def_single_use = function(ctx) {
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                if (def.uses.length === 1) {
                    // TODO: add a configuration setting for "assume no aliasing"

                    // propagation of memory dereferences is very tricky, since we cannot
                    // identify pointer aliasing. in case of aliasing, the propgation will
                    // lead to an incorrect result
                    if (!(def instanceof Expr.Deref)) {
                        var p = def.parent;         // assignment expr
                        var lhand = p.operands[0];  // def
                        var rhand = p.operands[1];  // assigned expression

                        var u = def.uses[0];

                        // do not propagate if that single use is a phi arg
                        if (!(u.parent instanceof Expr.Phi)) {
                            var c = rhand.pluck();
                            
                            u.replace(c);
                            Simplify.reduce_stmt(c.parent_stmt());

                            p.pluck(true);

                            return true;
                        }
                    }
                }
            }

            return false;
        });
    };

    var propagate_constants = function(ctx) {
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // assignment expr
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                // propagate constsnats, but do not propagate constants assigned to memory derefs
                if ((!(lhand instanceof Expr.Deref)) && (rhand instanceof Expr.Val)) {
                    var phi_users = 0;

                    while (def.uses.length > phi_users) {
                        var u = def.uses[phi_users];

                        if (u.parent instanceof Expr.Phi) {
                            phi_users++;
                        } else {
                            var c = rhand.clone();

                            u.replace(c);
                            Simplify.reduce_stmt(c.parent_stmt());
                        }
                    }
    
                    if (def.uses.length === 0) {
                        p.pluck(true);
        
                        return true;
                    }
                }
            }

            return false;
        });
    };

    var optimizations = [
        eliminate_def_zero_uses,
        propagate_constants,
        propagate_def_single_use,
        eliminate_def_single_phi
    ];

    return {
        run: function(context) {
            // keep optimizing as long as modifications are made
            while (optimizations.some(function(opt) {
                return opt(context);
            })) { /* empty */ }
        }
    };
})();