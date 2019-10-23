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

    /**
     * Construct a graph node.
     * @param {*} key A key that the node is indexed by
     * @constructor
     * @inner
     */
    function Node(key) {
        this.key = key;
        this.inbound = [];
        this.outbound = [];
    }

    Node.prototype.toString = function(opt) {
        var repr = [
            this.constructor.name,
            this.key.toString(opt)
        ].join(' ');

        return '[' + repr + ']';
    };

    /**
     * Construct a directed graph object.
     * @param {Array.<*>} nodes List of node keys to add
     * @param {Array.<Array.<*>>} edges List of node key pairs, where pointing node key is first and pointed is second
     * @param {*} root Key of root node; must be one of `nodes`
     * @constructor
     */
    function Directed(nodes, edges, root) {
        this.nodes = {};
        this.root = undefined;

        if (nodes) {
            nodes.forEach(this.addNode, this);
        }

        if (edges) {
            edges.forEach(this.addEdge, this);
        }

        if (root) {
            this.setRoot(root);
        }
    }

    Directed.prototype.toString = function(opt) {
        return this.iterNodes().map(function(n) {
            var outs = this.successors(n).map(function(succ) {
                return succ.toString(opt);
            });

            return [n.toString(opt), '->', '[' + outs.join(', ') + ']'].join(' ');
        }, this).join('\n');
    };

    /**
     * Add a node to the graph.
     * @param {*} key A key the node can be retrieved with; keys must be unique
     */
    Directed.prototype.addNode = function(key) {
        this.nodes[key] = new Node(key);
    };

    /**
     * Retrieve a node by its key.
     * @param {*} key A key the node can be retrieved with
     * @return {Node} Node whose key equals to `key`, or `undefined` if key not found
     */
    Directed.prototype.getNode = function(key) {
        return this.nodes[key];
    };

    Directed.prototype.getRoot = function() {
        return this.root;
    };

    /**
     * Set graph root node.
     * @param {*} key A key the node to be root can be retrieved with; `key` must exist already in graph
     */
    Directed.prototype.setRoot = function(key) {
        this.root = this.getNode(key);
    };

    Directed.prototype.addEdge = function(edge) {
        var src = this.getNode(edge[0]);
        var dst = this.getNode(edge[1]);

        src.outbound.push(dst);
        dst.inbound.push(src);
    };

    var _remove_node = function(arr, node) {
        var i = arr.findIndex(function(n) {
            return n.key == node.key;
        });

        return (i === (-1) ? undefined : arr.splice(i, 1));
    };

    Directed.prototype.delEdge = function(edge) {
        var src = this.getNode(edge[0]);
        var dst = this.getNode(edge[1]);

        _remove_node(src.outbound, dst);
        _remove_node(dst.inbound, src);
    };

    // not really an iterator, as Duktape does not support "yield" and "function*"
    // returns a list of nodes, not necessarily in insertion order
    Directed.prototype.iterNodes = function() {
        // Duktape does not support Object.values() neither...
        return Object.keys(this.nodes).map(function(k) { return this.getNode(k); }, this);
    };

    Directed.prototype.predecessors = function(node) {
        return this.getNode(node.key).inbound.slice();
    };

    Directed.prototype.successors = function(node) {
        return this.getNode(node.key).outbound.slice();
    };

    Directed.prototype.indegree = function(node) {
        return this.getNode(node.key).inbound.length;
    };

    Directed.prototype.outdegree = function(node) {
        return this.getNode(node.key).outbound.length;
    };

    Directed.prototype.reversed = function(rev_root) {
        var nodes = [];
        var edges = [];

        this.iterNodes().forEach(function(n) {
            nodes.push(n.key);

            var rev = this.successors(n).map(function(succ) {
                return [succ.key, n.key];
            });

            Array.prototype.push.apply(edges, rev);
        }, this);

        return new Directed(nodes, edges, rev_root);
    };

    /**
     * Generate a sequence of r2 commands to represent the graph via r2
     * custom graph. Please note that executing the commands sequence
     * will discard a previous custom graph, if exists.
     *
     * @returns {Array.<string>} A list of commands to display the graph in r2
     */
    Directed.prototype.r2graph = function() {
        var clear_graph = ['ag-'];
        var add_nodes = [];
        var add_edges = [];
        var show_graph = ['agg'];

        var _node_key_toString = function(n) {
            return '0x' + n.key.toString(16);
        };

        this.iterNodes().forEach(function(n) {
            add_nodes.push([
                'agn',
                _node_key_toString(n)
            ].join(' '));

            var edges = this.successors(n).map(function(succ) {
                return [
                    'age',
                    _node_key_toString(n),
                    _node_key_toString(succ)
                ].join(' ');
            });

            Array.prototype.push.apply(add_edges, edges);
        }, this);

        return Array.prototype.concat(
            clear_graph,
            add_nodes,
            add_edges,
            show_graph
        );
    };

    // --------------------------------------------------

    // construct a depth-first spanning tree of graph g
    function DFSpanningTree(g) {
        var nodes = [];
        var edges = [];

        var explore = function(n) {
            nodes.push(n.key);

            g.successors(n).forEach(function(succ) {
                if (nodes.indexOf(succ.key) === (-1)) {
                    edges.push([n.key, succ.key]);

                    explore(succ);
                }
            });
        };

        explore(g.root);

        Directed.call(this, nodes, edges, nodes[0]);

        // graph nodes are stored in a dictionary in which their order is not guaranteed.
        // this array keeps them in order.
        this.keys_dfs = nodes;

        // modify Node objects to hold DFS indices
        this.iterNodes().forEach(function(n, i) {
            n.dfnum = i;
        });
    }

    DFSpanningTree.prototype = Object.create(Directed.prototype);
    DFSpanningTree.prototype.constructor = DFSpanningTree;

    DFSpanningTree.prototype.parent = function(node) {
        // for every node in a [spanning] tree has zero or one predecessors
        return this.predecessors(node)[0];
    };

    DFSpanningTree.prototype.iterNodes = function() {
        return this.keys_dfs.map(function(k) { return this.getNode(k); }, this);
    };

    // --------------------------------------------------

    // using Lengauer-Tarjan algorithm to compute dominance tree
    function DominatorTree(g) {
        this.cfg = g;

        var AncestorWithLowestSemi = function(v) {
            var a = v.ancestor;

            if (a.ancestor) {
                var b = AncestorWithLowestSemi(a);

                v.ancestor = a.ancestor;
                if (b.semi.dfnum < v.best.semi.dfnum) {
                    v.best = b;
                }
            }

            return v.best;
        };

        var Link = function(p, n) {
            n.ancestor = p;
            n.best = n;
        };

        var dfstree = new DFSpanningTree(g);
        var nodes = dfstree.iterNodes();

        // init
        nodes.forEach(function(n) {
            n.semi = undefined;
            n.ancestor = undefined;
            n.best = undefined;
            n.idom = undefined;
            n.samedom = undefined;
            n.bucket = [];
        });

        // iterate dfstree nodes in reverse order; excluding root node
        for (var i = nodes.length - 1; i > 0; i--) {
            var n = nodes[i];
            var p = dfstree.parent(n);
            var s = p;

            // calculate the semidominator of n
            // iterate predecessors of n in cfg
            g.predecessors(n).forEach(function(pred) {
                var v = dfstree.getNode(pred.key);
                var s_tag = (v.dfnum <= n.dfnum) ? v : AncestorWithLowestSemi(v).semi;

                if (s_tag.dfnum < s.dfnum) {
                    s = s_tag;
                }
            });

            n.semi = s;

            if (s.bucket.indexOf(n) === (-1)) {
                s.bucket.push(n);
            }

            Link(p, n);

            while (p.bucket.length > 0) {
                var v = p.bucket.pop();
                var y = AncestorWithLowestSemi(v);

                if (y.semi == v.semi) {
                    v.idom = p;
                } else {
                    v.samedom = y;
                }
            }
        }

        var edges = [];
        for (var i = 1; i < nodes.length; i++) {
            var n = nodes[i];

            if (n.samedom) {
                n.idom = n.samedom.idom;
            }

            edges.push([n.idom.key, n.key]);
        }

        var keys = nodes.map(function(n) { return n.key; });

        // construct 'this' graph
        Directed.call(this, keys, edges, keys[0]);

        // modify Node objects to hold dominator data
        this.iterNodes().forEach(function(n) {
            n.idom = n.inbound[0];
        });
    }

    DominatorTree.prototype = Object.create(Directed.prototype);
    DominatorTree.prototype.constructor = DominatorTree;

    DominatorTree.prototype.dominates = function(v, u) {
        if (u == v) {
            return true;
        }

        if (u == this.root) {
            return false;
        }

        return this.dominates(v, u.idom);
    };

    DominatorTree.prototype.all_dominated = function(v) {
        var dominated = [];
        var _this = this;

        var descend_dom = function(n) {
            if (n == v) {
                return;
            }

            if (_this.dominates(v, n)) {
                dominated.push(n.key);
            }

            _this.successors(n).forEach(descend_dom);
        };

        _this.successors(v).forEach(descend_dom);

        return dominated.map(this.getNode, this);
    };

    DominatorTree.prototype.strictlyDominates = function(v, u) {
        return (v != u) && this.dominates(v, u);
    };

    DominatorTree.prototype.dominanceFrontier = function(n) {
        // for every node, the dominance frontier set is computed once and then cached
        if (n.DF === undefined) {
            var S = [];

            // compute DF local
            this.cfg.successors(n).forEach(function(succ) {
                var y = this.getNode(succ.key);

                if (y.idom != n) {
                    if (S.indexOf(y) === (-1)) {
                        S.push(y);
                    }
                }
            }, this);

            // compute DF up
            this.successors(n).forEach(function(c) {
                this.dominanceFrontier(c).forEach(function(w) {
                    if (!this.dominates(n, w) || (n == w)) {
                        if (S.indexOf(w) === (-1)) {
                            S.push(w);
                        }
                    }
                }, this);
            }, this);

            n.DF = S;
        }

        return n.DF;
    };

    return {
        Directed        : Directed,
        DFSpanningTree  : DFSpanningTree,
        DominatorTree   : DominatorTree
    };
})();