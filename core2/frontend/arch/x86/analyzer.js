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

                    // is a function call?
                    if ((expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Call)) {
                        var fcall = expr.operands[1];
                        var callee = fcall.operator;
        
                        if (callee instanceof Expr.Deref) {
                            callee = callee.operands[0];
                        }

                        // process only direct calls with known destinations
                        if (callee instanceof Expr.Val) {
                            var ccname = Global.r2cmd('afc', '@', callee.value.toString());
        
                            if (!cconv.has(ccname)) {
                                throw new Error('unsupported calling convention');
                            }

                            // live ranges should be refreshed as args are added to fcalls (i.e. defs are killed)
                            // TODO: this is quite time consuming; a good candidate for an optimization
                            var live_ranges = ctx.get_live_ranges(block);

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
                var s = statements.shift();
                expanded.push(s);

                s.expressions.forEach(function(expr) {
                    if (expr instanceof Expr.Assign) {
                        var lhand = expr.operands[0];

                        if (lhand instanceof Expr.Reg) {
                            Array.prototype.push.apply(expanded, ovlgen.generate(lhand));
                        }
                    }
                });
            }

            // have block's container replace its statement list with the newly created one,
            // containing the generated overlaps
            expanded.forEach(container.push_stmt, container);
        });
    };

    var insert_variables = function(func, arch) {
        var size = arch.bits;
        var entry = func.entry_block.container;

        console.log('args:');
        Array.prototype.concat(func.vars, func.args).forEach(function(a) {
            var ref;

            if (typeof(a.ref) === 'object') {
                var base = new Expr.Reg(a.ref.base, size);
                var disp = new Expr.Val(a.ref.offset, size);

                ref = new Expr.Add(base, disp);
            } else {
                ref = new Expr.Reg(a.ref, size);
            }

            // TODO: use a dedicated object rather than a fake Reg?
            var arg = new Expr.Reg(a.name, size);
            var assignment = new Expr.Assign(ref, new Expr.AddrOf(arg));

            Simplify.reduce_expr(ref);
            entry.unshift_stmt(Stmt.make_statement(new Expr.Val(0).value, assignment));

            console.log('', assignment.toString(16));
        });


        // var sreg = arch.STACK_REG;
        // var freg = arch.FRAME_REG();
        //
        // Array.prototype.concat(func.vars, func.args).forEach(function(v) {
        //     if (v.kind !== 'reg') {
        //         var base = new Expr.Reg(v.ref.base, size);
        //
        //         if (base.equals_no_idx(base)) {
        //             // ..?
        //         }
        //
        //         var ref = new Expr.Add(base, new Expr.Val(v.ref.offset, size));
        //         var variable = new Expr.Reg(v.name, size);  // TODO: should use a Variable instance rather than a fake Register
        //         var assign = new Expr.Assign(ref, new Expr.AddrOf(variable));
        //
        //         Simplify.reduce_expr(ref);
        //         vars.push(assign);
        //     }
        // });
        //
        // var replace = [];
        //
        // func.basic_blocks.forEach(function(bb) {
        //     bb.container.statements.forEach(function(stmt) {
        //         stmt.expressions.forEach(function(expr) {
        //             expr.iter_operands(/* TODO: shallow pass would be enough */).forEach(function(op) {
        //                 for (var i in vars) {
        //                     var lhand = vars[i].operands[0];
        //                     var rhand = vars[i].operands[1];
        //
        //                     if (lhand.equals_no_idx(op)) {
        //                         replace.push([op, rhand.clone()]);
        //                     }
        //                 }
        //             });
        //         });
        //     });
        // });
        //
        // replace.forEach(function(pair) {
        //     var stmt = pair[0].parent_stmt();

        //     pair[0].replace(pair[1]);
        //     Simplify.reduce_stmt(stmt);
        // });
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
                var expr = null;

                if (stmt instanceof Stmt.Branch) {
                    expr = stmt.cond;
                } else if (stmt.expressions[0] instanceof Expr.Assign) {
                    expr = stmt.expressions[0].operands[1]; // rhand of assignment
                }

                if (expr) {
                    while (reduce_expr(expr)) {
                        Simplify.reduce_expr(expr);
                    }
                }
            });
        });
    };

    var transform_tailcalls = function(func) {
        func.basic_blocks.forEach(function(bb) {
            var terminator = bb.container.terminator();

            if (terminator instanceof Stmt.Goto) {
                var dest = terminator.dest;

                // direct jump
                if (dest instanceof Expr.Val) {
                    // jumping out of function boundaries? this is a tail call
                    if (dest.value.lt(func.lbound) || dest.value.gt(func.ubound)) {
                        var fcall = new Expr.Call(dest.clone(), []);

                        terminator.replace(Stmt.make_statement(terminator.address, fcall));
                    }
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
        // insert_variables(func, this.arch);

        // generate assignments for overlapping register counterparts to maintain def-use correctness.
        // that generates a lot of redundant statements that eventually eliminated if remained unused
        gen_overlaps(func, this.ovlgen);
    };

    Analyzer.prototype.ssa_step = function(context) {
        while (propagate_stack_reg(context, this.arch)) { /* empty */ }
        while (propagate_flags_reg(context, this.arch)) { /* empty */ }
    };

    Analyzer.prototype.ssa_done = function(func, context) {
        remove_preserved_loc(context);

        transform_tailcalls(func);

        // analyze and assign function calls arguments
        assign_fcall_args(func, context, this.arch);

        // TODO: this should happen after propagating registers
        adjust_returns(func, this.arch);

        // cleanup_fcall_args(context, this.arch);
        transform_flags(func);
    };

    return Analyzer;
})();