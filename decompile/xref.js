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
    var _notstring = "the argument is not a string";
    var _dec = null;
    var _debug = false;
    var _check_string = function(s) {
        if (typeof s !== 'string') {
            throw new Error(_notstring);
        }
    }
    var XRef = function(obj) {
        _check_string(obj.type);
        this.vaddr = obj.vaddr.toUnsigned();
        this.paddr = obj.paddr.toUnsigned();
        if (obj.type === 'ascii' || obj.type === 'wide' || obj.type == 'utf8' ||
            obj.type == 'utf16le' || obj.type == 'utf16be') {
            _check_string(obj.string);
            this.data = "\"" + (new Buffer(obj.string, 'base64')).toString() + "\"";
        } else {
            _check_string(obj.name);
            this.data = obj.name;
        }
        this.type = obj.type.toLowerCase();
        this.size = obj.size;
        if (_debug) {
            this._debug = "" + obj.opcode;
        }
        this.isAt = function(offset) {
            return this.vaddr.eq(offset);
        };
        this.print = function(p, ident) {
            if (!p) p = console.log;
            if (!ident) ident = "";
            if (this.data) {
                if (this.type == 'func') {
                    p(ident + "// XREF: " + this.data.replace(/\./g, '_') + "\n");
                } else {
                    p(ident + "// XREF: " + this.data + "\n");
                }
            }
        };
        this.invalidate = function() {
            this.data = null;
        };
        this.isControlFlow = function() {
            return false;
        };
        this.isInstruction = function() {
            return false;
        };
        this.isXref = function() {
            return true;
        };
        this.toString = function() {
            var r = !this.data ? '' : this.data.replace(/[^\x20-\x7E]/g, '.');
            if (this.type == 'func') {
                return r.replace(/\w+\./, '');
            }
            return r;
        };
    };
    return XRef;
})();