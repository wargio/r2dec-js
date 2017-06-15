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
    var _notobject = "the argument is not an object";
    var _dec = null;
    var _debug = false;
    var _check_string = function(s) {
        if (typeof s != 'string') {
            throw new Error(_notstring);
        }
    };
    var _check_object = function(s) {
        if (typeof s != 'object') {
            throw new Error(_notobject);
        }
    };
    var Instruction = function(obj) {
        if (!obj.opcode) {
            throw new Error("Invalid opcode: " + obj.opcode);
        }
        this.comments = [];
        this.opcode = _dec.prepare(obj.opcode);
        this.type = "" + obj.type;
        this.offset = obj.offset.toUnsigned();
        this.jump = obj.jump ? obj.jump.toUnsigned() : null;
        this.pointer = obj.ptr ? obj.ptr.toUnsigned() : null;
        if (this.type.indexOf('call') >= 0 && !this.pointer && obj.jump) {
            this.pointer = obj.jump.toUnsigned();
        }
        this.size = obj.size;
        this.cond = null;
        this.label = null;
        this.used = false;
        this.xref = null;
        if (_debug) {
            this._debug = "" + obj.opcode;
        }
        this.isAt = function(offset) {
            return this.offset.eq(offset);
        };
        this.setUsed = function() {
            this.used = true;
        };
        this.addComment = function(comment) {
            _check_string(comment);
            this.comments.push(comment);
        };
        this.needsXRef = function() {
            return this.pointer ? true : false;
        };
        this.setXRef = function(xref) {
            _check_object(xref);
            this.xref = xref;
            this.pointer = null;
        };
        this.getXRef = function() {
            return this.xref;
        };
        this.print = function(p, ident) {
            if (!p) p = console.log;
            if (!ident) ident = "";
            this.comments.forEach(function(comment) {
                p(ident + "// " + comment + "\n");
            });
            if (this.label) p(this.label + "\n");
            if (this._debug) {
                if (this.xref) this.xref.print(p, ident);
                p(ident + "// " + this.offset.toString(16) + ": " + this._debug + "\n");
            }
            if (this.opcode) p(ident + this.opcode + "\n");
        };
        this.setConditional = function(a, b, cmp) {
            if (a && b && cmp) {
                this.cond = {
                    a: a,
                    b: b,
                    cmp
                };
            } else {
                this.cond = null;
            }
        };
        this.setLabel = function(enable) {
            this.label = enable ? "label_" + this.offset.toString(16).replace(/0x/, '') + ":" : null;
        };
        this.invalidate = function() {
            this.opcode = null;
        };
        this.isControlFlow = function() {
            return false;
        };
        this.isInstruction = function() {
            return true;
        };
        this.setGoto = function() {
            if (this.jump) {
                this.opcode = 'goto label_' + this.jump.toString(16).replace(/0x/, '');
            }
        };
        this.toAsm = function(divider) {
            this.opcode = Instruction.toAsm(this.opcode, divider);
        };
    };
    Instruction.toAsm = function(opcode, divider) {
        if (!Array.isArray(opcode)) {
            return opcode;
        }
        return "__asm(\"" + opcode.join(typeof divider === 'string' ? divider : ', ') + "\");";
    };
    Instruction.debug = function() {
        _debug = true;
    }
    Instruction.setDecompiler = function(dec) {
        _dec = dec;
    }
    return Instruction;
})();