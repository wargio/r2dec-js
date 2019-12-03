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
    const Flags = require('js/libcore2/frontend/arch/x86/flags');
    const CallConv = require('js/libcore2/frontend/arch/x86/cconv');
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Stmt = require('js/libcore2/analysis/ir/statements');
    const Simplify = require('js/libcore2/analysis/ir/simplify');
    const Optimizer = require('js/libcore2/analysis/optimizer');
    const Propagator = require('js/libcore2/analysis/propagator');
    
    // TODO: this file looks terrible; refactor this sh*t

    // replace position independent references with actual addresses
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

                        if (i < (stmts.length - 1)) {
                            subst.push([o, stmts[i + 1].address]);
                        }
                    }
                });
            });
        });

        // TODO: re-implement this with insertion of weak pcreg assignments
        // rather than direct propagation
        subst.forEach(function(pair) {
            var op = pair[0];
            var addr_next = pair[1];
            var expr = new Expr.Val(addr_next, pcreg.size);

            op.replace(expr);
            Simplify.reduce_stmt(expr.parent_stmt());            
        });
    };

    // analyze and assign function calls arguments
    var assign_fcall_args = function(func, contexts, arch) {
        var cconvs = CallConv(arch);

        func.basic_blocks.forEach(function(block) {
            var local_context = contexts[block];

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
                        var callee = fcall.operands[0];

                        // most probably an imported function
                        if (callee instanceof Expr.Deref) {
                            callee = callee.operands[0];
                        }

                        // process only direct calls with known destinations; we cannot get calling convention
                        // info for indirect targets
                        if (callee instanceof Expr.Val) {
                            var ccname = Global.r2cmd('afc', '@', callee.value.toString(), '2>', '/dev/null');
                            var cchandler = cconvs[ccname];

                            if (cchandler === undefined) {
                                throw new Error('unsupported calling convention: ' + ccname);
                            }

                            cchandler.get_args_expr(fcall, local_context).forEach(function(arg) {
                                fcall.push_operand(arg);
                            });
                        }
                    }
                });
            });
        });
    };

    // generate assignments for overlapping register counterparts to reflect assignments side effects
    // so def-use correctness would be maintained.
    //
    // for example, the following assignment:
    //   eax = ebx
    //
    // would need the following assingments to reflect its effect on its counterparts correctly:
    //   rax = 0
    //   ax = ebx & 0x0000ffff
    //   al = ebx & 0x000000ff
    //   ah = (ebx & 0x0000ff00) >> 16
    //
    // that generates a lot of redundant assignment statements that would be eventually eliminated if remained unused
    var gen_overlaps = function(func, arch) {
        var archregs = arch.archregs;

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
                            var generated = archregs.generate(lhand).map(function(g) {
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

    var insert_reg_args = function(func, arch) {
        const size = arch.bits;

        var entry = func.entry_block.container;
        var addr = entry.address;

        var _is_reg = function(vobj) {
            return (typeof(vobj.ref) !== 'object');
        };

        var _vobj_to_vitem = function(vobj) {
            return {
                name: vobj.name,
                base: vobj.ref,
                type: vobj.type
            };
        };

        // keep only reg args
        var aitems = func.args.filter(_is_reg).map(_vobj_to_vitem);

        aitems.forEach(function(vitem) {
            // TODO: assuming here all reg arguments are of full size. in case this is
            // not true, we would need arch.archregs.get_reg_size(vitem.base) instead
            var assign = new Expr.Assign(
                new Expr.Reg(vitem.base, size),
                new Expr.Var(vitem.name, size)
            );

            // this is an artificial assignment; mark def as weak
            assign.operands[0].weak = true;

            entry.unshift_stmt(Stmt.make_statement(addr, assign));
        });

        return {
            vars: [],
            args: aitems
        };
    };

    // TODO: too similar to rename_bp_vars; consider unifying them
    var rename_sp_vars = function(func, ctx, arch) {
        const size = arch.bits;

        var _is_sp_based = function(vobj) {
            if (typeof(vobj.ref) === 'object') {
                var base = new Expr.Reg(vobj.ref.base, size);

                return arch.is_stack_reg(base);
            }

            return false;
        };

        var _vobj_to_vitem = function(vobj) {
            return {
                name: vobj.name,
                disp: /*Math.abs*/(vobj.ref.offset.toInt()),
                type: vobj.type
            };
        };

        // keep only sp-based vars and args
        var vitems = func.vars.filter(_is_sp_based).map(_vobj_to_vitem);
        var aitems = func.args.filter(_is_sp_based).map(_vobj_to_vitem);

        var sreg = arch.STACK_REG.clone();
        sreg.idx = 0;

        if (sreg in ctx.defs) {
            // locate all uses of frame register and get their parent expressions
            var stack_refs = ctx.defs[sreg].uses.map(function(u) {
                return u.parent;
            });

            stack_refs.forEach(function(expr) {
                var vlist = null;

                if (arch.is_stack_var(expr)) {
                    if (expr instanceof Expr.Sub) {
                        vlist = vitems;
                    } else if (expr instanceof Expr.Add) {
                        vlist = aitems;
                    }
                }

                if (vlist) {
                    var edisp = expr.operands[1].value.toInt();

                    for (var i = 0; i < vlist.length; i++) {
                        var vitem = vlist[i];
                        var vdisp = vitem.disp;

                        if (vdisp === edisp) {
                            var p = expr.parent;
                            var vsize = (p instanceof Expr.Deref) ? p.size : size;

                            var vexpr = new Expr.AddrOf(new Expr.Var(vitem.name, vsize));

                            // TODO: this is an experimental method to identify arrays on stack and
                            // make their references show appropriately
                            if ((vitem.type.endsWith('*')) && (vlist === vitems)) {
                                // this memory deref comes solely to match the address of, hence
                                // the undefined size - which is irrelevant
                                vexpr = new Expr.Deref(vexpr, undefined);
                            }

                            // propagate and simplify
                            expr.replace(vexpr);
                            Simplify.reduce_expr(vexpr.parent);

                            break;
                        }
                    }
                }
            });
        }

        return {
            vars: vitems,
            args: aitems
        };
    };

    // turn bp-based variables and arguments references into Variable expressions
    var rename_bp_vars = function(func, ctx, arch) {
        const size = arch.bits;

        var _is_bp_based = function(vobj) {
            if (typeof(vobj.ref) === 'object') {
                var base = new Expr.Reg(vobj.ref.base, size);

                return arch.is_frame_reg(base);
            }

            return false;
        };

        var _vobj_to_vitem = function(vobj) {
            return {
                name: vobj.name,
                disp: Math.abs(vobj.ref.offset.toInt()),
                type: vobj.type,
                maxsize: undefined
            };
        };

        // keep only bp-based vars and args
        var vitems = func.vars.filter(_is_bp_based).map(_vobj_to_vitem);
        var aitems = func.args.filter(_is_bp_based).map(_vobj_to_vitem);

        var _by_ref_offset = function(vitem0, vitem1) {
            return vitem0.disp - vitem1.disp;
        };

        // sort bp-based variables by their distance from bp
        vitems.sort(_by_ref_offset);

        // measure local variables size in bytes, though it is inaccurate since it may
        // include stack alignment. this is relevant mostly for locally allocated arrays
        vitems.reduce(function(prev_disp, vitem) {
            vitem.maxsize = vitem.disp - prev_disp;

            return vitem.disp;
        }, 0);

        var freg = arch.FRAME_REG.clone();
        freg.idx = 1;

        if (freg in ctx.defs) {
            // locate all uses of frame register and get their parent expressions
            var frame_refs = ctx.defs[freg].uses.map(function(u) {
                return u.parent;
            });

            frame_refs.forEach(function(expr) {
                var vlist = null;

                if (arch.is_frame_var(expr)) {
                    if (expr instanceof Expr.Sub) {
                        vlist = vitems;
                    } else if (expr instanceof Expr.Add) {
                        vlist = aitems;
                    }
                }

                if (vlist) {
                    var edisp = expr.operands[1].value.toInt();

                    for (var i = 0; i < vlist.length; i++) {
                        var vitem = vlist[i];
                        var vdisp = vitem.disp;

                        // the array ordering is determined by the variable's displacement (i.e. its distance
                        // from bp). an expression that refers to bp but has no exact displacement match (i.e.
                        // where the displacement is between two defined variables), means it is a reference
                        // to an offset from the one closer to bp: either an array index or a field offset. in
                        // that case, we use the variable's name, but add the relative offset inside it.
                        // note: relevant for local variables only; arguments are expected to get exact match

                        if (vdisp >= edisp) {
                            var p = expr.parent;
                            var vsize = (p instanceof Expr.Deref) ? p.size : size;

                            var vexpr = new Expr.AddrOf(new Expr.Var(vitem.name, vsize));

                            // // TODO: this is an experimental method to identify arrays on stack and
                            // // make their references show appropriately
                            // if ((vitem.type.endsWith('*')) && (vlist === vitems)) {
                            //     // this memory deref comes solely to match the address of, hence
                            //     // the undefined size - which is irrelevant
                            //
                            //     vexpr = new Expr.Deref(vexpr, undefined);
                            // }

                            if (vdisp > edisp) {
                                vexpr = new Expr.Add(vexpr, new Expr.Val(vdisp - edisp, size));
                            }

                            // propagate and simplify
                            expr.replace(vexpr);
                            Simplify.reduce_expr(vexpr.parent);

                            break;
                        }
                    }
                }
            });
        }

        return {
            vars: vitems,
            args: aitems
        };
    };

    // TODO: extract and move it somewhere else
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

    // identify tailcalls that show as Goto statements and turn them into proper function
    // calls whose return value is returned by current function
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

    var remove_preserved_loc = function(ctx, preserved) {
        preserved.forEach(function(pair) {
            var restored = pair[0];
            var saved = pair[1];

            while (restored !== saved) {
                var p = restored.parent;

                restored.marked = true;
                restored = p.operands[1].def;
            }
        });

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

        var _is_flag_def = function(def, val) {
            var __is_flag_bit = function(fb) {
                return def.equals_no_idx(fb);
            };

            return freg.equals_no_idx(def) || flagbits.some(__is_flag_bit);
        };

        var _select = function(def, val, conf) {
            return (def.idx !== 0) && !(val instanceof Expr.Phi) && _is_flag_def(def, val);
        };

        var _get_replacement = function(use, val) {
            if (use.parent instanceof Expr.Phi) {
                return null;
            }

            return val.clone(['idx', 'def']);
        };

        Optimizer.run([
            new Propagator(_select, _get_replacement)
        ], ctx, null);
    };

    // propagate stack register definitions to their uses and simplify in-place. that should
    // normalize all stack references to use a single stack pointer definition
    var propagate_stack_reg = function(ctx, arch) {
        var _is_stack_location = function(def, val) {
            return arch.is_stack_reg(def)
                || arch.is_stack_var(def)
                || arch.is_stack_var(val);
        };

        var _select = function(def, val, conf) {
            // select stack locations, but exclude those which are assigned phis
            return (def.idx !== 0) && !(val instanceof Expr.Phi) && _is_stack_location(def, val);
        };

        var _get_replacement = function(use, val) {
            // do not propagate into phi (i.e. user is a phi arg)
            if (use.parent instanceof Expr.Phi) {
                return null;
            }

            return val.clone(['idx', 'def']);
        };

        // even though def got no uses left by now, we do not pluck anything just yet.
        // stack adjustments will be used to determine the top of stack when analysing stack
        // possible function call arguments locations, while stack dereferences may serve as
        // function call arguments

        Optimizer.run([
            new Propagator(_select, _get_replacement)
        ], ctx, null);
    };

    // unless something really hacky is going on in the binary, stack locations
    // are assumed to be safe for propagations (i.e. they will not be aliased).
    // this pass iterates over all memory deref definitions to tag them as safe
    var tag_stack_derefs = function(ctx, arch) {
        return ctx.iterate(function(def) {
            if (def instanceof Expr.Deref) {
                var memloc = def.operands[0];

                if (arch.is_stack_reg(memloc) || arch.is_stack_var(memloc)) {
                    def.is_safe = true;
                }
            }

            return false;
        });
    };

    // there are some indications that may suggest that the function does not return
    // a value (i.e. returns void). if found, adjust all return statements in the function
    // accordingly
    var adjust_returns = function(func, arch) {
        var rreg = arch.RESULT_REG;
        rreg.idx = 0;

        var _is_uninit_rreg = function(expr) {
            return rreg.equals(expr);
        };

        var returns = [];
        var return_void = false;

        func.exit_blocks.forEach(function(block) {
            var terminator = block.container.terminator();

            if (terminator instanceof Stmt.Return) {
                var retval = terminator.retval;

                if (rreg.equals_no_idx(retval)) {
                    // return value is not initialized
                    if (_is_uninit_rreg(retval)) {
                        return_void = true;
                    }

                    // several possible return values, of which one is not initialized
                    else {
                        // a reg is returned; retrieve the value assigned to that reg
                        var pval = retval.def.parent.operands[1];

                        if ((pval instanceof Expr.Phi) && pval.operands.some(_is_uninit_rreg)) {
                            return_void = true;
                        }
                    }
                }

                returns.push(terminator);
            }
        });

        if (return_void) {
            returns.forEach(function(ret) {
                // if this is a tail call, replace the return statement with the fcall
                if (ret.retval instanceof Expr.Call) {
                    var fcall = Stmt.make_statement(ret.address, ret.retval);

                    ret.replace(fcall);
                }

                // in any other case, just pluck the returned expression
                else {
                    ret.retval.pluck(true);
                }
            });
        }
    };

    function Analyzer(arch) {
        this.arch = arch;

        this.func_args = [];
        this.func_vars = [];
    }

    Analyzer.prototype.transform_step = function(container) {
        resolve_pic(container, this.arch);
    };

    Analyzer.prototype.transform_done = function(func) {
        var regs = insert_reg_args(func, this.arch);

        this.func_vars = regs.vars;
        this.func_args = regs.args;

        gen_overlaps(func, this.arch);

        // transform exit blocks' gotos into function calls
        transform_tailcalls(func);
    };

    Analyzer.prototype.ssa_step_regs = function(func, context) {
        var sp = rename_sp_vars(func, context, this.arch);
        var bp = rename_bp_vars(func, context, this.arch);

        this.func_vars = this.func_vars.concat(sp.vars, bp.vars);
        this.func_args = this.func_args.concat(sp.args, bp.args);

        propagate_stack_reg(context, this.arch);
        propagate_flags_reg(context, this.arch);
    };

    Analyzer.prototype.ssa_step_vars = function(func, context) {
        // empty
    };

    Analyzer.prototype.ssa_step_derefs = function(func, context) {
        tag_stack_derefs(context, this.arch);
    };

    Analyzer.prototype.ssa_done = function(func, ssa, ctx) {
        var contexts = ssa.get_local_contexts(false);
        var preserved = ssa.preserved_locations(contexts);

        remove_preserved_loc(ctx, preserved);

        contexts = ssa.get_local_contexts(false);
        assign_fcall_args(func, contexts, this.arch);

        adjust_returns(func, this.arch);
        transform_flags(func);
    };

    return Analyzer;
});