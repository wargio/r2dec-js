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

    /**
     * @callback Selector
     * @param {Expr} def Defined expression instance
     * @param {Expr} val Expression assigned to definition
     * @param {*} conf Configuration object
     * @returns {boolean} Returns `true` if specified `def` and `val` are
     * OK to be selected for pruning
     */

    /**
     * Pruning pass base class.
     * @param {Selector} selector Function to determine which definitions should
     * be considered for pruning. May contain side-effects.
     */
    function Pruner(selector) {
        this.selector = selector;
    }

    Pruner.prototype.run = function(context, config) {
        var pruned = [];

        for (var d in context.defs) {
            var p = context.defs[d].parent; // parent assignment
            var def = p.operands[0];        // defined variable
            var val = p.operands[1];        // assigned expression

            if (this.selector(def, val, config)) {
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
    var _select_dead_regs = function(def, val, conf) {
        // note: function calls cannot be eliminated as they may have side effects
        return (def.uses.length === 0)
            && (def instanceof Expr.Reg)    // eliminate dead reg definitions
        //  && !(def instanceof Expr.Var)   // exclude variables tagged by user
            && !(val instanceof Expr.Call); // exclude dead fcalls results as fcalls may have side effects
    };

    // eliminate dead assignments to memory
    var _select_dead_derefs = function(def, val, conf) {
        // return `true` if `expr` is a user
        var _is_user = function(expr) {
            return (expr.def !== undefined) && (expr.def.uses.length > 0);
        };

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

    var _select_dead_results = function(def, val, conf) {
        if (def.uses.length === 0) {
            // function calls may have side effects and cannot be eliminated altogether.
            // instead, they are extracted from the assignment and kept as standalone exprs
            if ((def instanceof Expr.Reg) && (val instanceof Expr.Call)) {
                var p = def.parent;
                var stmt = p.parent;
                var fcall = val.pluck();

                stmt.push_expr_after(fcall, p);

                return true;
            }
        }

        return false;
    };

    // eliminate a variable that has only one use, which is a phi assignment to self
    // e.g. x₂ has only one use, and: x₂ = Φ(..., x₂, ...)
    var _select_def_single_phi = function(def, val, conf) {
        if (def.uses.length === 1) {
            var u = def.uses[0];

            // the only use is a phi arg, which assigned to self
            return (u.parent instanceof Expr.Phi) && (u.parent.equals(val));
        }

        return false;
    };

    // eliniminate a variable that has only one use, which is a phi that ends up assigned to self.
    // e.g. x₃ has only one use, which is a phi arg in a phi that is assigned to x₂:
    //
    //   x₂ = Φ(..., x₃, ...)
    //   ...
    //   x₃ = x₂
    var _select_def_single_phi_circ = function(def, val, conf) {
        if (def.uses.length === 1) {
            var u = def.uses[0];

            // the only use is a phi arg, which assigned to a circular def
            return (u.parent instanceof Expr.Phi) && (u.parent.parent.operands[0].equals(val));
        }
    };

    // --------------------------------------------------

    return {
        eliminate_dead_regs           : new Pruner(_select_dead_regs),
        eliminate_dead_derefs         : new Pruner(_select_dead_derefs),
        eliminate_dead_results        : new Pruner(_select_dead_results),
        eliminate_def_single_phi      : new Pruner(_select_def_single_phi),
        eliminate_def_single_phi_circ : new Pruner(_select_def_single_phi_circ)
    };
})();