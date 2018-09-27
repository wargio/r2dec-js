
module.exports = (function() {
    var _node = function(data) {
        this.data = data;
        this.pred = [];
        this.succ = [];
    };

    var _graph = function(root) {
        this.nodes = [];
        this.root = root;

        this.add_node = function(node) {
            this.nodes.push(node);
        };

        this.add_edge = function(node0, node1) {
            node0.succ.push(node1);
            node1.pred.push(node0);
        };
    };

    return {
        node:   _node,
        graph:  _graph
    };
}());
/*
if (afbj) {
    var nodes = {};
    var edges = [];

    afbj.forEach(function(b) {
        var aoj = r2cmdj('aoj', b.ninstr, '@', b.addr);

        nodes[b.addr] = new Graph.node(decoder.transform_ir(aoj));
        edges.push([b.addr, b.jump]);  // where block jumps to
        edges.push([b.addr, b.fail]);  // where block falls into
    });

    var func = new Graph.graph();

    Object.keys(nodes).forEach(function(n) {
        func.add_node(nodes[n]);
    });

    edges.forEach(function(e) {
        if (e[1]) {
            func.add_edge(nodes[e[0]], nodes[e[1]]);
        }
    });

    func.root = nodes[Object.keys(nodes)[0]];

    console.log('----- result');
    func.nodes.forEach(function(n) {
        console.log('{');
        // console.log('  jump fr: ', b.jump_from.map(function(j) { return '0x' + j.addr.toString(16); }).join(', '));
        // console.log('  jump to: ', b.jump_to.map(function(j) { return '0x' + j.addr.toString(16); }).join(', '));
        // console.log();
        n.data.forEach(function(s) {
            console.log('  ' + s.toString({ human_readable: true }));
        });
        console.log('}');
    });
*/