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
    var op_bits4 = function(e, op, bits, unsigned, swap) {
        var a = swap ? 3 : 2;
        var b = swap ? 2 : 3;
        if (e[2] == 'zero') {
            return e[1] + " = " + e[3] + ";";
        } else if (e[1] == e[a] && !bits) {
            return e[1] + " " + op + "= " + e[b] + ";";
        }
        return e[1] + " = " + (bits ? '(' + (unsigned ? 'uint' : 'int') + bits + '_t) ' : '') + e[a] + " " + op + " " + e[b] + ";";
    };
    var math = {
        'nop': function(e) {
            return null;
        },
        'lui': function(e) {
            if (e[2] == 'zero') {
                e[2] = "0";
            }
            return e[1] + " = " + e[2] + ";";
        },
        'move': function(e) {
            if (e[2] == 'zero') {
                e[2] = "0";
            }
            return e[1] + " = " + e[2] + ";";
        },
        'neg': function(e) {
            if (e[2] == 'zero') {
                e[2] = "0";
            }
            return e[1] + " = -" + e[2] + ";";
        },
        'not': function(e) {
            if (e[2] == 'zero') {
                e[2] = "0";
            }
            return e[1] + " = !" + e[2] + ";";
        },
        'add': function(e) {
            return op_bits4(e, "+");
        },
        'addi': function(e) {
            return op_bits4(e, "+");
        },
        'addiu': function(e) {
            return op_bits4(e, "+");
        },
        'addu': function(e) {
            return op_bits4(e, "+");
        },
        'addis': function(e) {
            e[3] += '0000';
            return op_bits4(e, "+");
        },
        'sub': function(e) {
            return op_bits4(e, "-", false, true);
        },
        'subc': function(e) {
            return op_bits4(e, "-", false, true);
        },
        'subf': function(e) {
            return op_bits4(e, "-", false, true);
        },
        'xor': function(e) {
            return op_bits4(e, "^");
        },
        'xori': function(e) {
            return op_bits4(e, "^");
        },
        'or': function(e) {
            return op_bits4(e, "|");
        },
        'ori': function(e) {
            return op_bits4(e, "|");
        },
        'oris': function(e) {
            e[3] += '0000';
            return op_bits4(e, "|");
        },
        'and': function(e) {
            return op_bits4(e, "&");
        },
        'andi': function(e) {
            return op_bits4(e, "&");
        },
        'sll': function(e) {
            return op_bits4(e, "<<");
        },
        'sllv': function(e) {
            return op_bits4(e, "<<");
        },
        'sra': function(e) {
            return op_bits4(e, ">>");
        },
        'srl': function(e) {
            return op_bits4(e, ">>");
        },
        'srlv': function(e) {
            return op_bits4(e, ">>");
        },
        'slt': function(e) {
            if (e[3] == 'zero') {
                e[3] = "0";
            }
            return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
        },
        'slti': function(e) {
            if (e[3] == 'zero') {
                e[3] = "0";
            }
            return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
        },
        'sltu': function(e) {
            if (e[3] == 'zero') {
                e[3] = "0";
            }
            return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
        },
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (e.length > 0) {
                var op = e[0].replace(/\./, '');
                if (math[op]) {
                    l[i].opcode = math[op](e);
                }
            }
        }
        return l;
    };
})();