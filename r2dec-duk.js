/* 
 * Copyright (c) 2017-2018, pancake <pancake@nopcode.org>, Giovanni Dante Grazioli <deroad@libero.it>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

var JSON = require('libdec/json64');
var Decoder = require('core2/frontend/decoder');
var SSA = require('core2/analysis/ssa');
var Stmt = require('core2/analysis/ir/statements');
var ControlFlow = require('core2/analysis/controlflow');
var CodeGen = require('core2/backend/codegen');

/**
 * Global data accessible from everywhere.
 * @type {Object}
 */
var Global = {
    context: null,
    evars: null,
    printer: null,
    warning: require('libdec/warning')
};

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
        var iIj = r2cmdj('iIj');

        if (Decoder.has(iIj.arch))
        {
            var afbj = r2cmdj('afbj');

            if (afbj) {
                var decoder = new Decoder(iIj);

                // read function's basic blocks
                var bblocks = afbj.map(function(bb) {
                    var aoj = r2cmdj('aoj', bb.ninstr, '@', bb.addr);

                    return {
                        address:    bb.addr,
                        inbound:    [],
                        outbound:   [bb.jump, bb.fail].filter(function(ob) { return ob; }),
                        statements: decoder.transform_ir(aoj),
                    };
                });

                // now that all basic blocks are created, we can link them
                bblocks.forEach(function(b) {
                    // collect outbound blocks refs
                    var outbound = b.outbound.map(function(ob) {
                        return bblocks.filter(function(bb) {
                            return bb.address.eq(ob);
                        })[0];
                    });

                    // let outbound targets know their inbounds
                    outbound.forEach(function(ob) {
                        ob.inbound.push(b);
                    });

                    b.outbound = outbound;
                });

                // console.log('[tagging]');
                // var tagger = new SSA.tagger(blocks[0]);
                // tagger.tag_regs();

                console.log('[result]');
                var afij = r2cmdj('afij').pop();
                var func = {
                    rettype: 'void',    // TODO
                    name:    afij.name,
                    bpvars:  afij.bpvars,
                    spvars:  afij.spvars,
                    regvars: afij.regvars,

                    entry_block: undefined,
                    blocks: {}
                };

                bblocks.forEach(function(bb) {
                    func.blocks[bb.address] = {
                        func: func,
                        container: new Stmt.Container(bb, bb.statements)
                    };
                });

                func.entry_block = func.blocks[bblocks[0].address];

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
