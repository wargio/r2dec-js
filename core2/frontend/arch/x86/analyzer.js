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
    // const Stmt = require('core2/analysis/ir/statements');
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
                // WORKAROUND: we cannot r2pipe 'afc' since it does not return a JSON object; rather
                // we would just ask for the whole 'afij', which has this information
                var ccname = Global.r2cmdj('afij', '@', cexpr.operator.value.toString()).pop().calltype;
    
                if (!cconv.has(ccname)) {
                    throw new Error(ccname, 'calling convension is not supported yet');
                }
    
                cconv.get(ccname).get_args_expr(setup).forEach(cexpr.push_operand, cexpr);
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

                Simplify.reduce_expr(assign);
                vars.push(assign);
            }
        });

        console.log('vars:');
        vars.forEach(function(v) {
            console.log('', v.toString());
        });

        var replace = [];

        func.basic_blocks.forEach(function(bb) {
            bb.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(/* TODO: shallow pass would be enough */).forEach(function(op) {
                        for (var i in vars) {
                            var lhand = vars[i].operands[0];
                            var rhand = vars[i].operands[1];

                            if (op.equals(lhand)) {
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

    // note: this has to take place before propagating sp0
    var cleanup_fcall_args = function(ctx, arch) {
        const sreg = arch.get_stack_reg();

        var is_stack_loc = function(e) {
            if (e instanceof Expr.Deref) {
                var deref_op = e.operands[0];

                if ((deref_op instanceof Expr.Sub) || (deref_op instanceof Expr.Add)) {
                    return sreg.equals_no_idx(deref_op.operands[0]);
                }

                return sreg.equals_no_idx(deref_op);
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

    var propagate_flags_reg = function(ctx, arch) {
        const freg = arch.get_flags_reg();

        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                if (freg.equals_no_idx(lhand)) {
                    while (def.uses.length > 0) {
                        var u = def.uses.pop();
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

    var propagate_stack_reg = function(ctx, arch) {
        const sreg = arch.get_stack_reg();
        
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                if (sreg.equals_no_idx(lhand)) {
                    while (def.uses.length > 0) {
                        var u = def.uses.pop();
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

    // function StackVar(expr) { Expr.Deref.call(this, expr); }
    //
    // StackVar.prototype = Object.create(Expr.Deref.prototype);
    // StackVar.prototype.constructor = StackVar;

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
        insert_variables(func, this.arch);
    };

    Analyzer.prototype.ssa_step = function(context) {
        while (propagate_stack_reg(context, this.arch)) { /* empty */ }
        while (propagate_flags_reg(context, this.arch)) { /* empty */ }
    };

    Analyzer.prototype.ssa_done = function(func, context) {
        cleanup_fcall_args(context, this.arch);
        transform_flags(func, this.arch);
    };

    Analyzer.prototype.controlflow_done = function(func) {
        // nothing here for now
    };

    return Analyzer;
})();