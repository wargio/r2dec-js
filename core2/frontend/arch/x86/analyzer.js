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
    const Simplify = require('core2/analysis/ir/simplify');

    // TODO: this file looks terrible; refactor this sh*t

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
    
    var substitue_rip = function(cntr, arch) {
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
                        subst.push([o, stmts[i + 1].addr]);
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

    // TODO: this takes place after propagation. either place somewhere earlier, before propagations
    // or change to look for FlagOp rather than Flag
    var transform_flags = function(func) {
        const CF = Flags.Flag('CF');
        const ZF = Flags.Flag('ZF');
        const SF = Flags.Flag('SF');
        const OF = Flags.Flag('OF');

        var isCF = function(expr) { return (expr instanceof Expr.Reg) && (expr.equals_no_idx(CF)); };
        var isZF = function(expr) { return (expr instanceof Expr.Reg) && (expr.equals_no_idx(ZF)); };
        var isSF = function(expr) { return (expr instanceof Expr.Reg) && (expr.equals_no_idx(SF)); };
        var isOF = function(expr) { return (expr instanceof Expr.Reg) && (expr.equals_no_idx(OF)); };

        var simplify_flags = function(expr) {
            var cmp;
            var op;
    
            // equal
            if (isZF(expr)) {
                cmp = Expr.EQ;
                console.log('operands', Object.keys(expr));
                op = expr.operands[0];
            }

            // less (signed)
            // SIGN(a - b) != OVERFLOW(a - b) becomes a < b
            else if ((expr instanceof Expr.NE) &&
                (isSF(expr.operands[0])) &&
                (isOF(expr.operands[1])) &&
                (expr.operands[0].operands[0].equals(expr.operands[1].operands[0]))) {
                    cmp = Expr.LT;
                    op = expr.operands[0].operands[0];
            }
    
            // greater (signed)
            // SIGN(a - b) == OVERFLOW(a - b) becomes a > b
            else if ((expr instanceof Expr.EQ) &&
                (isSF(expr.operands[0])) &&
                (isOF(expr.operands[1])) &&
                (expr.operands[0].operands[0].equals(expr.operands[1].operands[0]))) {
                    cmp = Expr.GT;
                    op = expr.operands[0].operands[0];
            }
    
            // below (unsigned)
            // CARRY(a - b) becomes a < b
            else if (isCF(expr)) {
                cmp = Expr.LT;
                op = expr.operands[0];
            }
    
            // above (unsigned)
            // !CARRY(a - b) becomes a > b
            else if ((expr instanceof Expr.BoolNot) &&
                (isCF(expr.operands[0]))) {
                    cmp = Expr.GT;
                    op = expr.operands[0];
            }
    
            if (op) {
                var zero = new Expr.Val(0, op.size);
    
                return new cmp(op.pluck(), zero);
            }
    
            return null;
        };

        var reduce_expr = function(expr) {
            var operands = expr.iter_operands(true);

            for (var o in operands) {
                o = operands[o];

                console.log(o);
                var alt = simplify_flags(o);

                if (alt) {
                    o.replace(alt);

                    return alt;
                }
            }

            return null;
        };

        func.basic_blocks.forEach(function(bb) {
            bb.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    while (reduce_expr(expr)) { /* empty */ }
                });
            });
        });
    };

    // note: this has to take place before propagating sp0
    var cleanup_fcall_args = function(ctx, arch) {
        const sreg = arch.get_stack_reg();

        var is_stack_deref = function(e) {
            return (e instanceof Expr.Deref) && (e.operands[0].iter_operands(true)[0].equals_no_idx(sreg));
        };

        return ctx.iterate(function(def) {
            if (def.idx === 0) {
                if (is_stack_deref(def)) {
                    var cleanup = def.uses.filter(function(u) {
                        return (u.parent instanceof Expr.Call);
                    });

                    cleanup.forEach(function(u) {
                        u.pluck(true);
                    });

                    if (def.uses.length === 0) {
                        def.pluck(true);

                        return true;
                    }
                }
            }

            return false;
        });
    };

    var propagate_stack_locations = function(ctx, arch) {
        const sreg = arch.get_stack_reg();
        
        return ctx.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                if (lhand.equals_no_idx(sreg)) {
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
        // TODO: make StackVar objects?

        // x64: replace position independent references with actual addresses
        substitue_rip(container, this.arch);

        // analyze and assign function calls arguments
        assign_fcall_args(container, this.arch);

        // duplicate assignments for overlapping registers to maintain def-use correctness. this
        // generates a lot of redundant statements that eventually eliminated if they are not used.
        // note: stmts array is modified by this function
        gen_overlaps(container, this.arch);
    };

    Analyzer.prototype.transform_done = function(func) {
        // transform_flags(func);
    };

    Analyzer.prototype.ssa_step = function(context) {
        while (propagate_stack_locations(context, this.arch)) { /* empty */ }
    };

    Analyzer.prototype.ssa_done = function(context) {
        cleanup_fcall_args(context, this.arch);
    };

    return Analyzer;
})();