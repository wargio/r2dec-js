module.exports = (function() {

    /**
     * Abstract syntax tree node.
     * @param {Number} type - Is one of the AstNode.TYPE_* values.
     * @param {Any}    data - Any extra data required by the node.
     */
    var AstNode = function(type, data) {
        this.type = type;
        this.data = data;
        this.label = null;
        this.nodes = [];
    };

    /**
     * AstNode types
     * @type {Number}
     */
    AstNode.TYPE_FUNCTION /* */ = 0x00; // c_type name (args) {}
    AstNode.TYPE_OPERATION /**/ = 0x01; // && ||
    AstNode.TYPE_CONDITION /**/ = 0x02; // A cond B or !A
    AstNode.TYPE_VARIABLE /* */ = 0x03; // A
    AstNode.TYPE_GOTO /*     */ = 0x04; // goto label
    AstNode.TYPE_CODEBLOCK /**/ = 0x05; // block with instructions
    AstNode.TYPE_RETURN /*   */ = 0x06; // return [A]
    AstNode.TYPE_WHILE /*    */ = 0x07; // while (cond) {}
    AstNode.TYPE_DOWHILE /*  */ = 0x08; // do {} while (cond)
    AstNode.TYPE_IF /*       */ = 0x09; // if {} [else if {}] [else {}] 
    AstNode.TYPE_SWITCH /*   */ = 0x0A; // switch {}
    AstNode.TYPE_CASE /*     */ = 0x0B; // switch { case N: }
    AstNode.TYPE_DEFAULT /*  */ = 0x0C; // switch { default: }

    /**
     * Creates the padding.
     * @param  {Number} depth - Depth
     * @return {String}       - Padding
     */
    var _pad = function(depth) {
        return '    '.repeat(depth);
    };

    /**
     * Generates the condition for a conditional branch.
     * @param  {Array}  conds - Conditions
     * @return {String}       - 
     */
    var _condition = function(node) {
        if (node.type == AstNode.TYPE_VARIABLE) {
            return node;
        } else if (node.type == AstNode.TYPE_VARIABLE) {
            return node;
        }
        var buf = '(';
        for (var i = 0; i < node.nodes.length; i++) {
            if (node.nodes[i] instanceof AstNode) {
                buf += _condition()
            }
        }
        return buf + ')';
    };

    /**
     * Visits each node and prints the data.
     * @param  {AstNode} node  - AstNode 
     * @param  {Number}  depth - Node depth.
     */
    var _visit_node = function(node, depth) {
        if (!node) return;
        var data = node.data;
        switch (node.type) {
            case AstNode.TYPE_FUNCTION:
                console.log(data.returns + ' ' + data.name + '(' + data.args.join(', ') + ') {');
                break;
            case AstNode.TYPE_GOTO:
                data.block.emit(depth);
                console.log(_pad(depth) + 'goto ' + data.goto.label + ';');
                return; // no need to go deeper
            case AstNode.TYPE_CODEBLOCK:
                data.emit(depth);
                return; // no need to go deeper
            case AstNode.TYPE_RETURN:
                console.log(_pad(depth) + 'return ' + (data ? data : '') + ';');
                break;
            case AstNode.TYPE_WHILE:
                console.log(_pad(depth) + 'while ' + _condition(data) + ' {');
                break;
            case AstNode.TYPE_DOWHILE:
                console.log(_pad(depth) + 'do {');
                break;
            case AstNode.TYPE_IF:
                console.log(_pad(depth) + 'while ' + _condition(data) + ' {');
                break;
            case AstNode.TYPE_SWITCH:
                console.log(_pad(depth) + 'switch ' + _condition(data) + ' {');
                break;
            case AstNode.TYPE_CASE:
                console.log(_pad(depth) + 'case ' + data + ':');
                break;
            case AstNode.TYPE_DEFAULT:
                console.log(_pad(depth) + 'default:');
                break;
            default:
                console.log('Bad type: ' + node.type);
                return;
        }
        if (node.label) {
            console.log(_pad(1) + node.label + ':');
        }
        for (var i = 0; i < node.nodes.length; i++) {
            _visit_node(node.nodes[i], depth + 1);
        }
        switch (node.type) {
            case AstNode.TYPE_CASE:
            case AstNode.TYPE_DEFAULT:
            case AstNode.TYPE_CODEBLOCK:
                break;
            case AstNode.TYPE_DOWHILE:
                console.log(_pad(depth) + '} while ' + _condition(data) + ';');
                break;
            default:
                console.log(_pad(depth) + '}');
                break;
        }
    };

    /** Prints the Ast node data. */
    AstNode.run = function(ast_root) {
        _visit_node(ast_root, 0);
    };

    return AstNode;
})();