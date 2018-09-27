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
                        addr:       b.addr,
                        jump_to:    b.jump,
                        jump_from:  [],
                        falls_into: b.fail,
                        statements: decoder.transform_ir(aoj),
                    };
                });

                blocks.forEach(function(b) {
                    // look for all blocks b jumps to
                    var jumped_to = blocks.filter(function(bb) {
                        return (b.jump_to && bb.addr.eq(b.jump_to));
                    });

                    // look for all blocks b falls into
                    var fell_into = blocks.filter(function(bb) {
                        return (b.falls_into && bb.addr.eq(b.falls_into));
                    });

                    // add b to those blocks jump_from
                    jumped_to.concat(fell_into).forEach(function(bb) {
                        bb.jump_from.push(b);
                    });

                    // correct block's fields to hold refs rather than addresses
                    b.jump_to = jumped_to;
                    b.falls_into = fell_into;
                });

                console.log('----- tagging');
                SSA.tag_regs(blocks[0]);

                console.log('----- result');
                blocks.forEach(function(b) {
                    console.log('{');
                    console.log('  jump fr: ', b.jump_from.map(function(j) { return '0x' + j.addr.toString(16); }).join(', '));
                    console.log('  jump to: ', b.jump_to.map(function(j) { return '0x' + j.addr.toString(16); }).join(', '));
                    console.log();
                    b.statements.forEach(function(s) {
                        console.log('  ' + s.toString({ human_readable: true }));
                    });
                    console.log('}');
                });
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
