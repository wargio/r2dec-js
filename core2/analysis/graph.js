

module.exports = (function() {

    // TODO: an inferior implementation of Map
    const Map = require('core2/analysis/map');

    function Node(key) {
        this.key = key;
        this.inbound = [];
        this.outbound = [];
    }

    function Graph() {
        this.nodes = new Map();
        this.root = undefined;
    }

    Graph.prototype.addNode = function(key) {
        var node = new Node(key);

        this.nodes.set(key, node);
    };

    Graph.prototype.getNode = function(key) {
        return this.nodes.get(key);
    };

    Graph.prototype.setRoot = function(key) {
        this.root = this.getNode(key);
    };

    Graph.prototype.addEdge = function(k0, k1) {
        var src = this.getNode(k0);
        var dst = this.getNode(k1);

        src.outbound.push(dst);
        dst.inbound.push(src);
    };

    return Graph;
})();