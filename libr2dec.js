/* 
 * Copyright (c) 2017, Giovanni Dante Grazioli <deroad@libero.it>
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

module.exports = (function() {
    var Metadata = require('./decompile/metadata.js');
    var ControlFlows = require('./decompile/controlflows.js');
    var Json64 = require('./decompile/json64.js');
    var supported_archs = {};
    supported_archs.ppc = require('./ppc/interface.js');
    supported_archs.x86intel = require('./x86intel/interface.js');
    supported_archs.mips = require('./mips/interface.js');
    var r2dec = function(arch) {
        if (!supported_archs[arch]) {
            throw new Error("Unsupported architecture: '" + arch + "'");
        }
        this.todo = [];
        this.arch = supported_archs[arch];
        this.dec = new this.arch();
        this.arch.setControlFlows(ControlFlows);
        this.arch.setMetadata(Metadata);
        Metadata.setDecompiler(this.dec);
        this.addMetadata = function() {
            this.todo = this.todo.concat(arguments);
        };
        this.work = function(data) {
            if (typeof data === 'string') {
                data = Json64.parse(data);
            }
            var meta = new Metadata(data);
            this.todo.forEach(function(o) {
                meta.add(o);
            });
            meta.preprocess();
            return meta.analyze();
        }
    }
    r2dec.exists = function(arch) {
        return supported_archs[arch] != null;
    };
    r2dec.supported = function(ident) {
        if (!ident) {
            ident = '';
        }
        console.log(ident + 'Supported architectures:')
        for (var arch in supported_archs) {
            console.log(ident + '    ' + arch);
        }
    };
    return r2dec;
})();