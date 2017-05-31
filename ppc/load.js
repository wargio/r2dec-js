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
    var load_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[0] + ");";
        } else if (arg[0] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[1] + ");";
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0)
            arg[0] = " - " + Math.abs(arg[0]);
        else
            arg[0] = " + " + arg[0];
        return e[1] + " = *(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ");";
    };

    var store_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[0] + ") = " + e[1] + ";";
        } else if (arg[0] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[1] + ") = " + e[1] + ";";
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0)
            arg[0] = " - " + Math.abs(arg[0]);
        else
            arg[0] = " + " + arg[0];
        return "*(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ") = " + e[1] + ";";
    };

    var load_idx_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        var sbits = bits > 8 ? "((" + s + "int" + bits + "_t*) (" : "";
        if (e[2] == '0') {
            return e[1] + " = *(" + sbits + e[3] + "); // with lock";
        }
        return e[1] + " = *(" + sbits + "(uint8_t*)" + e[2] + " + " + e[3] + (bits > 8 ? ")" : "") + "); // with lock";
    };

    var store_idx_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        if (e[2] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + e[3] + ") = " + e[1] + "; // with lock";
        }
        return "*((" + s + "int" + bits + "_t*) " + "((uint8_t*)" + e[2] + " + " + e[3] + ")) = " + e[1] + "; // with lock";
    };

    var mem = {
        'ld': function(e) {
            return load_bits(e, 64, false);
        },
        'lbzx': function(e) {
            return load_idx_bits(e, 8, true);
        },
        'ldarx': function(e) {
            return load_idx_bits(e, 64, true);
        },
        'ldarx.': function(e) {
            return load_idx_bits(e, 64, true);
        },
        'ldu': function(e) {
            return load_bits(e, 64, true);
        },
        'lwz': function(e) {
            return load_bits(e, 32, true);
        },
        'lwzx': function(e) {
            return load_idx_bits(e, 32, true);
        },
        'lhz': function(e) {
            return load_bits(e, 16, true);
        },
        'lbz': function(e) {
            return load_bits(e, 8, true);
        },
        'std': function(e) {
            return store_bits(e, 64, false);
        },
        'stdcx': function(e) {
            return store_idx_bits(e, 64, false);
        },
        'stdcx.': function(e) {
            return store_idx_bits(e, 64, false);
        },
        'stdu': function(e) {
            return store_bits(e, 64, true);
        },
        'stw': function(e) {
            return store_bits(e, 32, true);
        },
        'sth': function(e) {
            return store_bits(e, 16, true);
        },
        'stb': function(e) {
            return store_bits(e, 8, true);
        },
        'dcbz': function(e) {
            if (e[1] == '0') {
                return "_dcbz (" + e[2] + ');';
            }
            return "_dcbz (" + e[1] + ' + ' + e[2] + ');';
        },
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (mem[e[0]]) {
                l[i].opcode = mem[e[0]](e);
            }
        }
        return l;
    };
})();