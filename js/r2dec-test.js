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

/**
 * Global data accessible from everywhere.
 * @type {Object}
 */
var Global = {
    context: null,
    evars: null,
    printer: null
};

/**
 * Imports.
 */
var libdec = require('libdec/libdec');
var r2util = require('libdec/r2util');

/**
 * r2dec main function.
 * @param  {String} filename - Issue filename to analyze (relative/fullpath)
 */
function r2dec_main(filename) {
    try {
        // imports
        var Printer = require('libdec/printer');
        if (filename) {
            var jsonstr = read_file(filename).trim();
            var data = r2util.dataTestSuite(jsonstr);
            Global.evars = new r2util.evarsTestSuite(data);
            Global.argdb = data.argdb;
            Global.printer = new Printer();

            var architecture = libdec.archs[data.arch];
            Global.context = new libdec.context();
            // af seems to break renaming.
            /* asm.pseudo breaks things.. */
            if (data.graph && data.graph.length > 0) {
                var p = new libdec.core.session(data, architecture);
                var arch_context = architecture.context(data);
                libdec.core.analysis.pre(p, architecture, arch_context);
                libdec.core.decompile(p, architecture, arch_context);
                libdec.core.analysis.post(p, architecture, arch_context);
                libdec.core.print(p);
            } else {
                console.log('Error: no data available.\nPlease analyze the function/binary first.');
            }
        } else {
            console.log('missing JSON to test.');
        }
    } catch (e) {
        console.log('Exception:', e.stack);
    }
}