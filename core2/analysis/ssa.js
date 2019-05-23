
module.exports = (function() {
    const Graph = require('core2/analysis/graph');
    const Stmt = require('core2/analysis/ir/statements');
    const Expr = require('core2/analysis/ir/expressions');
    const Simplify = require('core2/analysis/ir/simplify');

    function DefUse() {
        this.defs = {};
        this.uninit = new Stmt.Statement(0, []);
    }

    DefUse.prototype.add_def = function(v) {
        var key = v.toString();

        if (key in this.defs) {
            console.log('[!]', key, 'is already defined');
        }

        this.defs[key] = v;
        v.uses = [];
    };

    DefUse.prototype.add_use = function(u) {
        var key = u.toString();

        // every used var is expected to be defined beforehand
        // if it was not, this is probably an architectural register
        // that is initialized implicitly, e.g. stack pointer, args regs, etc.
        if (!(key in this.defs)) {
            var uc = u.clone(['idx']);
            uc.is_def = true;
            this.uninit.push_expr(uc);

            this.add_def(uc);
        }

        var def = this.defs[key];

        if (u.def !== undefined) {
            console.log('[!]', u, 'def should be assigned to "' + def + '", but expr already got "' + u.def + '"');
        }

        u.def = def;
        def.uses.push(u);
    };

    DefUse.prototype.iterate = function(func) {
        // apply `func` on all defs entries, and collect the keys to eliminate
        var eliminate = Object.keys(this.defs).filter(function(d) {
            return func(this.defs[d]);
        }, this);

        // eliminate collected keys from defs
        eliminate.forEach(function(d) {
            delete this.defs[d];
        }, this);

        return eliminate.length > 0;
    };

    var get_stmt_addr = function(expr) {
        var p = expr.parent_stmt();
        
        return p ? p.addr.toString(16) : '?';
    };

    var padEnd = function(s, n) {
        var padlen = n - s.length;

        return s + (padlen > 0 ? ' '.repeat(padlen) : '');
    };

    DefUse.prototype.toString = function() {
        var header = ['\u250f', '', 'def-use chains:'].join(' ');

        var table = Object.keys(this.defs).map(function(d) {
            var _def = get_stmt_addr(this.defs[d]);
            var _use = this.defs[d].uses.map(get_stmt_addr);

            return ['\u2503', '  ', padEnd(d, 32), '[' + _def + ']', ':', _use.join(', ')].join(' ');
        }, this);

        var footer = ['\u2517'];

        return Array.prototype.concat(header, table, footer).join('\n');
    };

    function SSA(func) {
        this.func = func;
        this.cfg = func.cfg();
        this.dom = new Graph.DominatorTree(this.cfg);
    }

    // iterate all statements in block and collect only defined names
    var get_defs = function(selector, block) {
        var defs = [];

        // TODO: Duktape Array prototype has no 'findIndex' method. this workaround should be
        // removed when Duktape implements this method for Array prototype.
        // <WORKAROUND>
        defs.findIndex = function(predicate) {
            for (var i = 0; i < this.length; i++) {
                if (predicate(this[i])) {
                    return i;
                }
            }

            return (-1);
        };
        // </WORKAROUND>

        block.container.statements.forEach(function(stmt) {
            stmt.expressions.forEach(function(expr) {
                expr.iter_operands().forEach(function(op) {
                    if (selector(op) && op.is_def) {
                        var idx = defs.findIndex(function(d) {
                            d.equals_no_idx(op);
                        });

                        // if already defined, remove old def and use the new one instead
                        // not sure if this is actually needed... [could just drop later defs of the same var]
                        if (idx !== (-1)) {
                            defs.splice(idx, 1);
                        }

                        defs.push(op);
                    }
                });
            });
        });

        return defs;
    };

    // get a function basic block from a graph node
    var node_to_block = function(f, node) {
        return f.getBlock(node.key) || null;
    };

    // get a graph node from a function basic block
    var block_to_node = function(g, block) {
        return g.getNode(block.address) || null;
    };

    // predicate to determine whether an expression is a phi definition
    var is_phi_assignment = function(expr) {
        return (expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Phi);
    };

    var insert_phi_exprs = function(selector) {
        var defs = {};
        var blocks = this.func.basic_blocks;

        // map a block to its list of definitions
        blocks.forEach(function(blk) {
            defs[blk] = get_defs(selector, blk);
        });

        // JS causes defsites keys to be stored as strings. since we need the definitions
        // expressions themselves, we need to maintain a dedicated array for that.
        var defsites = {};
        var defsites_keys = [];

        // map a variable to blocks where it is defined
        blocks.forEach(function(blk) {
            var block_defs = defs[blk];

            block_defs.forEach(function(d) {
                if (!(d in defsites)) {
                    defsites_keys.push(d);
                    defsites[d] = [];
                }

                defsites[d].push(blk);
            });
        });

        var phis = {};

        for (var a in defsites_keys) {
            a = defsites_keys[a];   // a: definition expression
            var W = defsites[a];    // W: an array of blocks where 'a' is defined

            while (W.length > 0) {
                // defsites value list elements are basic block addresses, while domTree accepts a Node
                var n = block_to_node(this.dom, W.pop());

                this.dom.dominanceFrontier(n).forEach(function(y) {
                    if (!(y in phis)) {
                        phis[y] = [];
                    }

                    // if 'a' has no phi statement in current block, create one
                    if (phis[y].indexOf(a) === (-1)) {
                        var args = new Array(this.cfg.predecessors(y).length);

                        // duplicate 'a' as many times as 'y' has predecessors. note that the
                        // ssa index of the cloned expression is preserved, since memory dereferences
                        // may be enclosing indexed expressions
                        for (var i = 0; i < args.length; i++) {
                            args[i] = a.clone(['idx', 'def']);
                        }

                        // turn Node y into BasicBlock _y
                        var _y = node_to_block(this.func, y);

                        // insert the statement a = Phi(a, a, ..., a) at the top of block y, where the
                        // phi-function has as many arguments as y has predecessors
                        var phi_stmt = Stmt.make_statement(_y.address, new Expr.Assign(a.clone(['idx', 'def']), new Expr.Phi(args)));

                        // insert phi at the beginning of the container
                        _y.container.unshift_stmt(phi_stmt);

                        phis[y].push(a);
                        if (defs[_y].indexOf(a) === (-1)) {
                            W.push(_y);
                        }
                    }
                }, this);
            }
        }
    };

    SSA.prototype.rename_variables = function() {

        // initialize count and stack
        var initialize = function(selector, count, stack) {
            this.func.basic_blocks.forEach(function(blk) {
                blk.container.statements.forEach(function(stmt) {
                    stmt.expressions.forEach(function(expr) {
                        expr.iter_operands().forEach(function(op) {
                            if (selector(op)) {
                                var repr = op.repr();

                                count[repr] = 0;
                                stack[repr] = [0];
                            }
                        });
                    });
                });
            });
        };

        // get the top element of an array
        var top = function(arr) {
            return arr[arr.length - 1];
        };

        var rename_rec = function(selector, count, stack, n) {
            // console.log('n:', n.toString());

            n.container.statements.forEach(function(stmt) {
                // console.log('\u250f', '', 'stmt:', stmt.toString());

                // console.log('\u2503', '  ', 'USE:');
                stmt.expressions.forEach(function(expr) {
                    if (!is_phi_assignment(expr)) {
                        // console.log('\u2503', '    ', 'expr:', expr.toString());

                        expr.iter_operands(true).forEach(function(op) {
                            // console.log('\u2503', '      ', 'op:', op.toString());

                            if (selector(op) && !op.is_def) {
                                var repr = op.repr();
 
                                // nesting derefs are picked up in stack initialization without inner
                                // subscripts, since subscripts are not assigned yet. here they are
                                // referred after inner subscripts are assigned, so they do not appear
                                // in vars stack. for example:
                                //
                                // nesting derefs such as:
                                //      *(*(ebp₁ + 8)₀ + *(ebp₁ - 4)₁)
                                //
                                // do not appear in the stack, because they were picked up as:
                                //      *(*(ebp₁ + 8) + *(ebp₁ - 4))
                                //
                                // <WORKAROUND>
                                if (!(repr in stack)) {
                                    console.log('USE: could not find stack for "', repr, '"');
                                    stack[repr] = [0];
                                    count[repr] = 0;
                                }
                                // </WORKAROUND>

                                op.idx = top(stack[repr]);

                                // console.log('\u2503', '        ', 'idx:', op.idx);
                                defs.add_use(op);
                            }
                        });
                    }
                });

                // console.log('\u2503', '  ', 'DEF:');
                stmt.expressions.forEach(function(expr) {
                    // console.log('\u2503', '    ', 'expr:', expr.toString());

                    expr.iter_operands(true).forEach(function(op) {
                        // console.log('\u2503', '      ', 'op:', op.toString());

                        if (selector(op) && op.is_def) {
                            var repr = op.repr();

                            count[repr]++;
                            stack[repr].push(count[repr]);

                            op.idx = top(stack[repr]);

                            // console.log('\u2503', '        ', 'idx:', op.idx);
                            defs.add_def(op);
                        }
                    });
                });

                // console.log('\u2517', '', 'str:', stmt);
            });

            this.cfg.successors(block_to_node(this.cfg, n)).forEach(function(Y) {
                var j = this.cfg.predecessors(Y).indexOf(block_to_node(this.cfg, n));

                // console.log('node', n, 'is the', j, 'th successor of', Y.toString(16));

                // iterate over all phi functions in Y
                node_to_block(this.func, Y).container.statements.forEach(function(stmt) {
                    stmt.expressions.forEach(function(expr) {
                        if (is_phi_assignment(expr)) {
                            var v = expr.operands[0];

                            if (selector(v)) {
                                var phi = expr.operands[1];
                                var op = phi.operands[j];

                                // console.log('|  found a phi stmt', stmt, ', replacing its', j, 'arg');

                                op.idx = top(stack[op.repr()]);
                                defs.add_use(op);
                            }
                        }
                    });
                });
            }, this);

            // console.log('-'.repeat(15));

            this.dom.successors(block_to_node(this.dom, n)).forEach(function(X) {
                rename_rec.call(this, selector, count, stack, node_to_block(this.func, X));
            }, this);

            n.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
                            stack[op.repr()].pop();
                        }
                    });
                });
            });
        };

        var rename = function(selector) {
            var entry_block = node_to_block(this.func, this.dom.getRoot());

            var count = {};
            var stack = {};

            insert_phi_exprs.call(this, selector);
            initialize.call(this, selector, count, stack);
            rename_rec.call(this, selector, count, stack, entry_block);
        };

        var defs = new DefUse();

        var s0 = function(op) { return (op instanceof Expr.Reg); };
        var s1 = function(op) { return (op instanceof Expr.Deref); };
        var s2 = function(op) { return (op instanceof Expr.Reg) || (op instanceof Expr.Deref); };

        // this.func.uninitialized = defs.uninit;

        // DONE:
        //  - get the whole program to work with Long objects rather than numbers

        // TODO:
        //  - add sp0 def
        //  - make stack var objects for stack location before propagating sp0

        // ssa from regs
        // console.log('\u2501'.repeat(15), 'REGS', '\u2501'.repeat(15));
        rename.call(this, function(x) { return (x instanceof Expr.Reg); });
        relax_phi(defs);

        console.log('validate REGS before opt'); this.validate(defs, s0);
        while (propagate_stack_locations(defs)) { /* empty */ }
        while (eliminate_def_zero_uses(defs))   { /* empty */ }
        while (propagate_def_single_use(defs))  { /* empty */ }
        console.log('validate REGS after opt'); this.validate(defs, s0);

        // ssa from derefs
        // console.log('\u2501'.repeat(15), 'DEREFS', '\u2501'.repeat(15));
        rename.call(this, function(x) { return (x instanceof Expr.Deref); });
        relax_phi(defs);

        console.log('validate DEREFS before opt'); this.validate(defs, s1);
        while (propagate_stack_locations(defs)) { /* empty */ }
        while (eliminate_def_zero_uses(defs))   { /* empty */ }
        while (propagate_def_single_use(defs))  { /* empty */ }
        console.log('validate DEREFS after opt'); this.validate(defs, s1);

        // note: this has to take place before propagating sp0
        cleanup_fcall_args(defs);

        console.log('validate ALL'); this.validate(defs, s2);

        return defs;
    };

    SSA.prototype.validate = function(defs, selector) {

        this.func.basic_blocks.forEach(function(blk) {
            blk.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands().forEach(function(op) {

                        if (selector(op)) {
                            if (op.is_def) {
                                if (!(op in defs.defs)) {
                                    console.log('[!] missing def for:', op);
                                    console.log('    parent_stmt:', op.parent_stmt());
                                }
                            } else {
                                if (op.def === undefined) {
                                    console.log('[!] use without an assigned def:', op);
                                    console.log('    parent_stmt:', op.parent_stmt());
                                } else {
                                    if (op.def.uses.indexOf(op) === (-1)) {
                                        console.log('[!] unregistered use:', op);
                                        console.log('    parent_stmt:', op.parent_stmt());
                                    }
                                }
                            }
                        }

                    });
                });
            });
        });

        for (var d in defs.defs) {
            var v = defs.defs[d];

            if (v.parent_stmt() === undefined) {
                console.log('[!] stale def:', v);
            }

            v.uses.forEach(function(u, i) {
                if (!(u.def.equals(v))) {
                    console.log('[!] stale use:', v, '[' + i + ']');
                }
            });
        }
    };

    // propagate phi groups that have only one item in them.
    // if a phi expression has only one argument, propagate it into defined variable
    //
    //   x7 = Phi(x4)       // phi and x7 are eliniminated, x4 propagated to x7 uses
    //   x8 = x7 + 1   -->  x8 = x4 + 1
    //   x9 = *(x7)         x9 = *(x4)
    var propagate_single_phi = function(defs) {
        return defs.iterate(function(def) {
            var p = def.parent;

            if (is_phi_assignment(p)) {
                var v = p.operands[0];
                var phi = p.operands[1];

                if (phi.operands.length === 1) {
                    var phi_arg = phi.operands[0];

                    while (v.uses.length > 0) {
                        var u = v.uses.pop();
                        var c = phi_arg.clone(['idx', 'def']);

                        u.replace(c);
                    }

                    p.pluck(true);

                    return true;
                }
            }

            return false;
        });
    };

    // propagate self-referencing phis.
    //
    //   x5 = Phi(x2, x5)  -->  x5 = x2
    var propagate_self_ref_phi = function(defs) {
        return defs.iterate(function(def) {
            var p = def.parent;

            if (is_phi_assignment(p)) {
                var v = p.operands[0];
                var phi = p.operands[1];

                if (phi.operands.length === 2) {
                    var other = null;

                    if (phi.operands[0].equals(v)) {
                        other = phi.operands[1].pluck();
                    } else if (phi.operands[1].equals(v)) {
                        other = phi.operands[0].pluck();
                    }

                    if (other) {
                        phi.replace(other);
                    }

                    // note: return false anyway since we do not eliminating the definition
                    // rather we just update it with another assigned expr. 
                }
            }

            return false;
        });
    };

    // propagate a phi with only one use that happens to be a phi
    var propagate_chained_phi = function(defs) {
        return defs.iterate(function(def) {
            var p = def.parent;

            if (is_phi_assignment(p)) {
                var v = p.operands[0];
                var phi = p.operands[1];

                if (v.uses.length === 1) {
                    if (v.uses[0].parent instanceof Expr.Phi) {
                        var u = v.uses.pop();

                        // remove propagted phi as it is going to be replaced with its operands
                        v.pluck();

                        for (var i = 0; i < phi.operands.length; i++)
                        {
                            var o = phi.operands[i];

                            // propagate phi operands into its phi user, avoiding duplications
                            // TODO: not sure if we can safely discard duplicates or not
                            if (!u.parent.has(o)) {
                                u.parent.push_operand(o.clone(['idx', 'def']));
                            }
                        }

                        // detach propagated phi along of its operands
                        p.pluck(true);

                        return true;
                    }
                }
            }

            return false;
        });

    };

    var relax_phi = function(defs) {
        propagate_single_phi(defs);
        propagate_self_ref_phi(defs);
        propagate_chained_phi(defs);
    };

    // TODO: need to extract this; it is arch-specific
    var cleanup_fcall_args = function(defs) {
        var is_stack_var = function(e) {
            return (e instanceof Expr.Reg) && (['sp', 'esp', 'rsp'].indexOf(e.name) !== (-1));
        };

        var is_stack_deref = function(e) {
            return (e instanceof Expr.Deref) && is_stack_var(e.operands[0].iter_operands(true)[0]);
        };

        return defs.iterate(function(def) {
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

    // TODO: need to extract this; it is arch-specific
    var propagate_stack_locations = function(defs) {
        var is_stack_reg = function(e) {
            return (e instanceof Expr.Reg) && (['sp', 'esp', 'rsp'].indexOf(e.name) !== (-1));
        };

        return defs.iterate(function(def) {
            if (def.idx !== 0) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                if (is_stack_reg(lhand)) {
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

    var eliminate_def_zero_uses = function(defs) {
        return defs.iterate(function(def) {
            if (def.uses.length === 0) {
                if (def.idx === 0) {
                    // uninitialized defs are not really Expr.Assign instances
                    return true;
                } else {
                    var p = def.parent;         // p is Expr.Assign
                    var lhand = p.operands[0];  // def
                    var rhand = p.operands[1];  // assigned expression

                    // function calls may have side effects, and cannot be eliminated altogether.
                    // instead, they are extracted from the assignment and kept aside.
                    if (rhand instanceof Expr.Call) {
                        p.replace(rhand.clone(['idx', 'def']));

                        return true;
                    }

                    // memory dereferences may have side effects as well, so they cannot be eliminated. an exception
                    // to that are memory dereferences that are assigned to phi expressions. phi are not real program
                    // operations and have no side effects.
                    else if ((!(lhand instanceof Expr.Deref) || (rhand instanceof Expr.Phi))) {
                        p.pluck(true);

                        return true;
                    }
                }
            }

            return false;
        });
    };

    // propagate definitions with only one use to their users
    var propagate_def_single_use = function(defs) {
        return defs.iterate(function(def) {
            // TODO: exclude implicitly initialized exprs (idx 0) for the moment as there
            // is currently no assigned expression to propagate
            if ((def.idx !== 0) && (def.uses.length === 1)) {
                var p = def.parent;         // p is Expr.Assign
                var lhand = p.operands[0];  // def
                var rhand = p.operands[1];  // assigned expression

                var u = def.uses.pop();
                var c = rhand.clone(['idx', 'def']);

                u.replace(c);

                Simplify.reduce_stmt(c.parent_stmt());

                p.pluck(true);

                return true;
            }

            return false;
        });
    };

    return SSA;
}());