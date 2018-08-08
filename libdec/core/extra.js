/* 
 * Copyright (c) 2018, Giovanni Dante Grazioli <deroad@libero.it>
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
    var _standard_types = {
        'void': 0,
        'char': 8,
        'short': 16,
        'long': 32,
        'float': 32,
        'long long': 64,
        'double': 64,
    };

    var _is = {
        string: function(s) {
            return typeof s == 'string';
        },
        number: function(s) {
            return typeof s == 'number';
        },
        array: function(s) {
            return Array.isArray(s);
        },
    };

    var _to = {
        type: function(bits, signed) {
            if (bits == 0) {
                return 'void';
            }
            return (signed ? 'int' : 'uint') + bits + '_t';
        },
        bits: function(type) {
            if (_standard_types[type]) {
                return _standard_types[type];
            }
            if (type == 'int') {
                var bits = Global.evars.archbits;
                return bits < 32 ? 16 : 32;
            }
            return parseInt(type.replace(/[intu_]/g, ''));
        }
    };

    return {
        is: _is,
        to: _to
    };
})();