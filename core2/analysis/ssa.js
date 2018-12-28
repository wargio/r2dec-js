
module.exports = (function() {
    const Graph = require('core2/analysis/graph');
    const Stmt = require('core2/analysis/ir/statements');
    const Expr = require('core2/analysis/ir/expressions');

    function SSA(func) {
        this.func = func;
        this.cfg = func.cfg();
        this.dom = new Graph.DominatorTree(this.cfg);
    }

    // iterate all statements in block and collect only defined names
    var get_defs = function(selector, block) {
        var defs = [];

        var find_def = function(d) {
            for (var i = 0; i < defs.length; i++) {
                if (defs[i].equals_no_idx(d)) {
                    return i;
                }
            }

            return (-1);
        };

        block.statements.forEach(function(stmt) {
            stmt.expressions.forEach(function(expr) {
                expr.iter_operands().forEach(function(op) {
                    if (selector(op) && op.is_def) {
                        var idx = find_def(op);

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

    SSA.prototype.insert_phi_exprs = function(selector) {
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
                            args[i] = a.clone(['idx']);
                        }

                        // turn Node y into BasicBlock _y
                        var _y = node_to_block(this.func, y);

                        // insert the statement a = Phi(a, a, ..., a) at the top of block y, where the
                        // phi-function has as many arguments as y has predecessors
                        var phi_stmt = Stmt.make_statement(_y.address, new Expr.Assign(a.clone(['idx']), new Expr.Phi(args)));

                        // TODO: this is a workaround until we work with Containers
                        // <WORKAROUND>
                        _y.statements.unshift(phi_stmt);
                        phi_stmt.container = _y;
                        // </WORKAROUND>

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
                blk.statements.forEach(function(stmt) {
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

        var is_phi_assignment = function(stmt) {
            var expr = stmt.expressions[0];

            return (expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Phi);
        };

        var count = {};
        var stack = {};

        var defs = {};
        var uninit = new Stmt.Statement(0, []);

        var add_def = function(v) {
            var key = v.toString();

            if (key in defs) {
                console.log('[!]', key, 'is already defined');
            }

            defs[key] = v;
            v.uses = [];
        };

        var add_use = function(u) {
            var key = u.toString();

            // every used var is expected to be defined beforehand
            // if it was not, this is probably an architectural register
            // that is initialized implicitly, e.g. stack pointer, args regs, etc.
            if (!(key in defs)) {
                var uc = u.clone(['idx']);
                uc.is_def = true;
                uninit.expressions.push(uc);

                add_def(uc);
            }

            var def = defs[key];

            if (u.def !== undefined) {
                console.log('[!]', u, 'def should be assigned to "' + def + '", but expr already got "' + u.def + '"');
            }

            u.def = def;
            def.uses.push(u);
        };

        // <DEBUG>
        var parent_stmt = function(expr) {
            while (!(expr instanceof Stmt.Statement)) {
                expr = expr.parent[0];
            }

            return expr.addr.toString(16);
        };

        var padEnd = function(s, n) {
            return s + ' '.repeat(n - s.length);
        };

        var print_defs = function() {
            console.log('def-use chains:');
            for (var d in defs) {
                var _def = parent_stmt(defs[d]);
                var _use = defs[d].uses.map(parent_stmt);

                console.log('| ', padEnd(d, 20), '[' + _def + ']', ':', _use.join(', '));
            }
            console.log();
        };
        // </DEBUG>

        // get the top element of an array
        var top = function(arr) {
            return arr[arr.length - 1];
        };

        var rename = function(selector, n) {
            console.log('n:', n.toString());

            n.statements.forEach(function(stmt) {
                console.log('\u250f', '', 'stmt:', stmt.toString());

                console.log('\u2503', '  ', 'USE:');
                if (!is_phi_assignment(stmt)) {
                    stmt.expressions.forEach(function(expr) {
                        console.log('\u2503', '    ', 'expr:', expr.toString());

                        expr.iter_operands(true).forEach(function(op) {
                            console.log('\u2503', '      ', 'op:', op.toString());

                            if (selector(op) && !op.is_def) {
                                var repr = op.repr();

                                op.idx = top(stack[repr]);

                                console.log('\u2503', '        ', 'idx:', op.idx);
                                add_use(op);
                            }
                        });
                    });
                }

                console.log('\u2503', '  ', 'DEF:');
                stmt.expressions.forEach(function(expr) {
                    console.log('\u2503', '    ', 'expr:', expr.toString());

                    expr.iter_operands(true).forEach(function(op) {
                        console.log('\u2503', '      ', 'op:', op.toString());

                        if (selector(op) && op.is_def) {
                            var repr = op.repr();

                            count[repr]++;
                            stack[repr].push(count[repr]);

                            op.idx = top(stack[repr]);

                            console.log('\u2503', '        ', 'idx:', op.idx);
                            add_def(op);
                        }
                    });
                });

                console.log('\u2517', '', 'str:', stmt);
            });

            this.cfg.successors(block_to_node(this.cfg, n)).forEach(function(Y) {
                var j = this.cfg.predecessors(Y).indexOf(block_to_node(this.cfg, n));

                console.log('node', n, 'is the', j, 'th successor of', Y.toString(16));

                // iterate over all phi functions in Y
                node_to_block(this.func, Y).statements.forEach(function(stmt) {
                    if (is_phi_assignment(stmt)) {
                        var v = stmt.expressions[0].operands[0];

                        if (selector(v)) {
                            var phi = stmt.expressions[0].operands[1];
                            var op = phi.operands[j];

                            console.log('|  found a phi stmt', stmt, ', replacing its', j, 'arg');

                            op.idx = top(stack[op.repr()]);
                            add_use(op);
                        }
                    }
                });
            }, this);

            console.log('-'.repeat(15));

            this.dom.successors(block_to_node(this.dom, n)).forEach(function(X) {
                rename.call(this, selector, node_to_block(this.func, X));
            }, this);

            n.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
                            stack[op.repr()].pop();
                        }
                    });
                });
            });
        };

        // TODO: steps should be:
        //  o ssa from regs: add phis, relax phis
        //  o propagate stack pointer
        //  o ssa from derefs: add phis, replax phis
        //
        // relax phis:
        //  o propagate phi groups that have only one item in them
        //  o propagate self-referencing phis [i.e. x5 = Phi(x2, x5) --> x5 = x2]
        //  o propagate phi with single use that is another phi, combine them together

        this.func.uninitialized = uninit;

        var entry_block = node_to_block(this.func, this.dom.getRoot());

        // ssa from regs
        console.log('\u2501'.repeat(15), 'REGS', '\u2501'.repeat(15));
        var select_regs = function(x) { return (x instanceof Expr.Reg); };
        this.insert_phi_exprs(select_regs);
        initialize.call(this, select_regs, count, stack);
        rename.call(this, select_regs, entry_block);

        while (eliminate_def_zero_uses(defs)) { /* empty */ }

        count = {};
        stack = {};

        // ssa from derefs
        console.log('\u2501'.repeat(15), 'DEREFS', '\u2501'.repeat(15));
        var select_derefs = function(x) { return (x instanceof Expr.Deref); };
        this.insert_phi_exprs(select_derefs);
        initialize.call(this, select_derefs, count, stack);
        rename.call(this, select_derefs, entry_block);

        while (eliminate_def_zero_uses(defs)) { /* empty */ }

        print_defs();
        return defs;
    };

    var propagate_stack_locations = function(defs) {

    };

    var eliminate_def_zero_uses = function(defs) {
        var eliminate = [];
        
        for (var d in defs) {
            var def = defs[d];

            if ((def.idx !== 0) && (def.uses.length === 0)) {
                var p = def.parent[0];  // p is Expr.Assign
                var lhand = p.operands[0];
                var rhand = p.operands[1];

                // if has no possible side effects, eliminate
                if ((!(lhand instanceof Expr.Deref) || (rhand instanceof Expr.Phi)) && !(rhand instanceof Expr.Call)) { 
                    rhand.iter_operands().forEach(function(o) {
                        if (o.def !== undefined) {
                            var u = defs[o.def].uses;

                            u.splice(u.indexOf(o), 1);
                        }
                    });
                
                    p.pluck();
                    eliminate.push(d);
                }
            }
        }

        eliminate.forEach(function(d) {
            delete defs[d];
        });

        return (eliminate.length > 0);
    };

    // TODO: change regs to work with enum rather than names, so al~ah~ax~eax~rax

    // TODO: tag function calls arguments
    // TODO: propagate definitions with only one use to their users
    // TODO: eliminate duplicate phi arguments

    return SSA;
}());