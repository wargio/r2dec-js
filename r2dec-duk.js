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

/* this is required to be the first thing to be setup
   when there is an exception i want to have the whole
   stack to be printed. */
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

// world data.
var evars = null;
var context = null;
// imports
var libdec = require('libdec/libdec');
var r2util = require('libdec/r2util');

function r2dec_main(args) {
    args.push('--debug')
    try {
        if (r2util.check_args(args)) {
            return;
        }

        evars = new r2util.evars(args);
        r2util.sanitize(true, evars);

        var architecture = libdec.archs[evars.arch];

        if (architecture) {
            var data = new r2util.data();
            context = new libdec.context();
            // af seems to break renaming.
            /* asm.pseudo breaks things.. */
            if (data.graph && data.graph.length > 0) {
                var p = libdec.core.prepare(data);

            } else {
                console.log('Error: no data available.\nPlease analyze the function/binary first.');
            }
        } else {
            console.log(arch + ' is not currently supported.\n' +
                'Please open an enhancement issue at https://github.com/wargio/r2dec-js/issues');
            libdec.supported();
        }
        r2util.sanitize(false, evars);
    } catch (e) {
        r2util.debug(evars, e);
    }
}