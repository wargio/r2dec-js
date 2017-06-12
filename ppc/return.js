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
    var label_cnt = 0;
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

    var mem = {
        'b': function(l, start) {
            var i;
            var offset = 'label_' + l[start].jump.toString(16).replace(/0x/, '');
            for (var i = 0; i < l.length; i++) {
                if (start == i) continue;
                if (l[i].offset.eq(l[start].jump)) {
                    l[i].setLabel(true);
                    break;
                }
            };
            l[start].opcode = 'goto ' + offset + ';';
            return l;
        },
        'bdnz': function(l, start) {
            l[start].invalidate();
            l[start].cond = {
                a: '(--ctr)',
                b: '0',
                cmp: 'NE'
            };
            return l;
        },
        'blr': function(l, start) {
            var r3 = false;
            for (var i = l.length - 1; i >= 0; i--) {
                if (!l[i]) break;
                var e = l[i].opcode;
                if (e.indexOf('r3 =')) {
                    r3 = true;
                    break;
                }
            };
            l[start].opcode = "return" + (r3 ? " r3" : "") + ";";
            return l;
        },
        'bl': function(l, start) {
            var fcn = l[start].opcode[1].replace(/\./g, '_');
            if (fcn.indexOf('0x') == 0) {
                fcn = fcn.replace(/0x/, 'fcn_');
            }
            l[start].opcode = fcn + " ();";
            return l;
        },
        'mtlr': function(l, start) {
            var e = l[start].opcode;
            var reg = e[1];
            if (reg != 'r0') {
                l[start].opcode = "void (*p)(void) = " + reg + ";";
            } else {
                l[start].invalidate();
            }
            for (var i = start + 1; i < l.length; ++i) {
                e = l[i].opcode;
                if (e[0] == 'blr' || e[0] == 'blrl') {
                    if (reg != 'r0') {
                        l[i].opcode = "p (" + (reg != 'r3' ? "r3" : "") + ");";
                    } else {
                        l[i].opcode = 'return' + (reg != 'r3' ? " r3;" : ";");
                    }
                    break;
                }
            }
            return l;
        },
        'rfid': function(l, start) {
            l[start].comments.push('returns from Interrupt');
            l[start].opcode = "_rfid ();";
            return l;
        },
        'bctrl': function(l, start) {
            var e = l[start].opcode;
            var reg = "";
            for (var i = start; i > start - 8; --i) {
                e = l[i].opcode;
                if (e[0] == 'mtctr') {
                    reg = e[1];
                    l[i].opcode = "void (*p)(void) = " + reg + ";";
                    break;
                }
            }
            l[start].opcode = "p (" + (reg != 'r3' ? "r3" : "") + ");";
            return l;
        },
    };
    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (mem[e[0]] != null) {
                l = mem[e[0]](l, i);
            }
        }
        return l;
    };
})();