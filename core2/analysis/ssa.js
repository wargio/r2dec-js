/* 
 * Copyright (C) 2018-2019 elicn
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
    const Graph = require('core2/analysis/graph');
    const Stmt = require('core2/analysis/ir/statements');
    const Expr = require('core2/analysis/ir/expressions');

    /**
     * Management object for SSA context.
     * @constructor
     */
    function Context(ssa) {
        this.func = ssa.func;
        this.cfg = ssa.cfg;

        this.count = {};
        this.stack = {};
        this.defs = {};

        this.uninit = new Stmt.Container(0, []);
    }

    // intialize 'count' and 'stack' to be used in the renaming process
    Context.prototype.initialize = function(func, selector) {
        var count = {};
        var stack = {};

        func.basic_blocks.forEach(function(blk) {
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

        this.count = count;
        this.stack = stack;
    };

    Context.prototype.add_def = function(v) {
        // string representation of definition, including ssa subscripts
        var key = v.toString();

        if (key in this.defs) {
            console.warn('[!]', key, 'was already defined');
        }

        this.defs[key] = v;
        v.uses = [];
    };

    Context.prototype.add_use = function(u) {
        // string representation of user, including ssa subscripts
        var key = u.toString();

        // every used var is expected to be defined beforehand. if it was not,
        // that is probably an architectural register that is initialized implicitly.
        // in x86 architecture that would be the stack pointer, function arguments, etc.
        if (!(key in this.defs)) {
            // uninitialized variable assigned with index 0
            var lhand = u.clone(['idx']);

            // default value: this is merely a placeholder and should be replaced
            var rhand = new Expr.Val(0, u.size);

            // all definitions should appear as assignments
            var assign = new Expr.Assign(lhand, rhand);

            this.uninit.push_stmt(Stmt.make_statement(new Expr.Val(0).value, assign));
            this.add_def(lhand);
        }

        var def = this.defs[key];

        if (u.def !== undefined) {
            console.log('[!] definition for user', u, 'was already assigned');
        }

        u.def = def;
        def.uses.push(u);
    };

    Context.prototype.iterate = function(func) {
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

    Context.prototype.get_local_defs = function() {
        var local_defs = {};

        for (var d in this.defs) {
            var def = this.defs[d];
            var def_container = def.parent_stmt().parent;

            if (!(def_container in local_defs)) {
                local_defs[def_container] = [];
            }

            local_defs[def_container].push(def);
        }

        return local_defs;
    };

    var _parent_def = function(expr) {
        for (var p = expr.parent; p instanceof Expr.Expr; p = p.parent) {
            if (p instanceof Expr.Assign) {
                return p.operands[0];
            }
        }

        return null;
    };

    var _is_weak_use = function(expr) {
        var def = _parent_def(expr);

        return def && (def instanceof Expr.Reg) && (def.weak);
    };

    Context.prototype.get_live_ranges = function(block, ignore_weak) {
        var local_defs = this.get_local_defs();

        var _get_block_live_ranges = function(block, live_at_entry) {
            var curr_container = block.container;

            var locals = local_defs[curr_container] || [];

            // sort local definitions by their address, so later definitions appear
            // later on the list
            locals.sort(function(d0, d1) {
                var addr0 = d0.parent_stmt().address;
                var addr1 = d1.parent_stmt().address;

                return addr0.sub(addr1);
            });

            var live = Array.prototype.concat(live_at_entry, locals);

            return live.map(function(def) {
                // keep uses that are in the same block as the definition that they kill, and not weak (in case ignoring weak).
                // weak uses are normally a result of artificial assignemtns generated to represent side effects (e.g. overlapping
                // registers in x86 arch)
                var killing = def.uses.filter(function(use) {
                    var use_container = use.parent_stmt().parent;

                    return (use_container === curr_container) && !(ignore_weak && _is_weak_use(use));
                });

                var earliest = null;

                // find the earliest expression that kills def (if any)
                if (killing.length > 0) {
                    earliest = killing.reduce(function(a, b) {
                        var a_address = a.parent_stmt().address;
                        var b_address = b.parent_stmt().address;

                        return b_address.lt(a_address) ? b : a;
                    }, killing[0]);
                }

                // definition and its earliest user; if no such user (null), it means this
                // definition is still alive
                return [def, earliest];
            });
        };

        var _concat_no_dups = function(arrays) {
            var unique = function(elem, i, arr) {
                return arr.indexOf(elem) === i;
            };

            return Array.prototype.concat.apply([], arrays).filter(unique);
        };

        var visited_blocks = [];

        var _ascend_cfg = function(curr) {
            if (visited_blocks.indexOf(curr) !== (-1)) {
                return [];
            }

            visited_blocks.push(curr);

            // ascend cfg recursively: get predecessors' lives on exit
            var live_at_entry;
            var curr_block = node_to_block(this.func, curr);

            if (curr_block === this.func.entry_block) {
                live_at_entry = this.uninit.statements.map(function(stmt) {
                    return stmt.expressions[0].operands[0];
                });
            } else {
                var live_only = function(rng) {
                    return (rng[1] === null);
                };

                // get definitions that have no killing users, i.e. are still alive
                live_at_entry = _concat_no_dups(this.cfg.predecessors(curr).map(function(pred) {
                    return _ascend_cfg.call(this, pred).filter(live_only).map(function(rng) {
                        return rng[0];
                    });
                }, this));
            }

            return _get_block_live_ranges(curr_block, live_at_entry);
        };

        var live_ranges = _ascend_cfg.call(this, block_to_node(this.cfg, block));

        // <DEBUG>
        // console.log('live ranges for:', block.address.toString(16));
        // live_ranges.forEach(function(rng) {
        //     var s = rng[0].toString();
        //     var info = rng[1] === null ? 'live' : 'killed at: ' + rng[1].parent_stmt().address.toString(16);
        //
        //     console.log(' ', s + ' '.repeat(32 - s.length), '[', info, ']');
        // });
        // </DEBUG>

        return live_ranges;
    };

    Context.prototype.validate = function() {
        console.log('validating ssa context');

        // iterate through all expressions in function:
        // - if a definition: make sure it is registered in context defs
        // - if a use: make sure it is attached to a valid definition, which in turn has it on its uses list
        this.func.basic_blocks.forEach(function(blk) {
            blk.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands().forEach(function(op) {
                        if ((op instanceof Expr.Reg) || (op instanceof Expr.Deref)) {
                            if (op.is_def) {
                                if (!(op in this.defs)) {
                                    console.log('[!] missing def for:', op);
                                    console.log('    parent statement:', op.parent_stmt());
                                }
                            } else {
                                if (op.def === undefined) {
                                    console.log('[!] use without an assigned def:', op);
                                    console.log('    parent statement:', op.parent_stmt());
                                } else {
                                    if (op.def.uses.indexOf(op) === (-1)) {
                                        console.log('[!] unregistered use:', op);
                                        console.log('    parent statement:', op.parent_stmt());
                                    }
                                }
                            }
                        }
                    }, this);
                }, this);
            }, this);
        }, this);

        // iterate through all definitions registered in context defs:
        // - make sure there are no orphand definitions (i.e. pruned from function but not from context)
        // - make sure all uses are attached appropriately to their definition
        for (var d in this.defs) {
            var v = this.defs[d];

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

    Context.prototype.toString = function() {
        var _get_stmt_addr = function(expr) {
            var p = expr.parent_stmt();
    
            return p ? p.address.toString(16) : '?';
        };

        var _padEnd = function(s, n) {
            var padlen = n - s.length;

            return s + (padlen > 0 ? ' '.repeat(padlen) : '');
        };

        var header = ['\u250f', '', 'def-use chains:'].join(' ');

        var table = Object.keys(this.defs).map(function(d) {
            var _def = _get_stmt_addr(this.defs[d]);
            var _use = this.defs[d].uses.map(_get_stmt_addr);

            return ['\u2503', '  ', _padEnd(d, 32), '[' + _def + ']', ':', _use.join(', ')].join(' ');
        }, this);

        var footer = ['\u2517'];

        return Array.prototype.concat(header, table, footer).join('\n');
    };

    function SSA(func) {
        this.func = func;
        this.cfg = func.cfg();
        this.dom = new Graph.DominatorTree(this.cfg);
        this.context = new Context(this);
    }

    // iterate all statements in block and collect only defined names
    var _find_local_defs = function(selector, block) {
        var defs = [];

        // <POLYFILL>
        defs.findIndex = function(predicate) {
            for (var i = 0; i < this.length; i++) {
                if (predicate(this[i])) {
                    return i;
                }
            }

            return (-1);
        };
        // </POLYFILL>

        block.container.statements.forEach(function(stmt) {
            stmt.expressions.forEach(function(expr) {
                expr.iter_operands().forEach(function(op) {
                    if (selector(op) && op.is_def) {
                        // see if op was already defined
                        var idx = defs.findIndex(function(d) {
                            return d.equals_no_idx(op);
                        });

                        // if already defined, remove old def and use the new one instead
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

    var insert_phi_exprs = function(selector) {
        var defs = {};
        var blocks = this.func.basic_blocks;

        // map a block to its list of definitions
        blocks.forEach(function(blk) {
            defs[blk] = _find_local_defs(selector, blk);
        });

        // JS causes defsites keys to be stored as strings. since we need the definitions
        // expressions themselves, we need to maintain a dedicated array for that.
        var defsites_vals = {};
        var defsites_keys = [];

        // map a variable to blocks where it is defined
        blocks.forEach(function(blk) {
            var block_defs = defs[blk];

            block_defs.forEach(function(d) {
                if (!(d in defsites_vals)) {
                    defsites_keys.push(d);
                    defsites_vals[d] = [];
                }

                defsites_vals[d].push(blk);
            });
        });

        var phis = {};

        for (var a in defsites_keys) {
            a = defsites_keys[a];       // a: definition expression
            var W = defsites_vals[a];   // W: an array of blocks where 'a' is defined

            while (W.length > 0) {
                // defsites value list elements are basic blocks, while domTree accepts nodes
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
                        var phi_assignment = new Expr.Assign(a.clone(['idx', 'def']), new Expr.Phi(args));
                        var phi_stmt = Stmt.make_statement(_y.address, phi_assignment);

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

    /** @private */
    SSA.prototype._rename = function(selector) {

        // predicate to determine whether an expression is a phi definition
        var is_phi_assignment = function(expr) {
            return (expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Phi);
        };

        // get the top element of an array
        var top = function(arr) {
            return arr[arr.length - 1];
        };

        var rename_rec = function(context, n) {
            n.container.statements.forEach(function(stmt) {
                // pick up uses to assign ssa index
                stmt.expressions.forEach(function(expr) {
                    if (!is_phi_assignment(expr)) {
                        expr.iter_operands(true).forEach(function(op) {
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
                                if (!(repr in context.stack)) {
                                    console.warn('[!] ssa: could not find stack for', '"' + repr + '"');
                                    context.stack[repr] = [0];
                                    context.count[repr] = 0;
                                }
                                // </WORKAROUND>

                                op.idx = top(context.stack[repr]);
                                context.add_use(op);
                            }
                        });
                    }
                });

                // pick up definitions to assign ssa index
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
                            var repr = op.repr();

                            context.count[repr]++;
                            context.stack[repr].push(context.count[repr]);

                            op.idx = top(context.stack[repr]);
                            context.add_def(op);
                        }
                    });
                });
            });

            this.cfg.successors(block_to_node(this.cfg, n)).forEach(function(Y) {
                var j = this.cfg.predecessors(Y).indexOf(block_to_node(this.cfg, n));

                // iterate over all phi functions in Y
                node_to_block(this.func, Y).container.statements.forEach(function(stmt) {
                    stmt.expressions.forEach(function(expr) {
                        if (is_phi_assignment(expr)) {
                            var v = expr.operands[0];

                            if (selector(v)) {
                                var phi = expr.operands[1];
                                var op = phi.operands[j];

                                op.idx = top(context.stack[op.repr()]);
                                context.add_use(op);
                            }
                        }
                    });
                });
            }, this);

            // descend the dominator tree recursively
            this.dom.successors(block_to_node(this.dom, n)).forEach(function(X) {
                rename_rec.call(this, context, node_to_block(this.func, X));
            }, this);

            // cleanup context stack of current block's definitions
            n.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
                            context.stack[op.repr()].pop();
                        }
                    });
                });
            });
        };

        var entry_block = node_to_block(this.func, this.dom.getRoot());

        this.context.initialize(this.func, selector);
        insert_phi_exprs.call(this, selector);
        rename_rec.call(this, this.context, entry_block);

        return this.context;
    };

    /** @private */
    SSA.prototype._rename_wrapper = function(selector) {
        var context = this._rename(selector);

        // phi relaxation
        propagate_single_phi(context);
        propagate_self_ref_phi(context);
        propagate_chained_phi(context);

        return context;
    };

    SSA.prototype.rename_regs = function() {
        var select_regs = function(expr) {
            return (expr instanceof Expr.Reg);
        };

        return this._rename_wrapper(select_regs);
    };

    SSA.prototype.rename_derefs = function() {
        var select_derefs = function(expr) {
            return (expr instanceof Expr.Deref);
        };

        return this._rename_wrapper(select_derefs);
    };

    // propagate phi groups that have only one item in them.
    // if a phi expression has only one argument, propagate it into defined variable
    //
    // x7 = Phi(x4) --> x7 = x4
    var propagate_single_phi = function(ctx) {
        return ctx.iterate(function(def) {
            var p = def.parent;         // p is Expr.Assign
            var lhand = p.operands[0];  // def
            var rhand = p.operands[1];  // assigned expression

            if ((rhand instanceof Expr.Phi) && (rhand.operands.length === 1)) {
                var phi_arg = rhand.operands[0];

                rhand.replace(phi_arg.pluck());
            }

            // this function always return false because it never plucks the
            // entire assignment, rather it just updates it
            return false;
        });
    };

    // propagate self-referencing phis.
    //
    //   x5 = Phi(x2, x5)  -->  x5 = x2
    var propagate_self_ref_phi = function(ctx) {
        return ctx.iterate(function(def) {
            var p = def.parent;         // p is Expr.Assign
            var lhand = p.operands[0];  // def
            var rhand = p.operands[1];  // assigned expression

            if ((rhand instanceof Expr.Phi) && (rhand.operands.length === 2)) {
                var other = null;

                // check which of the phi operands (if any) equals to the assigned variable
                if (rhand.operands[0].equals(lhand)) {
                    other = rhand.operands[1];
                } else if (rhand.operands[1].equals(lhand)) {
                    other = rhand.operands[0];
                }

                if (other) {
                    rhand.replace(other.pluck());
                }
            }

            // this function always return false because it never plucks the
            // entire assignment, rather it just updates it
            return false;
        });
    };

    // propagate a phi with only one use that happens to be also a phi
    var propagate_chained_phi = function(ctx) {
        return ctx.iterate(function(def) {
            var p = def.parent;         // p is Expr.Assign
            var lhand = p.operands[0];  // def
            var rhand = p.operands[1];  // assigned expression

            if ((rhand instanceof Expr.Phi) && (def.uses.length === 1)) {
                var u = def.uses[0];

                if (u.parent instanceof Expr.Phi) {
                    var target_phi = u.parent;

                    // remove propagted phi as it is going to be replaced with its operands
                    u.pluck(true);

                    for (var i = 0; i < rhand.operands.length; i++) {
                        var o = rhand.operands[i];

                        // propagate phi operands into its phi user, avoiding duplications
                        // TODO: not sure if we can safely discard duplicates or not
                        if (!target_phi.has(o)) {
                            target_phi.push_operand(o.clone(['idx', 'def']));
                        }
                    }

                    // detach propagated phi along of its operands
                    p.pluck(true);

                    return true;
                }
            }

            return false;
        });

    };

    SSA.prototype.preserved_locations = function() {
        var _get_origin = function(def) {
            if ((def === undefined) || (def.idx === 0)) {
                return def;
            }

            // def is a lhand of an assignment; get the assigned value
            var rhand = def.parent.operands[1];

            if ((rhand instanceof Expr.Reg) || (rhand instanceof Expr.Deref)) {
                return _get_origin(rhand.def);
            }

            return undefined;
        };

        var candidates = {};
        var local_defs = this.context.get_local_defs();

        // console.log('preserved_locations:');
        this.func.exit_blocks.forEach(function(block) {
            local_defs[block.container].forEach(function(def) {
                var origin = _get_origin(def);

                if (origin && def.equals_no_idx(origin)) {
                    var key = def.repr();

                    if (!(key in candidates)) {
                        candidates[key] = [def, []];
                    }

                    // console.log(' ', 'origin:', origin, '|', 'restored:', def);
                    candidates[key][1].push(origin);
                }
            });
        });

        var preserved = [];

        for (var c in candidates) {
            var def = candidates[c][0];
            var origins = candidates[c][1];

            var identical = function(o) {
                return o.equals(origins[0]);
            };

            if (origins.every(identical)) {
                preserved.push([def, origins[0]]);
            }
        }

        return this.context.preserved = preserved;
    };

    SSA.prototype.transform_out = function() {
        // TODO: handle phi statements
        // TODO: this should be done by iterating over ssa context, and not function blocks

        this.func.basic_blocks.forEach(function(bb) {
            bb.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands().forEach(function(op) {
                        if (op.idx !== undefined) {
                            op.idx = undefined;
                        }
                    });
                });
            });
        });
    };

    return SSA;
}());