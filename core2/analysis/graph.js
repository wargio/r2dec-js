

module.exports = (function() {

    // TODO: an inferior implementation of Map
    const Map = require('core2/analysis/map');

    function Node(value) {
        this.val = value;
        this.inbound = [];
        this.outbound = [];
    }

    function Graph() {
        this.nodes = new Map();
        this.root = undefined;
    }

    Graph.prototype.addNode = function(k, node) {
        this.nodes.set(k, node);
    };

    Graph.prototype.getNode = function(k) {
        return this.nodes.get(k);
    };

    Graph.prototype.setRoot = function(k) {
        this.root = this.nodes.get(k);
    };

    Graph.prototype.addEdge = function(k0, k1) {
        var src = this.getNode(k0);
        var dst = this.getNode(k1);

        src.outbound.push(dst);
        dst.inbound.push(src);
    };

    return {
        Node: Node,
        Graph: Graph
    };
})();