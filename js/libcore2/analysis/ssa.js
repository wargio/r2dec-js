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

(function() {
    const Graph = require('js/libcore2/analysis/graph');
    const Cntr = require('js/libcore2/analysis/ir/container');
    const Stmt = require('js/libcore2/analysis/ir/statements');
    const Expr = require('js/libcore2/analysis/ir/expressions');

    /**
     * Management object for SSA context.
     * @constructor
     */
    function Context(func) {
        this.defs = {};
        this.uninit = new Cntr.Container(func.entry_block.container.address, []);
    }

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

            // this is an auto-generated assignment; mark as weak def
            lhand.weak = true;

            // default value: this is merely a placeholder and should be replaced
            var rhand = new Expr.Val(0, u.size);

            // all definitions should appear as assignments
            var assign = new Expr.Assign(lhand, rhand);

            this.uninit.push_stmt(Stmt.make_statement(undefined, assign));
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

    Context.prototype.toString = function() {
        var _get_stmt_addr = function(expr) {
            var p = expr.parent_stmt();

            return p ? p.address.toString(16) : '?';
        };

        var _maxlen = function(arr) {
            return arr.reduce(function(max, current) {
                return current.length > max ? current.length : max;
            }, 0);
        };

        var _toStringArray = function(arr) {
            return '[' + arr.join(', ') + ']';
        };

        var table = Object.keys(this.defs).map(function(d) {
            var def = this.defs[d];
            var def_loc = _get_stmt_addr(def);              // address of definition
            var use_locs = def.uses.map(_get_stmt_addr);    // list of users addresses

            return {
                name    : d,
                defined : def_loc,
                used    : use_locs,
                color   : def.weak ? ['\033[90m', '\033[0m'] : ['', '']
            };
        }, this);

        var names_maxlen = _maxlen(table.map(function(obj) { return obj.name; })) + 2;
        var addrs_maxlen = _maxlen(table.map(function(obj) { return obj.defined; }));

        var header = ['def-use chains:'];

        var lines = table.map(function(obj) {
            return [
                obj.color[0],
                obj.name.padEnd(names_maxlen),
                obj.defined.padStart(addrs_maxlen),
                ':',
                _toStringArray(obj.used),
                obj.color[1]
            ].join(' ');
        });

        return Array.prototype.concat(header, lines).join('\n');
    };

    function LiveRange(def, killing) {
        this.def = def;         // a definition
        this.killing = killing; // the definition that kills it on current cfg path
    }

    // check whether the definition precedes a specified expression in cfg
    LiveRange.prototype.is_defined_by = function(expr) {
        var def_pstmt = this.def.parent_stmt();
        var exp_pstmt = expr.parent_stmt();

        // live ranges are collected recursively along backward cfg walk. for that reason, all
        // definitions defined in another block are guaranteed to precede expr. a definition that
        // is defined at the same block, should be defined in an earlier address
        //
        // the only exception for that are phi assignments, that may appear on the same address
        // in case the fcall is the first statement on the block
        return (def_pstmt.parent !== exp_pstmt.parent)
            || def_pstmt.address.lt(exp_pstmt.address)
            || (def_pstmt.address.eq(exp_pstmt.address) && (this.def.parent.operands[1] instanceof Expr.Phi));
    };

    // check whether the definition is still alive when reaching specified expression
    LiveRange.prototype.is_alive_by = function(expr) {
        if (this.killing !== null) {
            var kill_pstmt = this.killing.parent_stmt();
            var exp_pstmt = expr.parent_stmt();

            return (kill_pstmt.parent !== exp_pstmt.parent) || kill_pstmt.address.ge(exp_pstmt.address);
        }

        return true;
    };

    // get definition (if any) that is assigned to the enclosing expression.
    // for example, get `def` for the specified `expr`:
    //      def = Expr(..., Expr(..., Expr(..., expr)))
    var _parent_def = function(expr) {
        for (var p = expr.parent; p instanceof Expr.Expr; p = p.parent) {
            if (p instanceof Expr.Assign) {
                return p.operands[0];
            }
        }

        return null;
    };

    // used in an expression that is assigned to a weak def
    var _is_weak_use = function(expr) {
        var def = _parent_def(expr);

        return def && (def instanceof Expr.Reg) && (def.weak);
    };

    LiveRange.prototype.is_unused_by = function(expr) {
        var exp_pstmt = expr.parent_stmt();

        return this.def.uses.every(function(u) {
            var use_pstmt = u.parent_stmt();
            var unused = false;

            if (use_pstmt.parent === exp_pstmt.parent) {
                unused = use_pstmt.address.ge(exp_pstmt.address);
            } else {
                // TODO: this is a partial implementation; if not in the same block, search recursively backwards.
                // this should check whether all uses occur after expr in cfg. this can be done by recording the cfg
                // path along the way when building context, and see whether the use appears there (occures ealier)
                // or not (occures afterwards). since this is not implemented yet, we check for phi uses, which are
                // the common case for late use.
                var def = _parent_def(u);

                unused = def && (def.parent.operands[1] instanceof Expr.Phi);
            }

            return unused || _is_weak_use(u);
        });
    };

    LiveRange.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.def.toString(),
            this.killing === null ? 'null' : this.killing.toString()
        ];

        return '[' + repr.join(' ') + ']';
    };

    function SSA(func) {
        this.func = func;
        this.cfg = func.cfg();
        this.dom = new Graph.DominatorTree(this.cfg);
        this.context = new Context(func);
    }

    // iterate all statements in block and collect only defined names
    var _find_local_defs = function(selector, block) {
        var defs = [];

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

    var insert_phis = function(selector) {
        var func = this.func;
        var cfg = this.cfg;
        var dom = this.dom;

        var defs = {};

        // map a block to its list of definitions
        func.basic_blocks.forEach(function(blk) {
            defs[blk] = _find_local_defs(selector, blk);
        });

        // JS causes defsites keys to be stored as strings. since we need the definitions
        // expressions themselves, we need to maintain a dedicated array for that.
        var defsites = {
            vals : {},
            keys : []
        };

        // map a variable to blocks where it is defined
        func.basic_blocks.forEach(function(blk) {
            var block_defs = defs[blk];

            block_defs.forEach(function(d) {
                if (!(d in defsites.vals)) {
                    defsites.keys.push(d);
                    defsites.vals[d] = [];
                }

                defsites.vals[d].push(blk);
            });
        });

        var phis = {};

        for (var a in defsites.keys) {
            a = defsites.keys[a];       // a: definition expression
            var W = defsites.vals[a];   // W: an array of blocks where 'a' is defined

            while (W.length > 0) {
                // defsites value list elements are basic blocks, while domTree accepts nodes
                var n = block_to_node(dom, W.pop());

                dom.dominanceFrontier(n).forEach(function(y) {
                    if (!(y in phis)) {
                        phis[y] = [];
                    }

                    // if 'a' has no phi statement in current block, create one
                    if (phis[y].indexOf(a) === (-1)) {
                        var args = new Array(cfg.predecessors(y).length);

                        // duplicate 'a' as many times as 'y' has predecessors. note that the
                        // ssa index of the cloned expression is preserved, since memory dereferences
                        // may be enclosing indexed expressions
                        for (var i = 0; i < args.length; i++) {
                            args[i] = a.clone(['idx', 'def', 'is_safe', 'weak']);
                        }

                        var phi_var = a.clone(['idx', 'def', 'is_safe', 'weak']);

                        // phi variables are artificial and may be safely eliminated
                        // phi_var.weak = true;

                        // turn Node y into BasicBlock _y
                        var _y = node_to_block(func, y);

                        // insert the statement a = Phi(a, a, ..., a) at the top of block y, where the
                        // phi-function has as many arguments as y has predecessors
                        var phi_assignment = new Expr.Assign(phi_var, new Expr.Phi(args));
                        var phi_stmt = Stmt.make_statement(_y.address, phi_assignment);

                        // insert phi at the beginning of the container
                        _y.container.unshift_stmt(phi_stmt);

                        phis[y].push(a);
                        if (defs[_y].indexOf(a) === (-1)) {
                            W.push(_y);
                        }
                    }
                });
            }
        }
    };

    var rename = function(selector) {

        // predicate to determine whether an expression is a phi definition
        var is_phi_assignment = function(expr) {
            return (expr instanceof Expr.Assign) && (expr.operands[1] instanceof Expr.Phi);
        };

        /**
         * Get the top element of array
         * @param {Array} arr Array
         * @returns {Object} Top element of `arr`
         */ 
        var top = function(arr) {
            return arr[arr.length - 1];
        };

        var func = this.func;
        var cfg = this.cfg;
        var dom = this.dom;
        var ctx = this.context;

        var count = {};
        var stack = {};

        // intialize 'count' and 'stack' to be used in the renaming process
        var rename_init = function() {
            func.basic_blocks.forEach(function(bb) {
                bb.container.statements.forEach(function(stmt) {
                    stmt.expressions.forEach(function(expr) {
                        expr.iter_operands(true).forEach(function(op) {
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

        var rename_rec = function(block) {
            block.container.statements.forEach(function(stmt) {
                // pick up uses to assign ssa index
                stmt.expressions.forEach(function(expr) {
                    if (!is_phi_assignment(expr)) {
                        expr.iter_operands(true).forEach(function(op) {
                            if (selector(op) && !op.is_def) {
                                var repr = op.repr();

                                // <WORKAROUND>
                                if (!(repr in count)) {
                                    console.warn('[!] ssa: could not find stack for', '"' + repr + '" (use)');
                                    count[repr] = 0;
                                    stack[repr] = [];
                                }
                                // </WORKAROUND>

                                op.idx = top(stack[repr]);
                                ctx.add_use(op);
                            }
                        });
                    }
                });

                // pick up definitions to assign ssa index
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
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
                            if (!(repr in count)) {
                                console.warn('[!] ssa: could not find stack for', '"' + repr + '" (def)');
                                count[repr] = 0;
                                stack[repr] = [];
                            }
                            // </WORKAROUND>

                            count[repr]++;
                            stack[repr].push(count[repr]);

                            op.idx = top(stack[repr]);
                            ctx.add_def(op);
                        }
                    });
                });
            });

            cfg.successors(block_to_node(cfg, block)).forEach(function(Y) {
                var j = cfg.predecessors(Y).indexOf(block_to_node(cfg, block));

                // iterate over all phi functions in Y
                node_to_block(func, Y).container.statements.forEach(function(stmt) {
                    stmt.expressions.forEach(function(expr) {
                        if (is_phi_assignment(expr)) {
                            var v = expr.operands[0];

                            if (selector(v)) {
                                var phi = expr.operands[1];
                                var op = phi.operands[j];

                                op.idx = top(stack[op.repr()]);
                                ctx.add_use(op);
                            }
                        }
                    });
                });
            });

            // descend the dominator tree recursively
            dom.successors(block_to_node(dom, block)).forEach(function(X) {
                rename_rec(node_to_block(func, X));
            });

            // cleanup context stack of current block's definitions
            block.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    expr.iter_operands(true).forEach(function(op) {
                        if (selector(op) && op.is_def) {
                            stack[op.repr()].pop();
                        }
                    });
                });
            });
        };

        var entry_block = node_to_block(func, dom.getRoot());

        insert_phis.call(this, selector);
        rename_init();
        rename_rec(entry_block);
        relax_phis(ctx);

        return ctx;
    };

    SSA.prototype.rename_regs = function() {
        var select_regs = function(expr) {
            // pick up only registers and avoid variables (currently Var inherits Reg)
            // Var exprs may exist at that point if function has reg arguments
            return (expr instanceof Expr.Reg) && !(expr instanceof Expr.Var);
        };

        return rename.call(this, select_regs);
    };

    SSA.prototype.rename_derefs = function() {
        var select_derefs = function(expr) {
            return (expr instanceof Expr.Deref);
        };

        return rename.call(this, select_derefs);
    };

    SSA.prototype.rename_vars = function() {
        var select_vars = function(expr) {
            return (expr instanceof Expr.Var);
        };

        return rename.call(this, select_vars);
    };

    // propagate phi groups that have only one item in them.
    // if a phi expression has only one argument, propagate it into defined variable
    //
    // x₃ = Φ(x₂) --> x₃ = x₂
    var simplify_single_phi = function(ctx) {
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

    // propagate self-referencing phis with two arguments; this is common in loops
    // e.g. x₃ = Φ(x₂, x₃) --> x₃ = x₂
    var simplify_self_ref_phi = function(ctx) {
        return ctx.iterate(function(def) {
            var p = def.parent;         // p is Expr.Assign
            var lhand = p.operands[0];  // def
            var rhand = p.operands[1];  // assigned expression

            if ((rhand instanceof Expr.Phi) && (rhand.operands.length === 2)) {
                var phi_arg1 = rhand.operands[0];
                var phi_arg2 = rhand.operands[1];

                // check which of the phi operands (if any) equals to the defined variable
                // and use the other one to replace the entire phi expression
                if (phi_arg1.equals(lhand)) {
                    rhand.replace(phi_arg2.pluck());
                } else if (phi_arg2.equals(lhand)) {
                    rhand.replace(phi_arg1.pluck());
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

    var relax_phis = function(ctx) {
        simplify_single_phi(ctx);
        simplify_self_ref_phi(ctx);
        // propagate_chained_phi(ctx);
    };

    SSA.prototype.get_local_contexts = function(ignore_weak) {
        var func = this.func;
        var cfg = this.cfg;
        var uninit = this.context.uninit;

        var contexts = {};

        var _get_locals = function(block) {
            var locals = block.container.statements.map(function(stmt) {
                var assigns = stmt.expressions.filter(function(expr) {
                    return (expr instanceof Expr.Assign);
                });

                // extract lhand expression from assignment
                return assigns.map(function(assign) {
                    return assign.operands[0];
                });
            });
    
            return Array.prototype.concat.apply([], locals);
        };

        var _get_entry = function(block) {
            var node = block_to_node(cfg, block);
            var preds = cfg.predecessors(node);

            // prevent endless recursion: set current block's entry to empty list
            // so subsequent calls would not re-enter this function
            contexts[block].__entry = [];

            // collect incoming definitions; i.e. exit contexts of predecessors
            var incoming = preds.map(function(pred) {
                return contexts[node_to_block(func, pred)].exit;
            });

            // node is the function entry block; inherit definitions from uninit
            if (preds.length === 0) {
                var uninit_defs = uninit.statements.map(function(stmt) {
                    return stmt.expressions[0].operands[0];
                });

                return uninit_defs;
            }

            // node has only one predecessor; inherit its definition
            else if (preds.length === 1) {
                return incoming[0];
            }

            // node has multiple predecessors; inherit definitions that exist in
            // the intersection of all predecessors' exit contexts
            else {
                // find the shortest list in a list of lists
                var __shortest_list = function(shortest, current) {
                    return current.length < shortest.length ? current : shortest;
                };

                // iterate over the shortest exit context to find intersecting defs
                // across all incoming exit contexts
                return incoming.reduce(__shortest_list).filter(function(def) {
                    return incoming.every(function(list) {
                        return (list.indexOf(def) !== (-1));
                    });
                });
            }
        };

        var _get_live_ranges = function(block) {
            var ctx = contexts[block];
            var locals = ctx.locals;

            var local_names = locals.map(function(def) {
                return (ignore_weak && def.weak ? null : def.repr());
            });

            var ranges_entry = ctx.entry.map(function(def) {
                const idx = local_names.indexOf(def.repr());

                return new LiveRange(def, idx === (-1) ? null : locals[idx]);
            });

            var ranges_locals = locals.map(function(def, i) {
                const idx = local_names.slice(i + 1).indexOf(def.repr());

                return new LiveRange(def, idx === (-1) ? null : locals[idx + i + 1]);
            });

            return ranges_entry.concat(ranges_locals);
        };

        var _get_exit = function(block) {
            var ctx = contexts[block];
            var locals = ctx.locals;

            // collect locally defined names; filter out weak definitions
            // if requried
            var local_names = locals.map(function(def) {
                return (ignore_weak && def.weak) ? null : def.repr();
            });
    
            // filter out definitions whose name is shadowed by a locally defined name.
            // keep only non-shadowed entry defs
            var nshdw_entry_defs = ctx.entry.filter(function(def) {
                return (local_names.indexOf(def.repr()) === (-1));
            });

            // filter out local definitions that are shadowed by other ones that are
            // defined later in the same block. keep only non-shadowed local defs
            var nshdw_local_defs = locals.filter(function(def, i) {
                return (local_names.slice(i + 1).indexOf(def.repr()) === (-1));
            });

            return nshdw_entry_defs.concat(nshdw_local_defs);
        };
    
        func.basic_blocks.forEach(function(block) {
            // local context of current block
            var ctx = {};

            // a utility function that generates a getter function. the getter
            // function first looks for cached data to return. if such dataexists,
            // the getter function return it. if not, it calls the handler function,
            // caches the result and then returns it
            var _cached_property_getter = function(cached, handler) {
                return function() {
                    // console.log('ctx' + block.toString() + '.' + cached, '=', '{');

                    if (!(cached in ctx)) {
                        ctx[cached] = handler(block);
                    }

                    // ctx[cached].forEach(function(d) {
                    //     console.log('  ', d.toString());
                    // });
                    //
                    // console.log('}');
                    // console.log();

                    return ctx[cached];
                };
            };

            Object.defineProperties(ctx, {
                // an array of expressions defined locally
                'locals' : {
                    get : _cached_property_getter('__locals', _get_locals)
                },

                // an array of definitions that are live on block's entry (aggregated)
                'entry' : {
                    get : _cached_property_getter('__entry', _get_entry)
                },

                // an array of live ranges
                'live_ranges' : {
                    get : _cached_property_getter('__live_ranges', _get_live_ranges)
                },

                // an array of definitions that are live on block's exit (aggregated)
                'exit' : {
                    get : _cached_property_getter('__exit', _get_exit)
                }
            });

            contexts[block] = ctx;
        });

        return contexts;
    };

    SSA.prototype.preserved_locations = function(contexts) {
        /**
         * Recursively trace a definition back to its origin definition.
         * @param {Expr} def Defined expression to trace
         * @returns {Expr} Returns the origin definition, or `undefiend` if
         * origin could not be traced back directly from specified definition
         */
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

        for (var ctx in contexts) {
            var locals = contexts[ctx].locals;

            locals.forEach(function(def) {
                if (def.idx !== 0) {
                    var origin = _get_origin(def);

                    if (origin && def.equals_no_idx(origin)) {
                        var key = def.repr();

                        if (!(key in candidates)) {
                            candidates[key] = [def, []];
                        }

                        candidates[key][1].push(origin);
                    }
                }
            });
        }

        var preserved = [];

        for (var cnd in candidates) {
            var def = candidates[cnd][0];
            var origins = candidates[cnd][1];

            var identical = function(o) {
                return o.equals(origins[0]);
            };

            if (origins.every(identical)) {
                preserved.push([def, origins[0]]);
            }
        }

        // <DEBUG>
        // console.log('preserved_locations:');
        // preserved.forEach(function(p) {
        //     console.log(' ', p[1], '->', p[0]);
        // });
        // </DEBUG>

        return preserved;
    };

    SSA.prototype.validate = function(ctx) {
        var warnings = {};

        var _warn = function(msg, expr) {
            var pstmt = expr.parent_stmt() || 'unknown';

            if (!(pstmt in warnings)) {
                warnings[pstmt] = [];
            }

            warnings[pstmt].push({
                msg:  msg,
                expr: expr
            });
        };

        var _is_assignable = function(expr) {
            return (expr instanceof Expr.Reg) || (expr instanceof Expr.Deref) || (expr instanceof Expr.Var);
        };

        var defs = ctx.defs;

        // iterate through all expressions in function:
        // - if a definition: make sure it is registered in context defs
        // - if a use: make sure it is attached to a valid definition, which in turn has it on its uses list
        this.func.basic_blocks.forEach(function(blk) {
            blk.container.statements.forEach(function(stmt) {
                stmt.expressions.forEach(function(expr) {
                    if (expr instanceof Expr.Assign) {
                        var lhand = expr.operands[0];

                        if (_is_assignable(lhand)) {
                            if (!lhand.is_def) {
                                _warn('assigned expression not marked as def', expr);
                            }
                        } else {
                            _warn('assigning to a non-assignable expression', expr);
                        }
                    }

                    expr.iter_operands().forEach(function(op) {
                        if (_is_assignable(op)) {
                            if (op.is_def) {
                                if (!(op in defs)) {
                                    _warn('missing def for', op);
                                }
                            } else {
                                if (op.def === undefined) {
                                    _warn('use without an assigned def', op);
                                } else {
                                    if (op.def.parent.parent === undefined) {
                                        _warn('dangling def regitration', op);
                                    }

                                    if (op.def.uses.indexOf(op) === (-1)) {
                                        _warn('unregistered use', op);
                                    }
                                }
                            }
                        }
                    });
                });
            });
        });

        // iterate through all definitions registered in context defs:
        // - make sure there are no orphand definitions (i.e. pruned from function but not from context)
        // - make sure all uses are attached appropriately to their definition
        for (var d in defs) {
            var v = defs[d];

            if (v.parent_stmt() === undefined) {
                _warn('stale def:', v);
            }

            v.uses.forEach(function(u, i) {
                if (!(u.def.equals(v))) {
                    _warn('stale use ' + '[' + i + ']', v);
                }
            });
        }

        // display warnings
        // console.log('validating ssa context');
        for (var key in warnings) {
            console.log('[!]', key, ':');

            warnings[key].forEach(function(witem) {
                console.log('   ', witem.msg, ':', witem.expr);
            });
        }
    };

    SSA.prototype.transform_out = function(ctx) {
        ctx.iterate(function(def) {
            var p = def.parent;         // p is Expr.Assign
            var lhand = p.operands[0];  // def
            var rhand = p.operands[1];  // assigned expression

            // remove subscripts from users
            lhand.uses.forEach(function(u) {
                if (u.idx !== undefined) {
                    u.idx = undefined;
                }
            });

            // remove subscripts from definition
            lhand.idx = undefined;

            // remove phis
            if (rhand instanceof Expr.Phi) {
                p.pluck(true);

                return true;
            }

            return false;
        });
    };

    return SSA;
});