/* 
 * Copyright (c) 2017-2018, Giovanni Dante Grazioli <deroad@libero.it>
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
            var p = {
                message: '' + err.message,
                stack: '' + err.stack,
                lineNumber: '' + err.lineNumber
            };
            return p;
        }
    } catch (e) {}
    return err;
};

function r2dec_main(filename) {
    try {
        var libdec = require('libdec/libdec');
        var options = {
            theme: "default",
            color: false,
            casts: true,
            assembly: true,
            xrefs: false,
            html: false,
            ident: null
        };
        if (filename) {
            var jsonstr = read_file(filename).trim();
            var data = null;
            try {
                data = libdec.JSON.parse(jsonstr);
            } catch (e) {
                console.log('Broken JSON..');
                return;
            }
            var architecture = libdec.archs[data.arch];
            if (!architecture) {
                console.log(architecture + " is not currently supported.");
                libdec.supported();
            } else {
                var xrefs = data.isj;
                var strings = data.izj;
                var functions = data.aflj;
                var graph = data.agj;

                var routine = libdec.analyzer.make(graph);
                libdec.analyzer.setOptions(options);
                libdec.analyzer.strings(routine, strings);
                libdec.analyzer.functions(routine, functions);
                libdec.analyzer.analyze(routine, architecture);
                libdec.analyzer.xrefs(routine, xrefs);

                routine.print(console.log, options);
            }
        } else {
            console.log('missing JSON to test.');
        }
    } catch (e) {
        console.log('Exception:', e.stack);
    }
}