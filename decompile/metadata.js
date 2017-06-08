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
    var _dec = null;
    var Instruction = require('./instruction.js');
    var Metadata = function(data) {
        //Instruction.debug();
        if (!data.name) {
            data.name = 'function_name';
        } else {
            this.name = "" + data.name.replace(/sym\./, '').replace(/[^\w]/, '_');
        }
        this.opcodes = data.ops.filter(function(o){
            return o.opcode != null;
        }).map(function(o) {
            return new Instruction(o);
        });
        this.opcodes = _dec.preprocess(this.opcodes);
    };
    Metadata.setDecompiler = function(dec) {
        dec.utils = {
            conditional: require('./conditional.js'),
            controlflow: require('./controlflow.js'),
            Function: Metadata.Function
        };
        _dec = dec;
        Instruction.setDecompiler(dec);
    };
    Metadata.Function = function(data) {
        this.name = data.name;
        this.returntype = 'void';
        this.args = [];
        this.type = 'function';
        this.opcodes = data.opcodes;
        this.setArg = function(x) {
            if (this.args.indexOf(x) < 0) {
                this.args.push(x);
            }
        };
        this.size = function() {
            return this.opcodes.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                throw new Error('Invalid input Function:get ' + i);
            }
            return this.opcodes[i];
        };
        this.print = function(p) {
            p(this.returntype + ' ' + this.name + '(' + this.args.join(', ') + ') {\n');
            this.opcodes.forEach(function(instr) {
                instr.print(p, '    ', this.type);
            });
            p('}\n');
        };
    };
    return Metadata;
})();