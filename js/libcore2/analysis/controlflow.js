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

    function ControlFlow(func, conf) {
        this.func = func;
        this.conf = conf;

        this.cfg = this.func.cfg();
        this.dfs = new Graph.DFSpanningTree(this.cfg);
        this.dom = new Graph.DominatorTree(this.cfg);
    }

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

    // get a function basic block from a graph node
    var node_to_block = function(node) {
        return node.key;
    };

    var node_to_container = function(node) {
        return node.key.container;
    };

    // get a graph node from a function basic block
    var block_to_node = function(g, block) {
        return g.getNode(block) || null;
    };

    var container_to_node = function(g, f, container) {
        return block_to_node(g, f.getBlock(container.address));
    };

    // retreive the address of the basic block represented by the specified node
    var addrOf = function(node) {
        return node_to_block(node).address;
    };

    var _construct_loop = function(N, cfg, dom) {
        var key = N.key;
        
        // head of the loop
        var head = dom.getNode(key);

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

        // build a reversed cfg starting from loop head; prune the edge
        // pointing the head immediate dominator, which is outside the loop
        var rcfg = cfg.reversed(key);
        rcfg.delEdge([key, head.idom.key]);

        // TODO: it looks like the idom trick won't work if there are multiple edges
        // coming into the loop head; do we need to split the edges to get a pre-loop?

        // build a dfs tree from the pruned reversed cfg; this would let us
        // know which nodes are in the loop body
        var rdfs = new Graph.DFSpanningTree(rcfg);
        var body = rdfs.iterNodes();

        // the set of nodes dominated by the loop head includes loop body nodes and
        // exit nodes. we now "xoring" those sets together to find exit nodes
        var exits = dom.all_dominated(head).filter(function(n0) {
            return !(body.find(function(n1) { return addrOf(n0).eq(addrOf(n1)); }));
        });

        // var exits = [];
        //
        // body.forEach(function(node) {
        //     var obranches = cfg.successors(node).filter(function(n0) {
        //         return !(body.find(function(n1) { return addrOf(n0).eq(addrOf(n1)); }));
        //     });
        //
        //     Array.prototype.push.apply(exits, obranches);
        // });

        // console.log('loop:');
        // console.log('', 'head node :', head.toString(16));
        // console.log('', 'body nodes:', ArrayToString(body, 16));
        // console.log('', 'exit nodes:', ArrayToString(exits, 16));

        return {
            head:   head,
            body:   body,
            exits:  exits
        };
    };

    ControlFlow.prototype.loops = function() {
        var func = this.func;
        var cfg = this.cfg;
        var dom = this.dom;

        var loops = [];

        this.dfs.iterNodes().forEach(function(N) {
            var _is_loop_head = function(node) {
                var _succ = dom.getNode(node.key);
                var _curr = dom.getNode(N.key);

                return dom.dominates(_succ, _curr);
            };

            var loop_heads = cfg.successors(N).filter(_is_loop_head);

            // is this a back edge?
            if (loop_heads.length > 0) {
                loops.push(_construct_loop(loop_heads[0], cfg, dom));
            }
        });

        loops.forEach(function(loop) {
            var C0 = node_to_container(loop.head);
            var S = C0.terminator();

            if (S instanceof Stmt.Branch) {
                var _taken_key = function(node) {
                    return addrOf(node).eq(S.taken.value);
                };

                var _not_taken_key = function(node) {
                    return addrOf(node).eq(S.not_taken.value);
                };

                var cond;
                var body;
                var next;

                if (loop.body.find(_taken_key)) {
                    cond = S.cond;
                    body = S.taken.value;
                    next = S.not_taken.value;
                }

                else if (loop.body.find(_not_taken_key))
                {
                    cond = new Expr.BoolNot(S.cond);
                    body = S.not_taken.value;
                    next = S.taken.value;
                }

                var C1 = func.getContainer(body);
                var C2 = func.getContainer(next);

                // when a loop contains only one block (i.e. loop head is also the only body block), the
                // loop body would point its own container and cause an endless recursion. to avoid that,
                // we extract all the statements except the terminator, to form a new body container.
                // the terminator remains the only statement in the original cotnainer, and marks the new
                // one as its body container.
                if (C0 === C1) {
                    var plucked = C0.statements.filter(function(stmt) {
                        return stmt !== S;
                    }).map(function(stmt) {
                        return stmt.pluck(false);
                    });

                    C1 = new Cntr.Container(C0.address, plucked);

                    // DIRTY HACK: add to function containers list so it would be emitted later on
                    func.containers.push(C1);

                    // C0 includes only the terminating statement; update its address to reflect that
                    C0.address = S.address;
                }

                S.replace(new Stmt.While(S.address, cond, C1));
                Simplify.reduce_expr(cond);

                C0.set_fallthrough(C2);
                C2.prev = C0;
            }
        });

        loops.forEach(function(loop) {
            var loop_nodes = Array.prototype.concat(loop.body, loop.exits);

            // iterate loop blocks to replace Goto statements with Break and
            // Continue statements where appropriate
            loop_nodes.forEach(function(n) {
                var C0 = node_to_container(n);
                var S = C0.terminator();

                if (S instanceof Stmt.Goto) {
                    var _dest_key = function(node) {
                        return addrOf(node).eq(S.dest.value);
                    };

                    // jumping to an exit node?
                    if (loop.exits.find(_dest_key)) {
                        S.replace(new Stmt.Break(S.address));
                    }

                    // jumping to loop's head?
                    else if (_dest_key(loop.head)) {
                        S.replace(new Stmt.Continue(S.address));
                    }
                }
            });
        });

        this.loops = loops;
    };

    ControlFlow.prototype.fallthroughs = function() {
        this.func.basic_blocks.forEach(function(bb) {
            // N --> M
            var n_block = bb;
            var m_block = ((n_block.fail && this.func.getBlock(n_block.fail))
                || (n_block.jump && this.func.getBlock(n_block.jump)));

            if (m_block) {
                n_block.container.set_fallthrough(m_block.container);
            }
        }, this);
    };

    // blocks with no explicit branching or jumps just fall through to the next
    // block. add an explicit goto statement to such blocks to reflect this
    // behavior explicitly on the output code
    ControlFlow.prototype.missing_gotos = function() {
        this.func.basic_blocks.forEach(function(bb) {
            var term = bb.container.terminator();

            if (!term && bb.jump) {
                term = new Stmt.Goto(undefined, new Expr.Val(bb.jump));

                bb.container.push_stmt(term);
            }
        });
    };
    
    ControlFlow.prototype.conditions = function() {
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
        var dom = this.dom;

        var carried = null;

        // turn Branch statements into If
        this.dfs.iterNodes().forEach(function(N) {
            var C0 = node_to_container(N);
            var S = C0.terminator();
            var imm_dominated = dom.successors(dom.getNode(N.key));

            // console.log(ObjAddrToString(C0, 16), ':');
            // console.log('  domfront:', ArrayToString(dom.dominanceFrontier(N), 16));
            // console.log('  idom:', dom.getNode(N.key).idom ? dom.getNode(N.key).idom.toString(16) : 'none');
            // console.log('  +dominates:', ArrayToString(imm_dominated, 16));

            // proceed only if S is not a loop branch (i.e. a branch in a loop head)
            if (!(this.loops.find(function(loop) { return loop.head.key === N.key; }))) {
                if (S instanceof Stmt.Branch) {
                    var C1;     // container for 'then' clause
                    var C2;     // container for 'else' clause
                    var cntr;   // destination func block

                    // does N immediately dominate node?
                    var _is_dominated = function(node) {
                        var i = imm_dominated.findIndex(function(D) {
                            return D.key === node.key;
                        });

                        return i === (-1) ? undefined : imm_dominated.splice(i, 1).pop();
                    };

                    // both If clauses (i.e. 'then' and 'else' scopes) are expected to be
                    // preceded solely by the Branch container.
                    //
                    // check whether cntr is immediately dominated by the Branch's container
                    var _is_imm_dominated = function(cntr) {
                        var node = container_to_node(cfg, func, cntr);

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

                // set fall-through container, if exists
                C0.set_fallthrough(sink && node_to_container(sink));

                // console.log('  +fthrough:', ObjAddrToString(C0.fallthrough, 16));
                // console.log();
            }
        }, this);

        if (this.conf.converge) {
            // simple convergance
            this.dfs.iterNodes().forEach(function(N) {
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
            }, this);
        }

        // prune Goto statements
        this.dfs.iterNodes().forEach(function(N) {
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
            var N = container_to_node(cfg, func, cntr);

            return (cfg.outdegree(N) === 1) && (cntr.fallthrough);
        };

        // adjust If statements in case they have empty clauses
        this.dfs.iterNodes().forEach(function(N) {
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

    return ControlFlow;
});