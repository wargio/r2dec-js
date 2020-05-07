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

(function() {
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
                        // console.log('propagating:', def.toString(), '->', expr.toString(), 'in', use.parent.toString());

                        use.replace(expr);
                        Simplify.reduce_stmt(expr.parent_stmt());

                        propagated++;
                    } else {
                        skipped++;
                    }
                }

                // no uses left after propagation; mark as safe for pruning
                if (def.uses.length === 0) {
                    def.prune = true;
                }
            }
        }

        return propagated > 0;
    };

    // --------------------------------------------------

    var __is_deref = function(o) {
        return (o instanceof Expr.Deref);
    };

    var __is_fcall = function(o) {
        return (o instanceof Expr.Call);
    };

    /**
     * Predicate to test whether an expression encloses a memory access for
     * either read or write
     * 
     * @param {Expr} expr Exression to test
     * @returns {boolean} Whether `expr` encloses or is a memory dereference
     */
    var __has_enclosed_deref = function(expr) {
        return expr.iter_operands().some(__is_deref);
    };

    /**
     * Predicate to test whether an expression encloses a call to a function
     * 
     * @param {Expr} expr Exression to test
     * @returns {boolean} Whether `expr` encloses or is a function call
     */
    var __has_enclosed_fcall = function(expr) {
        return expr.iter_operands().some(__is_fcall);
    };

    // const expressions do not dereference memory neither call non-const functions.
    // we do not inspect called functions to infere whether they are const functions,
    // so all fcalls are treated as a non-const behvaior
    var __non_const = function(expr) {
        return expr.iter_operands().some(function(o) {
            return __is_fcall(o) || __is_deref(o);
        });
    };

    // pure expressions have slightly relaxed requirements comparing to const. pure
    // expressions may dereference memory only for reading, but not writing
    var __impure = function(expr) {
        return expr.iter_operands().some(function(o) {
            return __is_fcall(o) || (o.is_def && __is_deref(o));
        });
    };

    var _select_safe_defs = function(def, val, conf) {
        var def_pstmt = def.parent_stmt();
        var statements = def_pstmt.parent.statements;

        // make sure a def is being used on the same container it was defined.
        // phi users typically appear on the def's block dom-front, so there is no need to be bothered
        var __on_same_container = function(use) {
            var use_pstmt = use.parent_stmt();

            return (use_pstmt.parent === def_pstmt.parent) || (use.parent instanceof Expr.Phi);
        };

        // a statement will be considered interfering if it appears on the cfg path between def
        // and a specific use of def, and has some effect (i.e. picked up by the selector function).
        //
        // this method simplifies the interference check by requiring use and def to be on the same
        // container, which implies that def precedes use. although this requirement prevents some
        // propagations from being made, it is, well, simpler
        var __has_interfering_expr = function(use, selector) {
            var use_pstmt = use.parent_stmt();
            var d_idx = statements.indexOf(def_pstmt);
            var u_idx = statements.indexOf(use_pstmt);
            var interfering = false;
    
            for (var i = (d_idx + 1); (i < u_idx) && !interfering; i++) {
                interfering = statements[i].expressions.some(selector);
            }

            return interfering;
        };

        // do not propagate if uninit or assigned a phi expression
        if ((def.idx !== 0) && !(val instanceof Expr.Phi)) {

            // make sure all uses are on the same container as definition.
            // although this restriction reduces the number of potential propagations, it lets us check for
            // interference much more easily, as users on the same block are guaranteed to post-dominate the
            // definition they use and all we need is to check the statements between def and use.
            if (def.uses.every(__on_same_container) || (val instanceof Expr.Literal)) {

                // calling a function:
                // if the assigned value encloses a function call, propagate only if there is only one user
                // and there are no interfering statements in between that may have side effects
                //
                // TODO: not sure whether this is safe, since it doesn't take fcall out parameters into account
                if (__has_enclosed_fcall(val)) {
                    return (def.uses.length === 1) && !def.uses.some(function(u) {
                        return __has_interfering_expr(u, __non_const);
                    });
                }

                // writing to memory:
                // if the definition encloses a memory dereference, propagate only if there are no interfering
                // statamenets between def and all its users that may have side effects
                else if (__has_enclosed_deref(def)) {
                    return !def.uses.some(function(u) {
                        return __has_interfering_expr(u, __non_const);
                    });
                }

                // reading from memory:
                // if the assigned value encloses a memory dereference, propagate only if there are no interfering
                // statamenets between def and all its users that may have side effects
                else if (__has_enclosed_deref(val)) {
                    return !def.uses.some(function(u) {
                        return __has_interfering_expr(u, __impure);
                    });
                }

                // all users post-dominates def and there is no need to check for interference.
                // assigned value should be probably ok to propagate
                return true;
            }
        }

        return false;
    };

    var _get_safe_defs = function(use, val) {
        // do not propagate values where variable's address is taken: that would appear as taking
        // the address of a constant value, which makes no sense. very common in fcall out parameters
        // that are explicitly initialized to some constant (e.g. NULL)
        if ((val instanceof Expr.Val) && (use.parent instanceof Expr.AddrOf)) {
            return null;
        }

        // as a rule we do not propagate into phi expressions, but we may allow simple cases in which a
        // register replaces another (copy propagation)
        if ((use.parent instanceof Expr.Phi) && !((use instanceof Expr.Reg) && (val instanceof Expr.Reg))) {
            return null;
        }

        return val.clone(['idx', 'def']);
    };

    // var _select_def_regs = function(def, val, conf) {
    //     return (def.idx !== 0)
    //             && ((def instanceof Expr.Reg) && !(def instanceof Expr.Var))
    //             && ((val instanceof Expr.Reg) && !(val instanceof Expr.Var));
    // };
    //
    // var _get_def_regs = function(use, val) {
    //     return val.clone(['idx', 'def']);
    // };
    //
    // // propagate definitions that are set to constant values
    // var _select_constants = function(def, val, conf) {
    //     return (def.idx !== 0)
    //         && (!(def instanceof Expr.Deref) || (def.is_safe || conf.noalias))
    //         && !(def instanceof Expr.Var)
    //         && (val instanceof Expr.Literal);
    // };
    //
    // var _get_constants = function(use, val) {
    //     // do not propagate if user is:
    //     //  - a phi argument, to simplify transforming ssa back later on
    //     //  - an AddressOf operand, because taking address of a constant value makes no sense
    //     if ((use.parent instanceof Expr.Phi) || (use.parent instanceof Expr.AddrOf)) {
    //         return null;
    //     }
    //
    //     return val.clone(['idx', 'def']);
    // };
    //
    // var __is_ptr_calc = function(expr) {
    //     return (expr instanceof Expr.Add)
    //         || (expr instanceof Expr.Sub)
    //         || (expr instanceof Expr.And);
    // };
    //
    // var _select_dereferenced = function(def, val, conf) {
    //     return (def.idx !== 0)
    //         && (def instanceof Expr.Reg)
    //         && !(val instanceof Expr.Phi);
    // };
    //
    // var _get_dereferenced = function(use, val) {
    //     var p = use.parent;
    //
    //     while (__is_ptr_calc(p)) {
    //         p = p.parent;
    //     }
    //
    //     // TODO: do not propagate when (val instanceof Expr.Deref)
    //     return ((p instanceof Expr.Deref) && (p.is_def)) ? val.clone(['idx', 'def']) : null;
    // };

    // --------------------------------------------------

    // Propagator.propagate_def_regs       = new Propagator(_select_def_regs, _get_def_regs);
    // Propagator.propagate_constants      = new Propagator(_select_constants, _get_constants);
    // Propagator.propagate_dereferenced   = new Propagator(_select_dereferenced, _get_dereferenced);
    Propagator.propagate_safe_defs = new Propagator(_select_safe_defs, _get_safe_defs);

    return Propagator;
});