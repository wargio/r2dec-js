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

    var memoryload = function(e) {
        var types = {
            'byte': 'int8_t',
            'word': 'int16_t',
            'dword': 'int32_t',
            'qword': 'int64_t'
        }
        if (types[e[1]]) {
            return ["*((" + types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ")", e[3]];
        } else if (types[e[2]]) {
            return [e[1], "*((" + types[e[2]] + "*) " + e[3].replace(/\[|\]/g, '') + ")"];
        }
        return [e[1], e[2]];
    }

    var conditional = function(a, b, l, start) {
        for (var i = start + 1; i < l.length; i++) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (cmps[e[0]]) {
                break;
            } else if (branches[e[0]]) {
                l[i].cond = {
                    a: a,
                    b: b,
                    cmp: branches[e[0]]
                };
                l[start].invalidate();
                l[i].invalidate();
            }
        }
        return l;
    }

    var compare = function(l, start) {
        var e = l[start].opcode;
        var a = e[1];
        var b = e[2];
        if (e.length == 4) {
            var m = memoryload(e);
            a = m[0];
            b = m[1];
        }
        return conditional(a, b, l, start);
    }


    var cmps = {
        cmp: function(l, start) {
            return compare(l, start);
        },
        test: function(l, start) {
            var e = l[start].opcode;
            if (e[1] == e[2]) {
                return conditional(e[1], "0", l, start);
            }
            return conditional("(" + e[1] + " & " + e[2] + ")", "0", l, start);
        },
    };

    var branches = {
        'jne': 'EQ',
        'je': 'NE',
        'ja': 'LE',
        'jb': 'GE',
        'jbe': 'GT',
        'jg': 'LE',
        'jge': 'LT',
        'jle': 'GT',
        'jl': 'GE',
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (cmps[e[0]]) {
                l = cmps[e[0]](l, i);
            }
        }
        return l;
    };
})();