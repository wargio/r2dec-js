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

const libdec = require('./libdec/libdec.js');
var fs = require('fs');

function load_text(filename) {
    try {
        return fs.readFileSync(filename, 'utf8');
    } catch (e) {
        console.log(e.message);
        return null;
    }
}

var filename = process.argv[2];

if (filename) {
    const data = libdec.JSON.parse(load_text(filename));
    const architecture = libdec.archs[data.arch];
    if (!architecture) {
        console.log(architecture + " is not currently supported.");
        libdec.supported();
    } else {
        const xrefs = data.isj;
        const strings = data.izj;
        const graph = data.agj;

        let routine = libdec.analyzer.make(graph);

        libdec.analyzer.strings(routine, strings);
        libdec.analyzer.analyze(routine, architecture);
        libdec.analyzer.xrefs(routine, xrefs);

        routine.print(console.log);
    }
} else {
    console.log('node ' + process.argv[1] + ' <test.json>');
}