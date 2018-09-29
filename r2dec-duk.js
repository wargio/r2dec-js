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

Duktape.errCreate = function(err) {
    try {
        if (typeof err === 'object') {
            return {
                message: '' + err.message,
                stack: '' + err.stack,
                lineNumber: '' + err.lineNumber
            };
        }
    } catch (e) {
        // nothing
    }

    return err;
};

var JSON = require('libdec/json64');
var Decoder = require('libdec/core/decoder');
var SSA = require('libdec/core/ssa');

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
    try {
        var iIj = r2cmdj('iIj');

        if (iIj.arch in Decoder.archs)
        {
            var decoder = new Decoder.decoder(iIj);
            var afbj = r2cmdj('afbj');

            if (afbj) {
                var blocks = afbj.map(function(b) {
                    var aoj = r2cmdj('aoj', b.ninstr, '@', b.addr);

                    return {
                        address:    b.addr,
                        inbound:    [],
                        outbound:   [b.jump, b.fail].filter(function(ob) { return ob; }),
                        statements: decoder.transform_ir(aoj),
                    };
                });

                blocks.forEach(function(b) {
                    // collect outbound blocks refs
                    var outbound = b.outbound.map(function(ob) {
                        return blocks.filter(function(bb) {
                            return bb.address.eq(ob);
                        })[0];
                    });

                    // let outbound targets know their inbounds
                    outbound.forEach(function(ob) {
                        ob.inbound.push(b);
                    });

                    b.outbound = outbound;
                });

                console.log('[tagging]');
                var tagger = new SSA.tagger(blocks[0]);
                tagger.tag_regs();

                console.log('[result]');
                blocks.forEach(function(b) {
                    console.log('{');
                    console.log('  ib: ', b.inbound.map(function(ib) { return '0x' + ib.address.toString(16); }).join(', '));
                    console.log('  ob: ', b.outbound.map(function(ob) { return '0x' + ob.address.toString(16); }).join(', '));
                    console.log();
                    b.statements.forEach(function(s) {
                        console.log('  ' + s.toString({ human_readable: true }));
                    });
                    console.log('}');
                });
                console.log('\033[1;31mbold red text\033[0m');
            } else {
                console.log('error: no data available; analyze the function / binary first');
            }
        } else {
            console.log('unsupported architecture "' + iIj.arch + '"');
        }
    } catch (e) {
        console.log('\ndecompiler has crashed :(');
        console.log('exception:', e.stack);
    }
}
