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
    const Flags = require('core2/frontend/arch/x86/flags');
    const Overlaps = require('core2/frontend/arch/x86/overlaps');
    const CallConv = require('core2/frontend/arch/x86/cconv');

    const Expr = require('core2/analysis/ir/expressions');
    const Stmt = require('core2/analysis/ir/statements');
    const Simplify = require('core2/analysis/ir/simplify');

    // TODO: this file looks terrible; refactor this sh*t

    var resolve_pic = function(cntr, arch) {
        const pcreg = arch.PC_REG;
        var subst = [];

        cntr.statements.forEach(function(s, i, stmts) {
            s.expressions.forEach(function(e) {
                e.iter_operands().forEach(function(o) {
                    if (o.equals(pcreg)) {
                        // TODO: rip value is taken at the end of instruction boundary.
                        // the easy way to calculate that is to take the next statement's
                        // address; however this hack doesn't work 100% of the times.
                        // need to find a better solution for that; perhaps: aoj @ `s+1`
                        subst.push([o, stmts[i + 1].address]);
                    }
                });
            });
        });
    
        subst.forEach(function(pair) {
            var op = pair[0];
            var addr_next = pair[1];
    
            op.replace(new Expr.Val(addr_next, pcreg.size));
        });
    };

    var assign_fcall_args = function(func, ctx, arch) {
        var cconv = new CallConv(arch);

        func.basic_blocks.forEach(function(block) {
            block.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {

                    // normally a function call would be assigned to a result register, but not
                    // necessarilly (e.g. as in a return statement). in order to cover both cases
                    // we peel off the assignment
                    if (expr instanceof Expr.Assign) {
                        expr = expr.operands[1];
                    }

                    if (expr instanceof Expr.Call) {
                        var fcall = expr;
                        var callee = fcall.operator;

                        // most probably an imported function
                        if (callee instanceof Expr.Deref) {
                            callee = callee.operands[0];
                        }

                        // process only direct calls with known destinations; we cannot get calling convention
                        // info for indirect targets
                        if (callee instanceof Expr.Val) {
                            var ccname = Global.r2cmd('afc', '@', callee.value.toString());

                            if (!cconv.has(ccname)) {
                                throw new Error('unsupported calling convention');
                            }

                            // live ranges should be refreshed as args are added to fcalls (i.e. defs are killed)
                            // TODO: this is quite time consuming; and makes a good candidate for optimization
                            var live_ranges = ctx.get_live_ranges(block, true);

                            cconv.get(ccname).get_args_expr(fcall, live_ranges).forEach(function(arg) {
                                fcall.push_operand(arg);
                            });
                        }
                    }
                });
            });
        });
    };

    var gen_overlaps = function(func, ovlgen) {
        func.basic_blocks.forEach(function(bb) {
            var container = bb.container;
            var statements = container.statements;
            var expanded = [];

            while (statements.length > 0) {
                var stmt = statements.shift();
                expanded.push(stmt);

                stmt.expressions.forEach(function(expr) {
                    if (expr instanceof Expr.Assign) {
                        var lhand = expr.operands[0];

                        if (lhand instanceof Expr.Reg) {
                            // generate overlapping assignments and wrap them indevidually
                            // in a statement of their own
                            var generated = ovlgen.generate(lhand).map(function(g) {
                                return Stmt.make_statement(stmt.address, g);
                            });

                            expanded = expanded.concat(generated);
                        }
                    }
                });
            }

            // the container is empty at this point; re-add all statements, but this time
            // along with the generated overlaps
            expanded.forEach(container.push_stmt, container);
        });
    };

    var insert_arguments = function(func, ctx, arch) {
        var size = arch.bits;

        var _make_arg_var = function(a) {
            var arg = new Expr.Arg(a.name, size);
            var ref;

            if (typeof(a.ref) === 'object') {
                var base = new Expr.Reg(a.ref.base, size);
                var disp = new Expr.Val(a.ref.offset, size);

                base.idx = arch.FRAME_REG.equals_no_idx(base) ? 1: 0;

                ref = new Expr.Add(base, disp);
                arg = new Expr.AddrOf(arg);
            } else {
                ref = new Expr.Reg(a.ref, size);

                ref.idx = 0;
            }

            var assignment = new Expr.Assign(ref, arg);
            Simplify.reduce_expr(ref);

            return assignment;
        };

        var vars = [];

        func.vars.forEach(function(v) {
            var assignment = _make_arg_var(v);

            // console.log('var:', assignment);
            vars.push(assignment);
        });

        func.args.forEach(function(a) {
            var assignment = _make_arg_var(a);

            // console.log('arg:', assignment);
            vars.push(assignment);
        });

        var propagate = [];

        func.basic_blocks.forEach(function(bb) {
            bb.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        for (var i = 0; i < vars.length; i++) {
                            var vloc = vars[i].operands[0];

                            if (vloc.equals(op)) {
                                var vname = vars[i].operands[1];

                                // we cannot replace operands while iterating; that would invalidate
                                // the iterator. save pairs of [original, replacement] for later processing
                                propagate.push([op, vname.clone()]);
                                break;
                            }
                        }
                    });
                });
            });
        });

        var _enclosing_def = function(expr) {
            var def = null;

            while (expr && !def) {
                if (expr.is_def) {
                    def = expr;
                }

                expr = expr.parent;
            }

            return def;
        };

        var _is_phi_assignment = function(expr) {
            return (expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Phi);
        };

        var phis = [];

        propagate.forEach(function(pair) {
            var expr = pair[0];
            var replacement = pair[1];

            // here existing expressions are being replaced with newly created arg objects.
            // those arg objects have no ssa data and would be tagged by ssa later on in a
            // dedicated ssa sweep. that ssa sweep will create additional phi expressions,
            // if needed.
            //
            // to prevent the upcmoing ssa sweep from messing up, we need to make sure:
            //  - a replaced definition is removed from defs list
            //  - a replaced definition which is assigned a phi expression is removed

            var def = _enclosing_def(expr);

            if (def) {
                var passign = def.parent;

                if (_is_phi_assignment(passign)) {
                    // phi assignments cannot be removed on the spot: there may be additional
                    // propagations into this expression, so removing it would end up in a
                    // dangling expression. we will just remove them all afterwards

                    phis.push(passign);
                }

                delete ctx.defs[def];
            }

            // notes:
            //  - replacing expr may invalidate its reference
            //  - simplifying replacement may invalidate its reference

            expr.replace(replacement);
            Simplify.reduce_expr(replacement.parent);
        });

        phis.forEach(function(phi_assign) {
            phi_assign.pluck(true);
        });
    };

    // TODO: extract simplify_flags and move it to a post-controlflow simplifying loop
    var transform_flags = function(func) {

        var reduce_expr = function(expr) {
            var operands = expr.iter_operands(true);

            for (var o in operands) {
                o = operands[o];

                var alt = Flags.cmp_from_flags(o);

                if (alt) {
                    o.replace(alt);

                    return o === expr ? undefined : alt;
                }
            }

            return null;
        };

        func.basic_blocks.forEach(function(block) {
            block.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    while (reduce_expr(expr)) {
                        Simplify.reduce_expr(expr);
                    }
                });
            });
        });
    };

    var transform_tailcalls = function(func) {
        func.exit_blocks.forEach(function(block) {
            var terminator = block.container.terminator();

            // a goto terminator in an exit block means this is a tail call
            if (terminator instanceof Stmt.Goto) {
                var dest = terminator.dest;

                // direct jump
                if (dest instanceof Expr.Val) {
                    var fcall = new Expr.Call(dest.clone(), []);
                    var ret = new Stmt.Return(terminator.address, fcall);

                    // replace 'goto dest' with 'return dest()'
                    terminator.replace(ret);
                }

                // indirect jump
                // else if (dest instanceof Expr.Reg) {
                //     // TODO: to be implemented
                // }
            }
        });
    };

    // note: this has to take place before propagating sp0
    var cleanup_fcall_args = function(ctx, arch) {
        var is_stack_loc = function(expr) {
            return (expr instanceof Expr.Deref) && arch.is_stack_var(expr.operands[0]);
        };

        // remove all function call arguments that refer to a dead stack location. in other
        // words: iterate through all definitions and if it is an uninitialized stack location,
        // remove all its function call arguments users
        return ctx.iterate(function(def) {
            if ((def.idx === 0) && is_stack_loc(def)) {
                // filters def users for fcall arguments
                var fcall_args = def.uses.filter(function(u) {
                    return (u.parent instanceof Expr.Call);
                });

                fcall_args.forEach(function(u) {
                    u.pluck(true);
                });

                // if no users left for that stack location, remove it altogether
                if (def.uses.length === 0) {
                    def.pluck(true);

                    return true;
                }
            }

            return false;
        });
    };

    var remove_preserved_loc = function(ctx) {

        ctx.preserved.forEach(function(pair) {
            var restored = pair[0];
            var saved = pair[1];

            while (restored !== saved) {
                var p = restored.parent;

                restored.marked = true;
                restored = p.operands[1].def;
            }
        });

        ctx.preserved = [];

        return ctx.iterate(function(def) {
            if (def.marked) {
                def.parent.pluck(true);

                return true;
            }

            return false;
        });
    };

    var propagate_flags_reg = function(ctx, arch) {
        const freg = arch.FLAGS_REG;

        const flagbits = [
            Flags.Flag('CF'),
            Flags.Flag('PF'),
            Flags.Flag('AF'),
            Flags.Flag('ZF'),
            Flags.Flag('SF'),
            Flags.Flag('OF')
        ];

        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                var is_flag_bit = function(fb) {
                    return lhand.equals_no_idx(fb);
                };

                if (freg.equals_no_idx(lhand) || flagbits.some(is_flag_bit)) {
                    while (def.uses.length > 0) {
                        var u = def.uses[0];
                        var c = rhand.clone(['idx', 'def']);

                        u.replace(c);
                        Simplify.reduce_stmt(c.parent_stmt());
                    }

                    p.pluck(true);

                    return true;
                }
            }

            return false;
        });
    };

    // propagate stack register definitions to their uses
    var propagate_stack_reg = function(ctx, arch) {
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                // TODO: should we avoid propagating phi assignments and into phi exprs?
                if (arch.is_stack_reg(lhand) || arch.is_stack_var(lhand) || arch.is_stack_var(rhand)) {
                    while (def.uses.length > 0) {
                        var u = def.uses[0];
                        var c = rhand.clone(['idx', 'def']);

                        u.replace(c);
                        Simplify.reduce_stmt(c.parent_stmt());

                        // unless something really hacky is going on in the binary,
                        // stack locations are assumed to be safe for propagations
                        // (i.e. they will not be aliased)
                        if (c.parent instanceof Expr.Deref) {
                            c.parent.is_safe = true;
                        }
                    }

                    // unused stack dereferences cannot be removed just yet, as they may
                    // serve as function call arguments
                    if (!(def instanceof Expr.Deref)) {
                        p.pluck(true);

                        return true;
                    }
                }
            }

            return false;
        });
    };

    var adjust_returns = function(func, arch) {
        const rreg = arch.RESULT_REG;

        var _is_uninit_rreg = function(expr) {
            return rreg.equals_no_idx(expr) && (expr.idx === 0);
        };

        var returns = [];
        var return_void = false;

        func.exit_blocks.forEach(function(block) {
            var terminator = block.container.terminator();

            if (terminator instanceof Stmt.Return) {
                var retval = terminator.retval;

                // return value is not initialized
                if (_is_uninit_rreg(retval)) {
                    return_void = true;
                }

                // several possible return values, of which one is not initialized
                else if ((retval instanceof Expr.Phi) && retval.operands.some(_is_uninit_rreg)) {
                    return_void = true;
                }

                returns.push(terminator);
            }
        });

        if (return_void) {
            returns.forEach(function(ret) {
                ret.retval.pluck(true);
            });
        }
    };

    function Analyzer(arch) {
        this.arch = arch;
        this.ovlgen = new Overlaps(arch.bits);
    }

    Analyzer.prototype.transform_step = function(container) {
        // replace position independent references with actual addresses
        resolve_pic(container, this.arch);
    };

    Analyzer.prototype.transform_done = function(func) {

        // generate assignments for overlapping register counterparts to maintain def-use correctness.
        // that generates a lot of redundant statements that eventually eliminated if remained unused
        gen_overlaps(func, this.ovlgen);

        // transform exit blocks' gotos into function calls
        transform_tailcalls(func);
    };

    Analyzer.prototype.ssa_step_regs = function(func, context) {
        insert_arguments(func, context, this.arch);

        while (propagate_stack_reg(context, this.arch)) { /* empty */ }
        while (propagate_flags_reg(context, this.arch)) { /* empty */ }
    };

    Analyzer.prototype.ssa_step_derefs = function(func, context) {
        // empty (was: insert_arguments)
    };

    Analyzer.prototype.ssa_step_vars = function(func, context) {
        // empty
    };

    Analyzer.prototype.ssa_done = function(func, context) {
        remove_preserved_loc(context);

        // analyze and assign function calls arguments
        assign_fcall_args(func, context, this.arch);

        // TODO: this should happen after propagating registers, since phi(rreg0,...) is not propagated to return just yet
        adjust_returns(func, this.arch);

        // cleanup_fcall_args(context, this.arch);
        transform_flags(func);
    };

    return Analyzer;
})();