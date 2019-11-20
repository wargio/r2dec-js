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

(function(){
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Simplify = require('js/libcore2/analysis/ir/simplify');

    /**
     * @callback Selector
     * @param {Expr} def Defined expression instance
     * @param {Expr} val Expression assigned to definition
     * @param {*} conf Configuration object
     * @returns {boolean} Returns `true` if specified `def` and `val` are
     * OK to be selected for propagation
     */

    /**
     * @callback Generator
     * @param {Expr} use Use expression instance
     * @param {Expr} val Expression assigned to definition
     * @returns {Expr} Returns an Expr to propagate onto (i.e. replace) `use`,
     * or `null` if the specified `use` should not be replaced
     */

    /**
     * Propagation pass base class.
     * @param {Selector} selector Function to determine which definitions should
     * @param {Generator} generator Function to generate propagated expressions
     * be considered for propagation
     */
    function Propagator(selector, generator) {
        this.selector = selector;
        this.get_propagated_expr = generator;
    }

    Propagator.prototype.run = function(context, config) {
        var propagated = 0;

        for (var d in context.defs) {
            var p = context.defs[d].parent; // parent assignment
            var def = p.operands[0];        // defined variable
            var val = p.operands[1];        // assigned expression

            if (this.selector(def, val, config)) {
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

                // no uses left after propagation; mark for pruning
                if (def.uses.length === 0) {
                    def.prune = true;
                }
            }
        }

        return propagated > 0;
    };

    // --------------------------------------------------

    // propagate definitions with only one use to their users
    var _select_def_single_use = function(def, val, conf) {
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
         // && (!(val instanceof Expr.Deref) || val.is_safe || conf.noalias)
            && !(val instanceof Expr.Phi)   // do not propagate phi expressions
            && !(val instanceof Expr.Val);  // do not propagate value literals, sicne they are handled separately
    };

    var _get_def_single_use = function(use, val) {
        // do not propagate into phi (i.e. use is a phi argument)
        return (use.parent instanceof Expr.Phi) ? null : val.clone(['idx', 'def']);
    };

    // TODO: stop propagation when encountering AddrOf, since we can't predict possible side effects

    // propagate definitions that are set to constant values
    var _select_constants = function(def, val, conf) {
        return (def.idx !== 0)
            && (!(def instanceof Expr.Deref) || (def.is_safe || conf.noalias))
            && !(def instanceof Expr.Var)
            && (val instanceof Expr.Literal);
    };

    var _get_constants = function(use, val) {
        // do not propagate if user is:
        //  - a phi argument, to simplify transforming ssa back later on
        //  - an addressOf operand, because taking address of a constant value makes no sense
        if ((use.parent instanceof Expr.Phi) || (use.parent instanceof Expr.AddrOf)) {
            return null;
        }

        return val.clone(['idx', 'def']);
    };

    var __is_ptr_calc = function(expr) {
        return (expr instanceof Expr.Add)
            || (expr instanceof Expr.Sub)
            || (expr instanceof Expr.And);
    };

    var _select_dereferenced = function(def, val, conf) {
        return (def.idx !== 0)
            && (def instanceof Expr.Reg)
            && !(val instanceof Expr.Phi);
    };

    var _get_dereferenced = function(use, val) {
        var p = use.parent;

        while (__is_ptr_calc(p)) {
            p = p.parent;
        }

        return ((p instanceof Expr.Deref) && (p.is_def)) ? val.clone(['idx', 'def']) : null;
    };

    // --------------------------------------------------

    return {
        propagate_def_single_use : new Propagator(_select_def_single_use, _get_def_single_use),
        propagate_constants      : new Propagator(_select_constants, _get_constants),
        propagate_dereferenced   : new Propagator(_select_dereferenced, _get_dereferenced)
    };
});