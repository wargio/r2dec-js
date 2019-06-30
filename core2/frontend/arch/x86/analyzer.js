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
        const pcreg = arch.get_pc_reg();
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

    var assign_fcall_args = function(cntr, arch) {
        var fcalls = [];
        var setup = [];
    
        // extract function calls and their setup blocks
        cntr.statements.forEach(function(s) {
            var expr = s.expressions[0];

            if (expr instanceof Expr.Assign) {
                var rhand = expr.operands[1];

                // reached a function call?
                if (rhand instanceof Expr.Call) {
                    fcalls.push([rhand, setup]);
                    setup = [];
                } else {
                    setup.push(expr);
                }
            }
        });

        var cconv = new CallConv(arch);

        fcalls.forEach(function(pair) {
            var cexpr = pair[0];
            var setup = pair[1];

            // process only direct calls with known destinations
            if (cexpr.operator instanceof Expr.Val) {
                var ccname = Global.r2cmd('afc', '@', cexpr.operator.value.toString());

                if (!cconv.has(ccname)) {
                    throw new Error(ccname, 'calling convention is not supported yet');
                }

                cconv.get(ccname).get_args_expr(setup).forEach(function(arg) {
                    Simplify.reduce_expr(arg);

                    cexpr.push_operand(arg);
                });
            }
        });
    };

    var gen_overlaps = function(cntr, arch) {
        var overlaps = new Overlaps(arch.bits);
        var stmts = cntr.statements;
        var copy = [];

        while (stmts.length > 0) {
            var s = stmts.shift();
            copy.push(s);

            s.expressions.forEach(function(e) {
                if (e instanceof Expr.Assign) {
                    var lhand = e.operands[0];
    
                    if (lhand instanceof Expr.Reg) {
                        Array.prototype.push.apply(copy, overlaps.generate(lhand));
                    }
                }
            });
        }
    
        // replace stmts with copy array that includes generated overlaps
        copy.forEach(cntr.push_stmt, cntr);
    };

    // TODO: this is not arch-specific and should be extracted
    var insert_variables = function(func, arch) {
        var size = arch.bits;
        var vars = [];

        Array.prototype.concat(func.vars, func.args).forEach(function(v) {
            if (v.kind !== 'reg') {
                var ref = new Expr.Add(new Expr.Reg(v.ref.base, size), new Expr.Val(v.ref.offset, size));
                var variable = new Expr.Reg(v.name, size);  // TODO: should use a Variable instance rather than a fake Register
                var assign = new Expr.Assign(ref, new Expr.AddrOf(variable));

                Simplify.reduce_expr(ref);
                vars.push(assign);
            }
        });

        console.log('vars:');
        console.log(vars.map(function(v) { return '  ' + v.toString(16); }).join('\n'));

        var replace = [];

        func.basic_blocks.forEach(function(bb) {
            bb.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(/* TODO: shallow pass would be enough */).forEach(function(op) {
                        for (var i in vars) {
                            var lhand = vars[i].operands[0];
                            var rhand = vars[i].operands[1];

                            if (lhand.equals_no_idx(op)) {
                                replace.push([op, rhand.clone()]);
                            }
                        }
                    });
                });
            });
        });

        replace.forEach(function(pair) {
            var stmt = pair[0].parent_stmt();

            pair[0].replace(pair[1]);
            Simplify.reduce_stmt(stmt);
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

        func.basic_blocks.forEach(function(bb) {
            var terminator = bb.container.terminator();

            if (terminator) {
                var conditional = terminator.cond || terminator.retval;

                if (conditional) {
                    while (reduce_expr(conditional)) {
                        Simplify.reduce_expr(conditional);
                    }
                }
            }
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
        const sreg = arch.get_stack_reg();

        var is_stack_loc = function(e) {
            if (e instanceof Expr.Deref) {
                var deref_op = e.operands[0];

                // TODO: this is a temp workaround until stack locations are tagged appropriately
                return sreg.equals_no_idx(deref_op.iter_operands(true)[0]);

                // if ((deref_op instanceof Expr.Sub)
                //  || (deref_op instanceof Expr.Add)
                //  || (deref_op instanceof Expr.And)) {
                //     return sreg.equals_no_idx(deref_op.operands[0]);
                // }
                //
                // return sreg.equals_no_idx(deref_op);
            }

            return false;
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

    var cleanup_preserved_loc = function(ctx) {
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                // mem1 = x1
                // ...
                // x2 = mem1
                if ((lhand instanceof Expr.Deref) && (rhand.def !== undefined) && (rhand.def.idx === 0)) {
                    var skipped = 0;

                    while (def.uses.length > skipped) {
                        var u = def.uses[skipped];

                        if (u.parent instanceof Expr.Assign) {
                            // console.log('preserved loc:');
                            // console.log(' ', def.parent.parent_stmt().toString());
                            // console.log(' ', u.parent.parent_stmt().toString());

                            u.replace(rhand.clone(['idx', 'def']));
                        } else {
                            skipped++;
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

    var propagate_flags_reg = function(ctx, arch) {
        const freg = arch.get_flags_reg();
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
        const sreg = arch.get_stack_reg();

        var is_stack_reg = function(expr) {
            return expr.equals_no_idx(sreg);
        };

        var is_aligned_stack_var = function(expr) {
            if (expr instanceof Expr.And) {
                var lhand = expr.operands[0];
                var rhand = expr.operands[1];

                // return (is_stack_var(lhand) && (rhand instanceof Expr.Val));

                if (((lhand instanceof Expr.Sub) || (lhand instanceof Expr.Add)) && (rhand instanceof Expr.Val)) {
                    var inner_lhand = lhand.operands[0];
                    var inner_rhand = lhand.operands[1];

                    return is_stack_reg(inner_lhand) && (inner_rhand instanceof Expr.Val);
                }
            }

            return false;
        };

        var is_stack_var = function(expr) {
            if ((expr instanceof Expr.Sub) || (expr instanceof Expr.Add)) {
                var lhand = expr.operands[0];
                var rhand = expr.operands[1];

                return (is_stack_reg(lhand) || is_aligned_stack_var(lhand)) && (rhand instanceof Expr.Val);
            }

            return false;
        };

        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                if (is_stack_reg(lhand) || is_stack_var(lhand)) {
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
                }
            }

            return false;
        });
    };

    function Analyzer(arch) {
        this.arch = arch;
    }

    Analyzer.prototype.transform_step = function(container) {

        // replace position independent references with actual addresses
        resolve_pic(container, this.arch);

        // analyze and assign function calls arguments
        assign_fcall_args(container, this.arch);

        // duplicate assignments for overlapping registers to maintain def-use correctness. this
        // generates a lot of redundant statements that eventually eliminated if they are not used.
        gen_overlaps(container, this.arch);
    };

    Analyzer.prototype.transform_done = function(func) {
        // insert_variables(func, this.arch);
    };

    Analyzer.prototype.ssa_step = function(context) {
        while (propagate_stack_reg(context, this.arch)) { /* empty */ }
        while (propagate_flags_reg(context, this.arch)) { /* empty */ }
    };

    Analyzer.prototype.ssa_done = function(func, context) {
        cleanup_preserved_loc(context);
        
        // TODO: this should take place before assigning fcall args
        transform_tailcalls(func);

        cleanup_fcall_args(context, this.arch);
        transform_flags(func, this.arch);
    };

    return Analyzer;
})();