/* 
 * Copyright (C) 2018-2020 elicn
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

    /**
     * @typedef {object} Key An object that the node is indexed by. A key object
     * must implement a `toString` method that would produce a unique identifier
     */

    /**
     * @typedef {[Key, Key]} Edge A pair of key objects that represents an edge
     * from the first element to the second
     */

    /**
     * Construct a graph node.
     * @param {Key} key A key that the node is indexed by
     * @constructor
     * @inner
     */
    function Node(key) {
        this.key = key;

        /** @type {Array.<Node>} */
        this.inbound = [];

        /** @type {Array.<Node>} */
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
     * @param {Array.<Key>} nodes List of node keys to add
     * @param {Array.<Edge>} edges List of edges; all keys specified in edges must exist in `nodes`
     * @param {Key} root Key of root node; must be one of `nodes`
     * @constructor
     */
    function Directed(nodes, edges, root) {
        this.nodes_map = {};
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

        // returns a list of nodes, not necessarily in insertion order
        Object.defineProperty(this, 'nodes', {
            get : function() {
                return Object.values(this.nodes_map);
            },

            // allow overriding this property
            configurable: true
        });
    }

    Directed.prototype.toString = function(opt) {
        var _array_toString = function(arr) {
            return '[' + arr.join(', ') + ']';
        };

        return this.nodes.map(function(n) {
            var outs = this.successors(n).map(function(succ) {
                return succ.toString(opt);
            });

            return [n.toString(opt), '->', _array_toString(outs)].join(' ');
        }, this).join('\n');
    };

    /**
     * Add a node to the graph.
     * @param {Key} key A key the node can be retrieved with; keys must be unique
     */
    Directed.prototype.addNode = function(key) {
        console.assert(!(key in this.nodes_map), 'A node with key ' + key + ' is already in graph');

        this.nodes_map[key] = new Node(key);
    };

    /**
     * Retrieve a node by its key.
     * @param {Key} key A key the node can be retrieved with
     * @return {?Node} Node which is mapped to `key`, or `undefined` if there is no such node
     */
    Directed.prototype.getNode = function(key) {
        return this.nodes_map[key];
    };

    Directed.prototype.getRoot = function() {
        return this.root;
    };

    /**
     * Set graph root node.
     * @param {Key} key A key the node to be root can be retrieved with; `key` must exist already in graph
     */
    Directed.prototype.setRoot = function(key) {
        this.root = this.getNode(key);
    };

    /**
     * Create an edge between two nodes in the graph.
     * @param {Edge} edge A pair of keys representing source and destination nodes
     */
    Directed.prototype.addEdge = function(edge) {
        var u = this.getNode(edge[0]);
        var v = this.getNode(edge[1]);

        console.assert(u !== undefined);
        console.assert(v !== undefined);

        u.outbound.push(v);
        v.inbound.push(u);
    };

    var _remove_from_list = function(node, arr) {
        var i = arr.findIndex(function(n) {
            return n.key == node.key;
        });

        if (i !== (-1)) {
            arr.splice(i, 1);
        }
    };

    /**
     * Remove an existing edge in the graph.
     * @param {Edge} edge A pair of keys representing source and destination nodes
     */
    Directed.prototype.delEdge = function(edge) {
        var u = this.getNode(edge[0]);
        var v = this.getNode(edge[1]);

        console.assert(u !== undefined);
        console.assert(v !== undefined);

        _remove_from_list(v, u.outbound);
        _remove_from_list(u, v.inbound);
    };

    /**
     * Split an existing edge into two edges and insert a node in between.
     * That is, splitting edge `u -> v` and inserting `t` would result in: `u -> t`, `t -> v`
     * @param {Edge} edge Edge to split
     * @param {Key} key Key of the node to insert; node must already exist in the graph
     */
    Directed.prototype.splitEdge = function(edge, key) {
        var u = edge[0];
        var v = edge[1];

        this.delEdge([u, v]);
        this.addEdge([u, key]);
        this.addEdge([key, v]);
    };

    Directed.prototype.delNode = function(key) {
        var node = this.getNode(key);

        if (node) {
            // remove all edges to successors
            this.successors(node).forEach(function(succ) {
                this.delEdge([node.key, succ.key]);
            }, this);

            // remove all edges to predecessors
            this.predecessors(node).forEach(function(pred) {
                this.delEdge([pred.key, node.key]);
            }, this);

            // deleting the root node makes no sense, but support it anyway
            if (node === this.root) {
                this.root = null;
            }

            // remove the node itself
            delete this.nodes_map[key];
        }
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

        this.nodes.forEach(function(n) {
            nodes.push(n.key);

            var rev = this.successors(n).map(function(succ) {
                return [succ.key, n.key];
            });

            Array.prototype.push.apply(edges, rev);
        }, this);

        return new Directed(nodes, edges, rev_root);
    };

    /**
     * Generate a sequence of r2 commands to represent the graph via r2 custom graph. Note that
     * executing the commands sequence will discard a previous custom graph, if exists.
     *
     * Usage example (assuming a graph named 'g'):
     * 
     *   var mkt = function(node) {
     *       return node.key.toString();
     *   }
     * 
     *   var mkb = function(node) {
     *       return "base64:" + Duktape.enc("base64", "body of: " + node.key.toString());
     *   }
     * 
     *   console.log(Global.r2cmd(g.r2graph(mkt, mkb).join(' ; ')));
     * 
     * @param {function} mk_title Callback function that takes a node and returns its title text
     * @param {function} mk_body  Callback function that takes a node and returns its body text
     * @returns {Array.<string>} A list of commands to display the graph in r2
     */
    Directed.prototype.r2graph = function(mk_title, mk_body) {
        var clear_graph = ['ag-'];
        var add_nodes = [];
        var add_edges = [];
        var show_graph = ['agg'];

        // if (mk_title === undefined) {
        //     mk_title = function(node) { return '"' + node.key.toString() + '"'; };
        // }
        //
        // if (mk_body === undefined) {
        //     mk_body = function(node) { return ''; };
        // }

        this.nodes.forEach(function(n) {
            add_nodes.push([
                'agn',
                mk_title(n),
                mk_body(n)
            ].join(' '));

            var edges = this.successors(n).map(function(succ) {
                return [
                    'age',
                    mk_title(n),
                    mk_title(succ)
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

        // override the nodes property to make sure dfs node are returned in correct order
        Object.defineProperty(this, 'nodes', {
            get: function() {
                return this.keys_dfs.map(function(k) { return this.getNode(k); }, this);
            }
        });

        // modify Node objects to hold DFS indices
        this.nodes.forEach(function(n, i) {
            n.dfnum = i;
        });
    }

    DFSpanningTree.prototype = Object.create(Directed.prototype);
    DFSpanningTree.prototype.constructor = DFSpanningTree;

    DFSpanningTree.prototype.parent = function(node) {
        // for every node in a [spanning] tree has zero or one predecessors
        return this.predecessors(node)[0];
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
        var nodes = dfstree.nodes;

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
        this.nodes.forEach(function(n) {
            n.idom = n.inbound[0];
        });
    }

    DominatorTree.prototype = Object.create(Directed.prototype);
    DominatorTree.prototype.constructor = DominatorTree;

    DominatorTree.prototype.dominates = function(v, u) {
        if (u === v) {
            return true;
        }

        if (u === this.root) {
            return false;
        }

        return this.dominates(v, u.idom);
    };

    DominatorTree.prototype.allDominated = function(v) {
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

        this.successors(v).forEach(descend_dom);

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
});