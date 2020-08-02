/* 
 * Copyright (C) 2019-2020 elicn
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
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Stmt = require('js/libcore2/analysis/ir/statements');
    const Cntr = require('js/libcore2/analysis/ir/container');
    const Simplify = require('js/libcore2/analysis/ir/simplify');

    /**
     * Loop information object
     * @typedef {Object} LoopInfo
     * @property {Node} head Loop entry node
     * @property {Node} tail Circle-back node
     * @property {Array.<Node>} body Array of nodes contained in loop, including `head` and `tail`
     * @property {Array.<Node>} exits Array of nodes outside the loop which body nodes jump or fallthrough into
     * @inner
     */

    function ControlFlow(func, conf) {
        this.func = func;
        this.conf = conf;

        var _to_container = function(node) {
            return node.key.container;
        };

        // replace all nodes of a graph while keeping the hierarchy
        var _translate_graph = function(g, trfunc) {
            var nodes = [];
            var edges = [];

            g.nodes.forEach(function(u) {
                var _u = trfunc(u);

                nodes.push(_u);

                var succ = g.successors(u).map(function(v) {
                    return [_u, trfunc(v)];
                });

                Array.prototype.push.apply(edges, succ);
            });

            return new Graph.Directed(nodes, edges, trfunc(g.root));
        };

        // translate basic blocks cfg into containers cfg: same hierarchy, different keys
        this.cfg = _translate_graph(func.cfg(), _to_container);

        /** @type {Array.<LoopInfo>} */
        this.loops = [];
    }

    // get a function container from a graph node
    var node_to_container = function(node) {
        return node.key;
    };

    // get a graph node from a function container
    var container_to_node = function(g, container) {
        return g.getNode(container);
    };

    // retrieve the address of the basic block represented by the specified node
    var addrOf = function(node) {
        return node_to_container(node).address;
    };

    ControlFlow.prototype.fallthroughs = function() {
        this.func.basic_blocks.forEach(function(bb) {
            // N --> M
            var n = bb;
            var m = ((n.fail && this.func.getBlock(n.fail))
                || (n.jump && this.func.getBlock(n.jump)));

            if (m) {
                n.container.set_fallthrough(m.container);
            }
        }, this);
    };

    // blocks with no explicit branching or jumps fall through to the next block.
    // adding a Goto statement to such blocks would guarantee a terminator statement
    // and reflect the branching behavior explicitly on the output code
    ControlFlow.prototype.missing_gotos = function() {
        this.func.basic_blocks.forEach(function(bb) {
            var term = bb.container.terminator();

            if (!term && bb.jump) {
                term = new Stmt.Goto(undefined, new Expr.Val(bb.jump));

                bb.container.push_stmt(term);
            }
        });
    };
    
    // <DEBUG>
    // var ArrayToString = function(a, opt) {
    //     return '[' + a.map(function(d) {
    //         return d.toString(opt);
    //     }).join(', ') + ']';
    // };
    //
    // var ObjAddrToString = function(o, opt) {
    //     return o ? o.address.toString(opt) : o;
    // };
    // </DEBUG>

    /**
     * Get loop information based on detected head and tail nodes.
     * @param {Node} head Loop entry node
     * @param {Node} tail Circle-back node
     * @param {Graph.Directed} cfg Function control flow graph
     * @returns {LoopInfo} Loop information object
     */
    var _construct_loop = function(head, tail, cfg) {
        // the loop body consists of all the nodes that can reach back the
        // loop head. to know whether there is a path from some node S to another
        // node T, we need a DFS traveresal starting from S; if T is picked up
        // then there is a path. that is, a dedicated DFS traversal for each node
        // in the graph, or at least for all nodes that are dominated by the loop
        // head.
        //
        // to avoid that many DFS traversals, we just reverse the graph starting
        // from the loop head and perform a DFS traversal only once. all the nodes
        // that are picked up are known to be reached from loop head in the reversed
        // graph, which means the loop head is reached from each one of them in
        // the original one.
        //
        // note: that is normally done with a post-dominator tree, which features
        // a reversed dfs tree

        // build a reversed cfg starting from loop head
        var rcfg = cfg.reversed(head.key);

        // prune all other back edges (if any) except the one that led us here. this
        // is essential to distinguish nested loops that share the same loop head
        rcfg.successors(head).forEach(function(succ) {
            if (succ.key !== tail.key) {
                rcfg.delEdge([head.key, succ.key]);
            }
        });

        // build a dfs tree from the pruned reversed cfg; this would let us
        // know which nodes are in the loop body
        var rdfs = new Graph.DFSpanningTree(rcfg);
        var body = rdfs.nodes;

        var _is_outside_loop = function(node) {
            var __same_key = function(other) {
                return other.key === node.key;
            };

            return !(body.find(__same_key));
        };

        // list of exit nodes: nodes outside the loop which may be reached from within the loop
        var exits = body.reduce(function(prev, node) {
            return prev.concat(cfg.successors(node).filter(_is_outside_loop));
        }, []);

        // console.log('loop:');
        // console.log('', 'head node :', head.toString(16));
        // console.log('', 'tail node :', tail.toString(16));
        // console.log('', 'body nodes:', ArrayToString(body, 16));
        // console.log('', 'exit nodes:', ArrayToString(exits, 16));

        // normalize all nodes to be cfg's
        var _to_cfg_node = function(n) {
            return cfg.getNode(n.key);
        };

        return {
            head:   _to_cfg_node(head),
            tail:   _to_cfg_node(tail),
            body:   body.map(_to_cfg_node),
            exits:  exits.map(_to_cfg_node)
        };
    };

    ControlFlow.prototype.handle_loops = function() {
        var func = this.func;
        var cfg = this.cfg;
        var dom = new Graph.DominatorTree(cfg);

        var loops = [];

        // detect loops
        dom.nodes.forEach(function(N) {
            var _dominates_N = function(node) {
                var _succ = dom.getNode(node.key);

                return dom.dominates(_succ, N);
            };

            // if a successor of N also dominates it, it means it is a back edge.
            // find a back edge and get its destination (i.e. the loop head)
            var loop_head = cfg.successors(N).find(_dominates_N);

            // found a loop head?
            if (loop_head) {
                // BUGBUG: loop objects do not take pre loop nodes, that would be
                // inserted later, into consideration. this makes nested loops that
                // share the same loop head to appear buggy

                loops.push(_construct_loop(loop_head, N, cfg));
            }
        });

        // get loop elements out of a Branch statement
        var _branch_to_loop_elements = function(loop, branch) {
            var _same_as = function(target) {
                return function(node) {
                    return addrOf(node).eq(target.value);
                };
            };

            var continues_by_taken = !!loop.body.find(_same_as(branch.taken));
            var continues_by_not_taken = !!loop.body.find(_same_as(branch.not_taken));

            // if loop continues by following both paths, that is a simple 'if' and not
            // a loop condition
            if (continues_by_taken && continues_by_not_taken) {
                return null;
            }

            var cond;   // loop condition expression
            var body;   // loop body first container
            var next;   // container next to loop

            // loop continues by following the 'taken' branch
            if (continues_by_taken) {
                cond = branch.cond.clone(['idx', 'def']);
                body = branch.taken.value;
                next = branch.not_taken.value;
            }

            // loop continues by following the 'not taken' branch
            else if (continues_by_not_taken)
            {
                cond = new Expr.BoolNot(branch.cond.clone(['idx', 'def']));
                body = branch.not_taken.value;
                next = branch.taken.value;
            }

            return {
                cond: cond,
                body: func.getContainer(body),
                next: func.getContainer(next)
            };
        };

        // Wrapper object to work around pre-loop's key problem: when a pre-loop container
        // is inserted, it gets the same address (hence the same key in the graph), which
        // violates the assumption that every key is unique. in order to work around the
        // key collision, this object holds the key value (i.e. container address) but
        // shows a slightly differrent string representation: dotted with an increasing
        // number, e.g. 0x8040100.1
        function Suffixed(val) {
            this.val = val;
            this.suffix = Suffixed.counter++;
        }

        Suffixed.prototype.toString = function(opt) {
            return [this.val.toString(opt), this.suffix].join('.');
        };

        Suffixed.counter = 0;

        var _insert_pre_loop = function(head) {
            // this method creates a new empty container that will precede the loop head
            // and will contain the loop statement. this is done in case the loop entry
            // point is considered part of the body (in DoWhile loops, for example).
            //
            // inserting a blank container to precede the loop head would be complicated,
            // since it is already pointed by other nodes in the cfg. instead, it would be
            // easier to create a succsor node, and move all the statements from loop head
            // there. that would practically make an empty container appearing before loop
            // head statements on the cfg.

            var C0 = node_to_container(head);
            var plucked = [];

            // cut all statements from C0
            while (C0.statements.length > 0) {
                var s = C0.statements[0];

                plucked.push(s.pluck());
            }

            // paste all statements into C1
            var C1 = new Cntr.Container(new Suffixed(C0.address), plucked);

            // add C1 to function containers list so it will get emitted
            func.containers.push(C1);

            // insert a node for C1 in cfg as a successor for C0.
            // all original successors of C0 will be C1's
            cfg.addNode(C1);
            cfg.successors(head).forEach(function(v) {
                cfg.delEdge([C0, v.key]);
                cfg.addEdge([C1, v.key]);
            });
            cfg.addEdge([C0, C1]);

            C0.set_fallthrough(null);

            return C1;
        };

        loops.forEach(function(loop) {
            var head = node_to_container(loop.head);
            var tail = node_to_container(loop.tail);

            var S0 = tail.terminator();
            var S1;
            var C1;

            // if tail is branching out, this is a do-while loop
            if (S0 instanceof Stmt.Branch) {
                var elems = _branch_to_loop_elements(loop, S0);
                var cond = elems.cond;

                C1 = _insert_pre_loop(loop.head);
                S1 = new Stmt.DoWhile(undefined, cond, C1);
                head.push_stmt(S1);

                Simplify.reduce_expr(cond);
                S0.pluck();
            }

            // if tail does not branch, this is a while loop
            else if (S0 instanceof Stmt.Goto) {
                S0 = head.terminator();

                if (S0 instanceof Stmt.Branch) {
                    var elems = _branch_to_loop_elements(loop, S0);

                    if (elems) {
                        var cond = elems.cond;
                        var body = elems.body;
                        var next = elems.next;

                        S0.replace(new Stmt.While(S0.address, cond, body));
                        Simplify.reduce_expr(cond);

                        head.set_fallthrough(next);
                        next.prev = head;
                    }

                    // head does not branch out; rather both branches are within loop body.
                    // neither tail nor head branch out, this is an endless loop
                    else {
                        var cond = new Expr.Val(1, 1);

                        C1 = _insert_pre_loop(loop.head);
                        S1 = new Stmt.While(undefined, cond, C1);
                        head.push_stmt(S1);
                    }
                }

                // if head does not branch as well, this is an endless loop
                else if (S0 instanceof Stmt.Goto) {
                    var cond = new Expr.Val(1, 1);

                    C1 = _insert_pre_loop(loop.head);
                    S1 = new Stmt.While(undefined, cond, C1);
                    head.push_stmt(S1);
                }
            }
        });

        // iterate loop blocks to replace Goto statements with Break and
        // Continue statements where appropriate
        loops.forEach(function(loop) {
            loop.body.forEach(function(n) {
                var C0 = node_to_container(n);
                var S = C0.terminator();

                if (S instanceof Stmt.Goto) {
                    var _dest_key = function(node) {
                        return addrOf(node).eq(S.dest.value);
                    };

                    // jumping out of the loop?
                    if (loop.exits.find(_dest_key)) {
                        S.replace(new Stmt.Break(S.address));
                    }

                    // jumping to loop's head?
                    else if (_dest_key(loop.head)) {
                        if (n === loop.tail) {
                            // a continue statement at loop's end is redundant. if jumping
                            // from loop's tail to loop's head, just remove the Goto
                            S.pluck();
                        } else {
                            S.replace(new Stmt.Continue(S.address));
                        }
                    }
                }
            });
        });

        this.loops = loops;
    };

    ControlFlow.prototype.handle_conds = function() {
        //  for each node N in dfs tree:
        //      let C0 = container of node N
        //
        //      for each statement S in C0:
        //          if S is a branch:
        //              let I = new IF statament
        //              let Sf = Node S.fail
        //              let Sj = Node S.jump
        //
        //              if N dominates Sf and |predecessors(Sf)| = 1:
        //                  let C1 = container of Sf
        //                  attach C1 to I.then
        //                  pop Sf from domination list of N
        //
        //              if N dominates Sj and |predecessors(Sj)| = 1::
        //                  let C2 = container of Sj
        //                  attach C2 to I.else
        //                  pop Sj from domination list of N
        //
        //              replace S with I
        //              C0.next = container of last block left dominated by N, or null if nothing left

        var func = this.func;
        var cfg = this.cfg;
        var dom = new Graph.DominatorTree(cfg);
        var dfs = new Graph.DFSpanningTree(cfg);

        var carried = null;

        // turn Branch statements into If
        dfs.nodes.forEach(function(N) {
            var C0 = node_to_container(N);
            var S = C0.terminator();
            var imm_dominated = dom.successors(N);

            // console.log(ObjAddrToString(C0, 16), ':');
            // console.log('  domfront:', ArrayToString(dom.dominanceFrontier(N), 16));
            // console.log('  idom:', dom.getNode(N.key).idom ? dom.getNode(N.key).idom.toString(16) : 'none');
            // console.log('  +dominates:', ArrayToString(imm_dominated, 16));

            var _neither_head_nor_tail = function(loop) {
                return (N.key !== loop.head.key) && (N.key !== loop.tail.key);
            };

            // proceed only if S is not a terminator of a loop head
            if (this.loops.every(_neither_head_nor_tail)) {
                if (S instanceof Stmt.Branch) {
                    var C1;     // container for 'then' clause
                    var C2;     // container for 'else' clause
                    var cntr;   // destination func block

                    // if N immediately dominates node, remove it from the immediately
                    // dominated list and return it. otherwise return undefined
                    var _is_dominated = function(node) {
                        var __same_key = function(D) {
                            return D.key === node.key;
                        };

                        var i = imm_dominated.findIndex(__same_key);

                        return i === (-1) ? undefined : imm_dominated.splice(i, 1).pop();
                    };

                    // both If clauses (i.e. 'then' and 'else' scopes) are expected to be
                    // preceded solely by the Branch container.
                    //
                    // check whether cntr is immediately dominated by the Branch's container
                    var _is_imm_dominated = function(cntr) {
                        var node = container_to_node(cfg, cntr);

                        return (cfg.indegree(node) === 1) && _is_dominated(node);
                    };

                    // 'then' clause: should be immediately dominated by N
                    cntr = func.getContainer(S.not_taken.value);
                    if (_is_imm_dominated(cntr)) {
                        C1 = cntr;
                        C1.prev = C0;
                    }

                    // 'else' clause: should be immediately dominates by N and have only one predecessor
                    cntr = func.getContainer(S.taken.value);
                    if (_is_imm_dominated(cntr)) {
                        C2 = cntr;
                        C2.prev = C0;
                    }

                    // technically ssa properties are stripped by now and there is no need to clone them.
                    // that said, sometimes ssa is still needed for debugging purposes
                    var cond = S.cond.clone(['idx', 'def']);

                    if (C1) {
                        cond = new Expr.BoolNot(cond);
                    } else {
                        C1 = C2;
                        C2 = null;
                    }

                    S.replace(new Stmt.If(S.address, cond, C1, C2));
                    Simplify.reduce_expr(cond);
                    
                    // console.log('  branch:', '[', ObjAddrToString(C1, 16), '|', ObjAddrToString(C2, 16), ']');
                    // console.log('  -dominates:', ArrayToString(imm_dominated, 16));
                }

                // condition sink should be the only node left on the domniation list.
                // if there is none, the sink is undefined
                var sink = imm_dominated[0];

                // in case there is no sink and we are carrying one from previous
                // branches, use it now
                if (!sink) {
                    sink = carried;
                    carried = null;
                }

                // in some rare cases there would be more than one item left on the
                // domination list, which means there is more than one sink. since we cannot
                // display more than one sink, we would need to carry it down the DFS road
                // and use it as a sink as soon as possible
                if (!carried) {
                    carried = imm_dominated[1];
                }

                // console.log('  carried:', carried ? carried.toString(16) : carried);
                //
                // if (C0.fallthrough) {
                //     console.log('  -fthrough:', ObjAddrToString(C0.fallthrough, 16));
                // }

                // fall-through container, if exists
                var C3 = sink && node_to_container(sink);

                // if that container was already assigned, un-assign it
                if (C3 && C3.parent) {
                    if (C3.parent instanceof Cntr.Container) {
                        C3.parent.set_fallthrough(undefined);
                    }
                }

                C0.set_fallthrough(C3);

                // console.log('  +fthrough:', ObjAddrToString(C0.fallthrough, 16));
                // console.log();
            }
        }, this);

        // simple condition convergance
        if (this.conf.converge) {
            dfs.nodes.forEach(function(N) {
                do {
                    var descend = false;
                    var C0 = node_to_container(N);
                    var outter = C0.terminator();

                    if ((outter instanceof Stmt.If) && (outter.then_cntr && !outter.else_cntr) && !outter.then_cntr.fallthrough) {
                        var inner = outter.then_cntr.statements[0];

                        if ((inner instanceof Stmt.If) && (inner.then_cntr && !inner.else_cntr)) {
                            var conv_cond = new Expr.BoolAnd(outter.cond, inner.cond);

                            outter.replace(new Stmt.If(outter.address, conv_cond, inner.then_cntr, null));
                            inner.pluck();

                            descend = true;
                        }
                    }
                } while (descend);
            });
        }

        // prune Goto statements
        dfs.nodes.forEach(function(N) {
            var C0 = node_to_container(N);
            var S = C0.terminator();

            if (S instanceof Stmt.Goto) {
                // handle only gotos with a known destination (i.e. direct jumps)
                if (S.dest instanceof Expr.Val) {
                    // recursively ascend nested 'if-else' structure to find out what is the
                    // sink address that both 'then' and 'else' parts are falling to. in case
                    // the terminator is a Goto statement that targets the sink - it is redundant
                    // and should be removed
                    while (C0 && !(C0.fallthrough)) {
                        C0 = C0.prev;
                    }

                    if (C0 && S.dest.value.eq(C0.fallthrough.address)) {
                        S.pluck(true);
                    }
                }
            }
        });

        // a container has a safe fallthrough if it has only one successor and a valid
        // fallthrough container
        var _has_safe_fthrough = function(cntr) {
            var N = container_to_node(cfg, cntr);

            return (cfg.outdegree(N) === 1) && (cntr.fallthrough);
        };

        // adjust If statements in case they have empty clauses
        dfs.nodes.forEach(function(N) {
            var C0 = node_to_container(N);
            var S = C0.terminator();

            if (S instanceof Stmt.If) {
                // is this an empty 'else' clause?
                if (S.else_cntr && S.else_cntr.statements.length === 0) {
                    // replace by its safe fallthrough container, if there is one or remove otherwise
                    if (_has_safe_fthrough(S.else_cntr)) {
                        S.else_cntr.replace(S.else_cntr.fallthrough);
                    } else {
                        S.else_cntr.pluck();
                    }
                }

                // is this an empty 'then' clause?
                if (S.then_cntr && S.then_cntr.statements.length === 0) {
                    // replace by its safe fallthrough container, if there is one or remove otherwise
                    if (_has_safe_fthrough(S.then_cntr)) {
                        S.then_cntr.replace(S.then_cntr.fallthrough);
                    } else {
                        S.then_cntr.pluck();
                    }
                }

                // an If statement must have at least a 'then' clause. if there isn't
                // one, replace with its 'else' clause, and accomodate by negating the
                // condition. if both clauses are gone, the statement is meaningless and
                // should be removed altogether
                if (!S.then_cntr) {
                    if (S.else_cntr) {
                        var cond = new Expr.BoolNot(S.cond.clone(['idx', 'def']));
                        var C1 = S.else_cntr;

                        S.replace(new Stmt.If(S.address, cond, C1, null));
                        Simplify.reduce_expr(cond);
                    } else {
                        S.pluck(true);
                    }
                }
            }
        });
    };

    ControlFlow.prototype.prune_gotos = function() {
        var cfg = this.cfg;
        var remove = [];

        cfg.nodes.forEach(function(N) {
            var C0 = node_to_container(N);
            var S = C0.terminator();

            if (S instanceof Stmt.Goto) {
                S.pluck();
            }

            // is this an empty container?
            // - contained only a 'goto', which was pruned
            // - contained only nops
            // - contained an empty 'return' statement, which was pruned during analysis phase
            // in all cases the container has no more than one successor
            if (C0.statements.length === 0) {
                var succ = cfg.successors(N)[0];

                // no successor? probably contained an empty return statement.
                // insert an empty return statement, and do not remove the node
                if (succ === undefined) {
                    C0.push_stmt(new Stmt.Return());
                }

                // one successor? mark node for removal, delete its edges and create new ones,
                // just like when removing an link from a linked list
                else {
                    cfg.predecessors(N).forEach(function(pred) {
                        cfg.delEdge([pred.key, N.key]);
                        cfg.addEdge([pred.key, succ.key]);
                    });

                    cfg.delEdge([N.key, succ.key]);

                    remove.push(N);
                }
            }
        });

        // nodes could not be removed when iterated, so remove them now
        remove.forEach(cfg.delNode, cfg);

        return cfg;
    };

    return ControlFlow;
});