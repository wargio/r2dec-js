
module.exports = (function() {
    const Graph = require('core2/analysis/graph');
    const Stmt = require('core2/analysis/ir/statements');
    const Expr = require('core2/analysis/ir/expressions');

/*
    var transform_ssa = function() {
        var indices = [];

        var rename = function(bb) {
            bb.statements.forEach(function(stmt) {
                stmt.expressions.iter_operands().forEach(function(expr) {
                    if (!(expr instanceof Expr.Phi)) {
                        if (!expr.is_def) {

                        }
                    }

                    if (expr.is_def) {
                        
                    }

                });
            });
        };

    };
*/

    // iterate all statements in block and collect only defined names
    var get_defs = function(block) {
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
                    if (op.is_def) {
                        var idx = find_def(op);

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

    var insert_phi_exprs = function(cfg, blocks) {
        var defs = {};

        // map a block to its list of definitions
        blocks.forEach(function(blk) {
            defs[blk.address] = get_defs(blk);
        });

        var defsites = {};
        var defsites_kexpr = [];

        // map a variable to blocks where it is defined
        blocks.forEach(function(blk) {
            var _defs = defs[blk.address];

            _defs.forEach(function(_d) {
                if (_d in defsites) {
                    defsites[_d].push(blk.address);
                } else {
                    defsites_kexpr.push(_d);
                    defsites[_d] = [blk.address];
                }
            });
        });

        var phis = {};
        var domTree = new Graph.DominatorTree(cfg);

        console.log('domTree:');
        console.log(domTree);

        // TODO:
        // defsites keys ('a') come out as strings, not exprs like we need them.
        // consider using a Map, or back it up with another obj to map str->expr 
        for (var a in defsites_kexpr) {
            a = defsites_kexpr[a];
            var W = defsites[a];

            console.log('a:', a.toString());
            console.log('  W:', W.toString());

            while (W.length > 0) {
                // defsites value list elements are basic block addresses, while domTree accepts a Node
                var n = cfg.getNode(W.pop());
                console.log('    n:', n.toString());

                domTree.dominanceFrontier(n).forEach(function(y) {
                    if (!(y in phis)) {
                        phis[y] = [];
                    }

                    if (phis[y].indexOf(a) === (-1)) {
                        var args = [];
                        for (var i = 0; i < cfg.predecessors(y).length; i++) {
                            args.push(a.clone());
                        }

                        y.shift(Stmt.make_statement(new Expr.Assign(a.clone(), new Expr.Phi(args))));

                        phis[y].push(a);
                        if (defs[y].indexOf(a) === (-1)) {
                            W.push(y);
                        }
                    }
                });
            }
        }
    };

    return {
        insert_phi_exprs: insert_phi_exprs
    };
}());