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

    var op_bits4 = function(e, op, bits, swap) {
        var a = swap ? 3 : 2;
        var b = swap ? 2 : 3;
        if (e[1] == e[a] && !bits) {
            return e[1] + " " + op + "= " + e[b] + ";";
        }
        return e[1] + " = " + (bits ? '(uint' + bits + '_t) ' : '') + e[a] + " " + op + " " + e[b] + ";";
    };

    var math = {
        'mr': function(e) {
            return e[1] + " = " + e[2] + ";";
        },
        'neg': function(e) {
            return e[1] + " = -" + e[2] + ";";
        },
        'not': function(e) {
            return e[1] + " = !" + e[2] + ";";
        },
        'add': function(e) {
            return op_bits4(e, "+");
        },
        'addi': function(e) {
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
        'sld': function(e) {
            return op_bits4(e, "<<", 64);
        },
        'sldi': function(e) {
            return op_bits4(e, "<<", 64);
        },
        'slw': function(e) {
            return op_bits4(e, "<<", 32);
        },
        'slwi': function(e) {
            return op_bits4(e, "<<", 32);
        },
        'srw': function(e) {
            return op_bits4(e, ">>", 32);
        },
        'srwi': function(e) {
            return op_bits4(e, ">>", 32);
        },
        'srad': function(e) {
            return op_bits4(e, ">>", 64);
        },
        'sradi': function(e) {
            return op_bits4(e, ">>", 64);
        },
        'cntlz': function(e) {
            /*
             int cntlz(u64 value) {
                for (int n = 0; n < 32; n++, value <<= 1) {
                   if (value & 0x8000000000000000) break;
                }
                return n;
             }
             */
            var ret = e[1];
            var reg = e[2];
            return ret + " = (uint64_t) _cntlz(" + reg + ");";
        },
        'cntlzw': function(e) {
            /*
             int cntlz(u32 value) {
                for (int n = 0; n < 32; n++, value <<= 1) {
                   if (value & 0x80000000) break;
                }
                return n;
             }
             */
            var ret = e[1];
            var reg = e[2];
            return ret + " = (uint32_t) _cntlzw(" + reg + ");";
        },
        'extsb': function(e) {
            return e[1] + " = (int64_t) " + e[2] + ";";
        },
        'extsh': function(e) {
            return e[1] + " = (int64_t) " + e[2] + ";";
        },
        'extsw': function(e) {
            return e[1] + " = (int64_t) " + e[2] + ";";
        },
        /*
to be redone. this is wrong.
clrlwi %r0, %r0, 31       # %r0 = %r0 & 1
rldicr %r10, %r10, 24,39  # %r10 = ((%r10 << 24) | (%r10 >> 40)) & 0xFFFFFFFFFF000000
rldicl %r4, %r4, 0,48     # %r4 = %r4 & 0xFFFF
rldicl %r0, %r0, 0,59     # %r0 = %r0 & 0x1F
rldicl %r9, %r9, 61,3     # %r9 = (%r9 >> 3) & 0x1FFFFFFFFFFFFFFF
*/
        'rldic': function(e) {
            return e[1] + ' = rol64(' + e[2] + ', ' + e[3] + ') & ' + e[4] + ';';
        },
        'rldcl': function(e) {
            return e[1] + ' = rol64(' + e[2] + ', ' + e[3] + ') & ' + e[4] + ';';
        },
        'rldicl': function(e) {
            return e[1] + ' = rol64(' + e[2] + ', ' + e[3] + ') & ' + e[4] + ';';
        },
        'rldcr': function(e) {
            return e[1] + ' = rol64(' + e[2] + ', ' + e[3] + ') & ' + e[4] + ';';
        },
        'rldicr': function(e) {
            var res = e[1] + ' = ';
            var rs = e[2];
            var sh = parseInt(e[3]);
            var mb = 0;
            var me = parseInt(e[4]);
            var mask = mask64(mb, me);


            return res + ';';
        },
        'clrlwi': function(e) {
            var res = e[1];
            var rs = e[2];
            var sh = parseInt(e[3]);
            var mask = 0xFFFFFFFF >>> sh;
            e[3] = '0x' + mask.toString(16);
            return op_bits4(e, "&", 32);
        },
        'clrldi': function(e) {
            var res = e[1];
            var rs = e[2];
            var sh = parseInt(e[3]) - 1;
            var mask = [0xFFFFFFFF, 0xFFFFFFFF];
            if (sh >= 31) {
                mask[0] = '';
                mask[1] >>>= (sh - 31);
            } else {
                mask[0] >>>= (sh - 31);
            }
            e[3] = '0x' + mask[0].toString(16) + mask[1].toString(16) + 'll';
            return op_bits4(e, "&", 64);
        },
    };

    var mask32 = function(mb, me) {
        if (mb < me + 1) {
            var mask = 0;
            for (var i = mb; i <= me; ++i) {
                mask |= 1 << (31 - i);
            }
            return mask >>> 0;
        } else if (mb == me + 1) {
            return 0xFFFFFFFF;
        }
        var mask_lo = mask32(0, me);
        var mask_hi = mask32(mb, 31);
        return (mask_lo | mask_hi) >>> 0;
    };

    var mask64 = function(mb, me) {
        if (mb < me + 1) {
            var mask = [0, 0];
            for (var i = mb; i <= me; ++i) {
                if (i > 31)
                    mask[1] |= 1 << (31 - i);
                else
                    mask[0] |= 1 << (31 - i);
            }
            mask[0] >>>= 0;
            mask[1] >>>= 0;
            return mask;
        } else if (mb == me + 1) {
            return [0xFFFFFFFF, 0xFFFFFFFF];
        }
        var mask_lo = mask64(0, me);
        var mask_hi = mask64(mb, 31);
        mask_lo[0] |= mask_hi[0];
        mask_lo[1] |= mask_hi[1];
        mask_lo[0] >>>= 0;
        mask_lo[1] >>>= 0;
        return mask_lo;
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            var op = e[0].replace(/\./, '');
            if (math[op]) {
                //l[i].comments.push(to_asm(e));
                l[i].opcode = math[op](e);
            }
        }
        return l;
    };
})();