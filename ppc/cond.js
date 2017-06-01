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
    var label_cond_cnt = 0;
    var to_asm = function(e) {
        var j;
        var asm = e[0] + " ";
        for (j = 1; j < e.length - 1; ++j) {
            asm += e[j] + ", ";
        }
        if (j < e.length)
            asm += e[j];
        return asm;
    };

    var branch = {
        'bne': 'EQ',
        'bne-': 'EQ',
        'bne+': 'EQ',
        'beq': 'NE',
        'beq-': 'NE',
        'beq+': 'NE',
        'bgt': 'LE',
        'bgt-': 'LE',
        'bgt+': 'LE',
        'bge': 'LT',
        'bge-': 'LT',
        'bge+': 'LT',
        'blt': 'GE',
        'blt-': 'GE',
        'blt+': 'GE',
        'ble': 'GT',
        'ble-': 'GT',
        'ble+': 'GT',
    };

    var compare = function(l, start, bits) {
        if (!bits)
            bits = "";
        else {
            bits = "(" + bits + ") ";
        }
        var e = l[start].opcode;
        var cr = 'cr0';
        var a = null;
        var b = null;
        var implicit = false;
        if (e.length == 3) {
            implicit = true;
            a = "(" + bits + e[1] + ")";
            b = e[2].charAt(0) == 'r' ? "(" + bits + e[2] + ")" : e[2];
        } else {
            cr = e[1];
            a = "(" + bits + e[2] + ")";
            b = e[3].charAt(0) == 'r' ? "(" + bits + e[3] + ")" : e[3];
        }
        //l[start].comments.push(cr + ' = cmp(' + a + ', ' + b + ')');
        for (var i = start + 1; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (implicit && implicit_cmp[e[0]] && implicit_cmp[e[0]](e)) {
                //be sure that there is not another cmp with same cr
                break;
            } else if (e[0].indexOf('cmp') >= 0 && e[1] == cr) {
                //be sure that there is not another cmp with same cr
                break;
            }
            if (branch[e[0]]) {
                if (implicit && e.length != 2) {
                    continue;
                } else if (!implicit && e[1] != cr) {
                    continue;
                }
                //l[i].comments.push(to_asm(e));
                l[i].opcode = null;
                l[i].cond = {
                    a: a,
                    b: b,
                    cmp: branch[e[0]]
                };
                l[start].opcode = null;
            }
        }
        return l;
    };

    var implicit_cmp = {
        'cmplw': function(e) {
            return e.length == 3;
        },
        'cmplwi': function(e) {
            return e.length == 3;
        },
        'cmpldi': function(e) {
            return e.length == 3;
        },
        'cmpd': function(e) {
            return e.length == 3;
        },
        'cmpdi': function(e) {
            return e.length == 3;
        },
        'cmpw': function(e) {
            return e.length == 3;
        },
        'cmpwi': function(e) {
            return e.length == 3;
        },
        'cmph': function(e) {
            return e.length == 3;
        },
        'cmphi': function(e) {
            return e.length == 3;
        },
        'cmpb': function(e) {
            return e.length == 3;
        },
        'cmpbi': function(e) {
            return e.length == 3;
        },
    };

    var cmps = {
        'cmplw': function(l, start) {
            return compare(l, start, "int32_t");
        },
        'cmplwi': function(l, start) {
            return compare(l, start, "int32_t");
        },
        'cmpld': function(l, start) {
            return compare(l, start, "int64_t");
        },
        'cmpldi': function(l, start) {
            return compare(l, start, "int64_t");
        },
        'cmpd': function(l, start) {
            return compare(l, start, "int64_t");
        },
        'cmpdi': function(l, start) {
            return compare(l, start, "int64_t");
        },
        'cmpw': function(l, start) {
            return compare(l, start, "int32_t");
        },
        'cmpwi': function(l, start) {
            return compare(l, start, "int32_t");
        },
        'cmph': function(l, start) {
            return compare(l, start, "int16_t");
        },
        'cmphi': function(l, start) {
            return compare(l, start, "int16_t");
        },
        'cmpb': function(l, start) {
            return compare(l, start, "int8_t");
        },
        'cmpbi': function(l, start) {
            return compare(l, start, "int8_t");
        },
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (e.length > 0) {
                if (cmps[e[0]]) {
                    l = cmps[e[0]](l, i);
                } else if (e[0].indexOf('.') > 0) {
                    l[i].opcode = ['', e[1], '0'];
                    l = compare(l, i);
                    l[i].opcode = e;
                }
            }
        }
        return l;
    };
})();
