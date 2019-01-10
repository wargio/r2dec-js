/* 
 * Copyright (C) 2018 pncake, deroad, elicn
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

var Graph = require('core2/analysis/graph');

var JSON = require('libdec/json64');
var Decoder = require('core2/frontend/decoder');
var SSA = require('core2/analysis/ssa');
var ControlFlow = require('core2/analysis/controlflow');
var CodeGen = require('core2/backend/codegen');

/**
 * Global data accessible from everywhere.
 * @type {Object}
 */
// var Global = {
//     context: null,
//     evars: null,
//     printer: null,
//     warning: require('libdec/warning')
// };

// ES6 version:
//
// var r2cmdj = function(...args) {
//     var output = r2cmd(args.join(' ')).trim();
//
//     return output ? JSON.parse(output) : undefined;
// };

/**
 * Pipes a command to r2 and returns its output as a parsed JSON object
 */
var r2cmdj = function() {
    var output = r2cmd(Array.prototype.slice.call(arguments).join(' ')).trim();

    return output ? JSON.parse(output) : undefined;
};

function Function(afij, afbj) {
    this.name = afij.name;
    this.calltype = afij.calltype;

    this.args = Array.prototype.concat(afij.bpvars, afij.spvars, afij.regvars).filter(function(v) {
        return v.kind === 'arg';
    });

    // read and process function's basic blocks
    this.basic_blocks = afbj.map(function(bb) {
        return new BasicBlock(this, bb);
    }, this);

    // the first block provided by r2 is the function's entry block
    this.entry_block = this.basic_blocks[0];

    // a dummy statement that holds all variables referenced in function
    // that were not explicitly initialized beforehand. normally it would
    // consist of the stack and frame pointers, and function parameters
    this.uninitialized = null;

    // TODO: return_type
}

Function.prototype.getBlock = function(address) {
    for (var i = 0; i < this.basic_blocks.length; i++) {
        var block = this.basic_blocks[i];

        if (block.address.eq(address)) {
            return block;
        }
    }

    return undefined;
};

Function.prototype.cfg = function() {
    var nodes = []; // basic blocks
    var edges = []; // jumping, branching or falling into another basic block

    this.basic_blocks.forEach(function(bb) {
        nodes.push(bb.address);

        if (bb.jump) {
            edges.push([bb.address, bb.jump]);
        }

        if (bb.fail) {
            edges.push([bb.address, bb.fail]);
        }
    });

    // set up control flow graph
    return new Graph.Directed(nodes, edges, nodes[0]);
};

function BasicBlock(parent, bb) {
    // parent function object
    this.parent = parent;

    // block starting address
    this.address = bb.addr;

    // 'jump' stands for unconditional jump destination, or conditional 'taken' destination; may be undefined
    // in case the basic block ends with a return statement rather than a goto or branch
    this.jump = bb.jump;

    // 'fail' stands for block fall-through, or conditional 'not-taken' destination; may be undefined in case
    // the basic block ends with an unconditional jump or a return statement
    this.fail = bb.fail;

    // get instructions list
    this.statements = r2cmdj('aoj', bb.ninstr, '@', bb.addr);

    // retrieve the block's last statement; normally this would be either a goto, branch or return statement
    Object.defineProperty(this, 'terminator', {
        get: function() {
            return this.statements[this.statements.length - 1];
        }
    });
}

// this is used to hash basic blocks in arrays and enumerable objects
BasicBlock.prototype.toString = function() {
    var repr = [
        this.constructor.name,
        this.address.toString(16)
    ].join(' ');

    return '[' + repr + ']';
};

/** Javascript entrypoint */
function r2dec_main(args) {

    /**
     * Proposed decompiler workflow:
     *  Read function's basic blocks structure into a graph
     *      Graph analysis needed for SSA: post-domination tree, dominance frontier
     *  Read function's instructions, decode and lift them to internal representation (IR)
     *      IR is composed of expressions and statements, where:
     *          An expression may enclose zero or more operands, which are just other expressions
     *          A statement may enclose zero or more expression; usually it is just one expression
     *          Statements are grouped in a Container that represents a logical block [e.g. a loop body]
     *      Each instruction is lifted to a list of zero or more expressions or statements
     *          Some of the expressions and statements may be architecture-specific
     *      Each expression is wrapped by a statement for simplicity
     *      Each indevidual statement goes through simplification / relaxation routines
     *          Architecture-specific statements may go through additional simplification routines set, dedicated to arch
     *  IR is tagged by SSA to enable context-aware optimizations
     *  IR goes through several optimization routines repeatedly until it cannot be optimized any further
     *      Constant propagation and elimination
     *      Common subexpression elimination
     *      Dead code elimination
     *  Resolve and propagate r2 flags [variables, names, labels, strings, ...]
     *  Propagate types to help code generator get expressions in the right context [integers, chars, arrays, structures fields ... ]
     *  Build control flow [conditions and loops] out of funcion's statements; containers might be coalesced
     *  Generate and output C code
     *      [(!) currently not sure whether codegen should decide how to emit the code, or get of exprs to emit their own toString]
     */

    try {
        // <TEST>
        /*
        // // dfs and dom test
        // var ns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
        // var es = [
        //             ['A', 'B'], ['A', 'C'],
        //             ['B', 'D'], ['B', 'G'],
        //             ['C', 'E'], ['C', 'H'],
        //             ['D', 'F'], ['D', 'G'],
        //             ['E', 'C'], ['E', 'H'],
        //             ['F', 'I'], ['F', 'K'],
        //             ['G', 'J'],
        //             ['H', 'M'],
        //             ['I', 'L'],
        //             ['J', 'I'],
        //             ['K', 'L'],
        //             ['L', 'M'], ['L', 'B']
        //         ];

        // // dominanceFrontier test 1
        // var ns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
        // var es = [
        //     ['1', '2'], ['1', '5'], ['1', '9'],
        //     ['2', '3'],
        //     ['3', '3'], ['3', '4'],
        //     ['4', '13'],
        //     ['5', '6'], ['5', '7'],
        //     ['6', '4'], ['6', '8'],
        //     ['7', '8'], ['7', '12'],
        //     ['8', '5'], ['8', '13'],
        //     ['9', '10'], ['9', '11'],
        //     ['10', '12'],
        //     ['11', '12'],
        //     ['12', '13']
        // ];

        // we decorate to indices seen as strings; e.g. index "0" won't become index 0, and so on
        var decorate = function(s) { return s + '.'; };
        ns = ns.map(decorate);
        es = es.map(function(e) { return e.map(decorate); });

        var cfg = new Graph.Directed(ns, es, ns[0]);
        console.log();
        console.log('cfg:');
        console.log(cfg.toString());

        var dfs = new Graph.DFSpanningTree(cfg);
        console.log();
        console.log('depth-first spanning tree:');
        console.log(dfs.toString());

        var dom = new Graph.DominatorTree(cfg);
        console.log();
        console.log('dominance tree:');
        console.log(dom.toString());

        console.log();
        console.log('dom frontiers:');
        dom.iterNodes().forEach(function(n) {
            console.log(n.key, '::', dom.dominanceFrontier(n).map(function(d) { return d.key; }));
        });

        return;
        */
        // </TEST>

        var iIj = r2cmdj('iIj');

        if (Decoder.has(iIj.arch))
        {
            var afij = r2cmdj('afij');
            var afbj = r2cmdj('afbj');

            if (afij && afbj) {
                var decoder = new Decoder(iIj);
                var func = new Function(afij.pop(), afbj);

                // transform assembly instructions into internal representation
                // this is a prerequisit to ssa-based analysis and optimizations
                func.basic_blocks.forEach(function(bb) {
                    bb.statements = decoder.transform_ir(bb.statements);

                    // TODO: this is a workaround until we work with Containers
                    // <WORKAROUND>
                    bb.statements.forEach(function(s) {
                        s.container = bb;
                    });
                    // </WORKAROUND>
                });

                var ssa = new SSA(func);
                var defs = ssa.rename_variables();

                // ControlFlow.run(func);

                console.log(new CodeGen(func).emit());
            } else {
                console.log('error: no data available; analyze the function / binary first');
            }
        } else {
            console.log('unsupported architecture "' + iIj.arch + '"');
        }
    } catch (e) {
        console.log('\ndecompiler has crashed ¯\\_(ツ)_/¯');
        console.log('exception:', e.stack);
    }
}