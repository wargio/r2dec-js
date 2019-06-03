
module.exports = (function() {
	const Graph = require('core2/analysis/graph');
    const Expr = require('core2/analysis/ir/expressions');
    const Stmt = require('core2/analysis/ir/statements');

    function ControlFlow(func) {
        this.func = func;
        this.cfg = func.cfg();
    }

    ControlFlow.prototype.fallthroughs = function() {
        this.cfg.iterNodes().forEach(function(N) {
            var successors = this.cfg.successors(N);

            if (successors.length === 1) {
                var predecessors = this.cfg.predecessors(successors[0]);

                if (predecessors.length === 1) {
                    if (predecessors[0].eq(N)) {
                        var n_container = node_to_block(this.func, N).container;
                        var n_terminator = n_container.terminator();

                        // probably always Goto
                        if (n_terminator instanceof Stmt.Goto) {
                            n_terminator.pluck();
                        }

                        n_container.next = node_to_block(this.func, predecessors[0]).container;
                    }
                }
            }
        }, this);
    };

    // TODO: duplicated code from ssa.js
    // get a function basic block from a graph node
    var node_to_block = function(f, node) {
        return f.getBlock(node.key) || null;
    };

    // get a graph node from a function basic block
    var block_to_node = function(g, block) {
        return g.getNode(block.address) || null;
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

        var dfs = new Graph.DFSpanningTree(this.cfg);
        var dom = new Graph.DominatorTree(this.cfg);

        // <DEBUG>
        // console.log('cfg:');
        // console.log(this.cfg.toString(16));
        // console.log('dom:');
        // console.log(dom.toString(16));
        // console.log('idom:');
        // dom.iterNodes().forEach(function(_n) {
        //      console.log(_n.toString(16), '.idom =', _n.idom ? _n.idom.toString(16) : 'undefined');
        // });
        // </DEBUG>

        var pluck_trailing_goto = function(container) {
            if (container) {
                var terminator = container.terminator();

                if (terminator instanceof Stmt.Goto) {
                    terminator.pluck();
                }
            }
        };

        dfs.iterNodes().forEach(function(N) {
            var C0 = node_to_block(this.func, N).container;
            var S = C0.terminator();

            if (S instanceof Stmt.Branch) {
                var C1;     // container for 'then' clause
                var C2;     // container for 'else' clause
                var dominated = dom.successors(N);
                var idx;

                // TODO: Duktape Array prototype has no 'findIndex' method. this workaround should be
                // removed when Duktape implements this method for Array prototype.
                // <WORKAROUND> 
                dominated.findIndex = function(predicate) {
                    for (var i = 0; i < this.length; i++) {
                        if (predicate(this[i])) {
                            return i;
                        }
                    }

                    return (-1);
                };
                // </WORKAROUND>

                idx = dominated.findIndex(function(d) { return d.key.eq(S.not_taken.value); });
                if ((idx !== (-1)) && (this.cfg.predecessors(dominated[idx]).length === 1)) {
                    C1 = this.func.getBlock(S.not_taken.value).container;

                    dominated.splice(idx, 1);
                }

                idx = dominated.findIndex(function(d) { return d.key.eq(S.taken.value); });
                if ((idx !== (-1)) && (this.cfg.predecessors(dominated[idx]).length === 1)) {
                    C2 = this.func.getBlock(S.taken.value).container;

                    dominated.splice(idx, 1);
                }

                pluck_trailing_goto(C1);
                pluck_trailing_goto(C2);

                S.replace(new Stmt.If(S.addr, new Expr.BoolNot(S.cond.clone(['idx', 'def'])), C1, C2));
                var sink = dominated[0];
                C0.next = sink && node_to_block(this.func, sink).container;
            }
        }, this);
    };

    return ControlFlow;
})();