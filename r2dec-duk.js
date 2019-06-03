/* 
 * Copyright (C) 2018-2019 pancake, deroad, elicn
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

const Graph = require('core2/analysis/graph');

const JSONr2 = require('libdec/json64');
const Decoder = require('core2/frontend/decoder');
const Analyzer = require('core2/frontend/arch/x86/analyzer'); // TODO: does not belong here
const Resolver = require('core2/frontend/resolver');
const SSA = require('core2/analysis/ssa');
const ControlFlow = require('core2/analysis/controlflow');
const CodeGen = require('core2/backend/codegen');

/**
 * Global data accessible from everywhere.
 * @type {Object}
 */
var Global = {
//     context: null,
//     evars: null,
//     printer: null,
//     warning: require('libdec/warning')
};

// ES6 version:
//
// var r2cmdj = function(...args) {
//     var output = r2cmd(args.join(' ')).trim();
//
//     return output ? JSONr2.parse(output) : undefined;
// };

/**
 * Pipes a command to r2 and returns its output as a parsed JSON object
 */
var r2cmdj = function() {
    var output = r2cmd(Array.prototype.slice.call(arguments).join(' ')).trim();

    return output ? JSONr2.parse(output) : undefined;
};

Global['r2cmdj'] = r2cmdj;

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

    // TODO: Duktape Array prototype has no 'find' method. this workaround should be
    // removed when Duktape implements this method for Array prototype.
    // <WORKAROUND>
    this.basic_blocks.find = function(predicate) {
        for (var i = 0; i < this.length; i++) {
            if (predicate(this[i])) {
                return this[i];
            }
        }

        return undefined;
    };
    // </WORKAROUND>

    // the first block provided by r2 is the function's entry block
    this.entry_block = this.basic_blocks[0];

    // a dummy statement that holds all variables referenced in function
    // that were not explicitly initialized beforehand. normally it would
    // consist of the stack and frame pointers, and function parameters
    // this.uninitialized = null;

    // TODO: return_type
}

Function.prototype.getBlock = function(address) {
    return this.basic_blocks.find(function(block) {
        return block.address.eq(address);
    });
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
    this.instructions = r2cmdj('aoj', bb.ninstr, '@', bb.addr);
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

    try {
        var iIj = r2cmdj('iIj');

        if (Decoder.has(iIj.arch)) {
            var afij = r2cmdj('afij').pop();
            var afbj = r2cmdj('afbj');

            if (afij && afbj) {
                // TODO: separate decoding, ssa, controlflow and codegen stages

                var decoder = new Decoder(iIj);
                var analyzer = new Analyzer(decoder.arch);  // TODO: this is a design workaround!
                var resolver = new Resolver(afij);
                var func = new Function(afij, afbj);

                // transform assembly instructions into internal representation
                // this is a prerequisit to ssa-based analysis and optimizations
                func.basic_blocks.forEach(function(bb) {
                    bb.container = decoder.transform_ir(bb.instructions);

                    // perform arch-specific modifications (container)
                    analyzer.transform_step(bb.container);
                });

                // perform arch-specific modifications (whole function)
                analyzer.transform_done(func);

                var ssa = new SSA(func);
                var ssa_ctx;

                // ssa tagging for registers
                ssa_ctx = ssa.rename_regs();
                analyzer.ssa_step(ssa_ctx);

                // ssa tagging for memory dereferences
                ssa_ctx = ssa.rename_derefs();
                analyzer.ssa_step(ssa_ctx);

                analyzer.ssa_done(ssa_ctx);

                // TODO:
                //  - x86: add uninit stack locations for function arguments [cdecl]
                //  - x86: add uninit registers for function arguments [amd64]
                //  - x86: add sp0 def
                //  - make stack var objects before propagating sp0 to tell stack locations from plain pointers

                var cflow = new ControlFlow(func);
                cflow.fallthroughs();
                cflow.conditions();

                var ecj = r2cmdj('ecj');

                console.log(new CodeGen(ecj, resolver).emit_func(func));
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