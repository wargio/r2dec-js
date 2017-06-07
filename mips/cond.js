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
    /*
beqz
bgez
bltz
bne
bnez
jr
lbu
lui
lw
move
nop
sb
sw
*/

    var compare = function(l, start, cmp, zero) {
        var e = l[start].opcode;
        l[start].opcode = null;
        l[start].cond = {
            a: e[1],
            b: zero ? "0" : e[2],
            cmp: cmp
        };
        /*
        // delayed branch, so the next instr is still executed.
        var e = l[start];
        l[start] = l[start + 1];
        if (l[start]) {
            l[start + 1] = e;
            //e = l[start + 1].offset;
            //l[start + 1].offset = l[start].offset;
            //l[start].offset = e;
        } else {
            //this should never happen, but let's add it anyway..
            l[start] = e;
        }
        */
        return l;
    };

    var branch = {
        'beqz': function(l, start) {
            return compare(l, start, 'NE', true);
        },
        'bnez': function(l, start) {
            return compare(l, start, 'EQ', true);
        },
        'bltz': function(l, start) {
            return compare(l, start, 'GE', true);
        },
        'blez': function(l, start) {
            return compare(l, start, 'GT', true);
        },
        'bgtz': function(l, start) {
            return compare(l, start, 'LE', true);
        },
        'bgez': function(l, start) {
            return compare(l, start, 'LT', true);
        },
        'beq': function(l, start) {
            return compare(l, start, 'NE', false);
        },
        'bne': function(l, start) {
            return compare(l, start, 'EQ', false);
        }
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object' || e.length == 0) {
                continue;
            }
            if (branch[e[0]]) {
                l = branch[e[0]](l, i);
            }
        }
        return l;
    };
})();