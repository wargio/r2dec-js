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

    function Pruner() {

    }

    /**
     * Predicate that determines whether the specified definition and its
     * assigned value should be selected for pruning.
     * @param {Reg|Deref|Var} def Definition expression
     * @param {Expr} val Assigned value
     * @param {*} conf Configuration parameters carried from r2 evars
     * @returns {boolean} `true` whether the specified definition should be
     * selected for pruning, `false` otherwise
     */
    Pruner.prototype.should_prune = function(def, val, conf) {
        // empty
    };

    Pruner.prototype.run = function(context, config) {
        var pruned = [];

        for (var d in context.defs) {
            var p = context.defs[d].parent; // parent assignment
            var def = p.operands[0];        // defined variable
            var val = p.operands[1];        // assigned expression

            if (this.should_prune(def, val, config)) {
                p.pluck(true);

                pruned.push(d);
            }
        }

        pruned.forEach(function(d) {
            delete context.defs[d];
        });

        return pruned.length > 0;
    };

    // --------------------------------------------------

    // eliminate dead assignments to registers
    var eliminate_dead_regs = function() {
        function _Pruner() {
            Pruner.call(this);
        }

        _Pruner.prototype = Object.create(Pruner.prototype);
        _Pruner.prototype.constructor = _Pruner;

        _Pruner.prototype.should_prune = function(def, val) {
            return (def.uses.length === 0)
                && (def instanceof Expr.Reg)    // eliminate dead reg definitions
            //  && !(def instanceof Expr.Var)   // exclude variables tagged by user
                && !(val instanceof Expr.Call); // exclude dead fcalls results as fcalls may have side effects
        };

        return new _Pruner();
    }();

    // eliminate dead assignments to memory
    var eliminate_dead_derefs = function() {
        function _Pruner() {
            Pruner.call(this);
        }

        _Pruner.prototype = Object.create(Pruner.prototype);
        _Pruner.prototype.constructor = _Pruner;

        // return `true` if `expr` is a user
        var _is_user = function(expr) {
            return (expr.def !== undefined) && (expr.def.uses.length > 0);
        };

        _Pruner.prototype.should_prune = function(def, val, conf) {
            if (def.uses.length === 0) {
                if ((def instanceof Expr.Deref) && ((val instanceof Expr.Phi) || conf.noalias || def.is_safe)) {
                    var memloc = def.operands[0];

                    // in case the dereferenced memory location is calculated based on a used variable,
                    // it is probably an aliased pointer. make sure this is not the case
                    return (!(memloc.iter_operands().some(_is_user)) || def.is_safe);
                }
            }

            return false;
        };

        return new _Pruner();
    }();

    var eliminate_dead_results = function() {
        function _Pruner() {
            Pruner.call(this);
        }

        _Pruner.prototype = Object.create(Pruner.prototype);
        _Pruner.prototype.constructor = _Pruner;

        _Pruner.prototype.should_prune = function(def, val) {
            if (def.uses.length === 0) {
                // function calls may have side effects and cannot be eliminated altogether.
                // instead, they are extracted from the assignment and kept as standalone exprs
                if ((def instanceof Expr.Reg) && (val instanceof Expr.Call)) {
                    var p = def.parent;
                    var stmt = p.parent;
                    var fcall = val.pluck();

                    // TODO: after propagating fcall to single rreg use, rreg is left with no users
                    // and then fcall get extracted here although it needs to be elinimated
                    stmt.push_expr_after(fcall, p);

                    return true;
                }
            }

            return false;
        };

        return new _Pruner();
    }();

    // eliminate a variable that has only one use, which is a phi assignment to self
    // e.g. x2 has only one use, and: x2 = Phi(..., x2, ...)
    var eliminate_def_single_phi = function() {
        function _Pruner() {
            Pruner.call(this);
        }

        _Pruner.prototype = Object.create(Pruner.prototype);
        _Pruner.prototype.constructor = _Pruner;

        _Pruner.prototype.should_prune = function(def, val) {
            if (def.uses.length === 1) {
                var u = def.uses[0];

                // the only use is a phi arg, which assigned to self
                return ((u.parent instanceof Expr.Phi) && (u.parent.equals(val)));
            }

            return false;
        };

        return new _Pruner();
    }();

    // --------------------------------------------------

    function Propagator() {
        // empty
    }

    /**
     * Predicate that determines whether the specified definition and its
     * assigned value should be selected for propagation.
     * @param {Reg|Deref|Var} def Definition expression
     * @param {Expr} val Assigned value
     * @param {*} conf Configuration parameters carried from r2 evars
     * @returns {boolean} `true` whether the specified definition should be
     * selected for propagation, `false` otherwise
     */
    Propagator.prototype.should_propagate = function(def, val, conf) {
        // empty
    };

    Propagator.prototype.get_propagated_expr = function(use, val) {
        // empty
    };

    Propagator.prototype.run = function(context, config) {
        var propagated = 0;

        for (var d in context.defs) {
            var p = context.defs[d].parent; // parent assignment
            var def = p.operands[0];        // defined variable
            var val = p.operands[1];        // assigned expression

            if (this.should_propagate(def, val, config)) {
                var skipped = 0;

                while (def.uses.length > skipped) {
                    var use = def.uses[skipped];
                    var expr = this.get_propagated_expr(use, val);

                    if (expr) {
                        use.replace(expr);
                        Simplify.reduce_stmt(expr.parent_stmt());

                        propagated++;
                    } else {
                        skipped++;
                    }
                }
            }
        }

        return propagated > 0;
    };

    // --------------------------------------------------

    var propagate_dereferenced = function() {
        function _Propagator() {
            Propagator.call(this);
        }

        _Propagator.prototype = Object.create(Propagator.prototype);
        _Propagator.prototype.constructor = _Propagator;

        var is_ptr_calc = function(expr) {
            return (expr instanceof Expr.Add)
                || (expr instanceof Expr.Sub)
                || (expr instanceof Expr.And);
        };

        _Propagator.prototype.should_propagate = function(def, val, conf) {
            return (def.idx !== 0) && (def instanceof Expr.Reg) && !(val instanceof Expr.Phi);
        };

        _Propagator.prototype.get_propagated_expr = function(use, val) {
            var p = use.parent;

            while (is_ptr_calc(p)) {
                p = p.parent;
            }

            return ((p instanceof Expr.Deref) && (p.is_def)) ? val.clone(['idx', 'def']) : null;
        };

        return new _Propagator();

    }();

    // propagate definitions with only one use to their users
    var propagate_def_single_use = function() {
        function _Propagator() {
            Propagator.call(this);
        }

        _Propagator.prototype = Object.create(Propagator.prototype);
        _Propagator.prototype.constructor = _Propagator;

        _Propagator.prototype.should_propagate = function(def, val, conf) {
            // propagation of memory dereferences may yield nicer results, but
            // will lead to incorrect results in case of pointer aliasing.
            //
            // since identifying pointer aliasing is impossible without emulating
            // the code, the decompiler stays at the safe side. the user may decide
            // to override this by setting 'opt.noalias' to true.
            //
            // nevertheless, some memory dereferences may be marked as safe for propagation;
            // for example, x86 stack locations
            return (def.idx !== 0)
                && (def.uses.length === 1)
                && (!(def instanceof Expr.Deref) || def.is_safe || conf.noalias)
                && !(val instanceof Expr.Phi)   // do not propagate phi expressions
                && !(val instanceof Expr.Val);  // do not propagate value literals, sicne they are handled separately
        };

        _Propagator.prototype.get_propagated_expr = function(use, val) {
            // do not propagate into phi (i.e. use is a phi argument)
            // use 'pluck' to prevent fcall duplications when their assigned reg remains with no uses after
            // this propagation. this is ok since we know there is only one use
            return (use.parent instanceof Expr.Phi) ? null : val.pluck();
        };

        return new _Propagator();
    }();

    // TODO: stop propagation when encountering AddrOf, since we can't predict possible side effects
    var propagate_constants = function() {
        function _Propagator() {
            Propagator.call(this);
        }

        _Propagator.prototype = Object.create(Propagator.prototype);
        _Propagator.prototype.constructor = _Propagator;

        _Propagator.prototype.should_propagate = function(def, val, conf) {
            return (def.idx !== 0)
                && ((val instanceof Expr.Val) /*|| (val instanceof Expr.AddrOf)*/)
                && (((def instanceof Expr.Reg) && !(def instanceof Expr.Var))
                    || ((def instanceof Expr.Deref) && (def.is_safe || conf.noalias)));
        };

        _Propagator.prototype.get_propagated_expr = function(use, val) {
            // do not propagate if user is:
            //  - a phi argument, to simplify transforming ssa back later on
            //  - an addressOf operand, because taking address of a constant value makes no sense
            if ((use.parent instanceof Expr.Phi) || (use.parent instanceof Expr.AddrOf)) {
                return null;
            }

            return val.clone(/*['idx', 'def']*/);
        };

        return new _Propagator();
    }();

    // --------------------------------------------------

    var _optimize = function(optlist, context, config) {
        config = config || {};

        // keep optimizing as long as modifications are made
        while (optlist.some(function(opt) {
            return opt.run(context, config);
        })) { /* empty */ }
    };

    var propagations = [
        propagate_constants,
        propagate_dereferenced
        // propagate_def_single_use,
    ];

    var all = [
        eliminate_dead_regs,
        eliminate_dead_derefs,
        eliminate_dead_results,
        propagate_def_single_use,
        propagate_constants,
        eliminate_def_single_phi
    ];

    return {
        // run them all
        run: function(context, config) {
            _optimize(all, context, config);
        },

        // run only propagations subset
        propagate: function(context, config) {
            _optimize(propagations, context, config);
        }
    };
})();