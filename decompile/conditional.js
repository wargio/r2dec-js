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
    var _debug = false;
    var _notanarray = "the argument is not an array.";
    var _notstring = "the argument is not a string";
    var _notanobject = "the argument is not an object";
    var _check_array = function(a) {
        if (!Array.isArray(a)) {
            throw new Error(_notanarray);
        }
    };
    var _check_string = function(s) {
        if (typeof s !== 'string') {
            throw new Error(_notstring);
        }
    };
    var _check_object = function(cond) {
        if (typeof cond !== 'object') {
            throw new Error(_notanobject);
        }
    };
    var _cmps = {
        INF: '',
        EQ: ' == ',
        NE: ' != ',
        LT: ' < ',
        LE: ' <= ',
        GT: ' > ',
        GE: ' >= '
    };
    var _cmps_inv = {
        INF: '',
        EQ: ' != ',
        NE: ' == ',
        LT: ' >= ',
        LE: ' > ',
        GT: ' <= ',
        GE: ' < '
    };
    var Conditional = function(name, start, end, cond, invert) {
        this.instructions = [];
        this.type = name;
        this.offset = start.toUnsigned();
        this.end = end.toUnsigned();
        this.conditional = cond;
        this.used = false;
        this.invert = invert ? true : false;
        this.header = '{';
        this.trailer = '}';
        if (_debug) {
            this._debug = this.offset.toString(16) + " - " + this.end.toString(16);
        }
        this.isAt = function(offset) {
            return this.offset.gte(offset) && this.end.lte(offset);
        };
        this.find = function(offset) {
            if (this.offset.gte(offset) && this.end.lte(offset)) {
                return null;
            }
            for (var i = 0; i < this.instructions.length; i++) {
                if (this.instructions[i].isAt(offset)) {
                    return this.instructions[i];
                }
            };
            return null;
        };
        this.get = function(index) {
            if (index < 0 || index >= this.instructions.length) {
                return null;
            }
            return this.instructions[index];
        };
        this.setUsed = function() {
            this.used = true;
        }
        this.addElements = function(elements) {
            _check_array(elements);
            this.instructions = this.instructions.concat(elements);
        };
        this.print = function(p, ident) {
            if (!p) p = console.log;
            if (!ident) ident = "";
            if (this._debug) {
                p(ident + "// " + this._debug + "\n");
            }
            var comp = '';
            if (this.conditional) {
                comp = this.conditional.a.toString();
                comp += (this.invert ? _cmps_inv[this.conditional.cmp] : _cmps[this.conditional.cmp]);
                comp += this.conditional.b.toString();
            }
            p(ident + this.header.replace(/#/g, comp) + '\n');
            this.instructions.forEach(function(op) {
                op.print(p, ident + '    ', this.type);
            });
            p(ident + this.trailer.replace(/#/g, comp) + '\n');
        };
        this.setHeader = function(x) {
            _check_string(x);
            this.header = x;
        };
        this.setTrailer = function(x) {
            _check_string(x);
            this.trailer = x;
        };
        this.isControlFlow = function() {
            return true;
        };
        this.isInstruction = function() {
            return false;
        };
    };
    Conditional.debug = function() {
        _debug = true;
    }
    return Conditional;
})();