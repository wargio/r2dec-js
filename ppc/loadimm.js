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
    var to_asm = function (e) {
        var j;
        var asm = e[0] + " ";
        for (j = 1; j < e.length - 1; ++j) {
            asm += e[j] + ", ";
        }
        if (j < e.length)
            asm += e[j];
        return asm.trim();
    };
    var hex4 = function(n) {
        var p = '0000';
        if (!n)
            return p;
        n = (parseInt(n.replace(/-0x/, "0x")) >>> 0).toString(16);
        if (n.length > 4)
            n = n.substr(4, 8);
        return p.substr(n.length, 4) + n;
    };
    var lis64 = function(list, start, elem) {
        var i;
        var reg = elem[1];
        var o = reg + " = ";
        var addr = "0x";
        var check = [
            function(e, r) {
                return e[0] == 'lis' && e[1] == r;
            },
            function(e, r) {
                if (e[0] == 'nop')
                    return true;
                return e[0] == 'ori' && e[1] == r && e[2] == r;
            },
            function(e, r) {
                var p = parseInt(e[3]);
                return e[0] == 'sldi' && e[1] == r && e[2] == r && p == 32;
            },
            function(e, r) {
                return e[0] == 'oris' && e[1] == r && e[2] == r;
            },
            function(e, r) {
                if (e[0] == 'nop')
                    return true;
                return e[0] == 'ori' && e[1] == r && e[2] == r;
            }
        ];
        var address = [
            function(e) {
                return hex4(e[2]);
            },
            function(e) {
                return hex4(e[3]);
            },
            function(e) {
                return "";
            },
            function(e) {
                return hex4(e[3]);
            },
            function(e) {
                return hex4(e[3]);
            }
        ];
        var step = 0;
        for (i = start; i < list.length; ++i) {
            elem = list[i].opcode;
            if (!elem || typeof elem != 'object') {
                continue;
            }
            if (elem[0] == 'lis' && i != start) {
                break;
            }
            if (check[step](elem, reg)) {
                addr += address[step](elem);
                step++;
                list[i].invalidate();
            }
            if (step >= check.length) {
                break;
            }
        }
        if (addr.length == 18)
            o += "(uint64_t) " + addr + ";";
        else if (addr.length == 10)
            o += "(uint32_t) " + addr + ";";
        else
            o += "(uint32_t) " + addr + "0000;";
        list[start].opcode = o;
        return list;
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (e[0] == 'lis') {
                l = lis64(l, i, e);
            } else if (e[0] == 'li') {
                l[i].opcode = e[1] + " = " + e[2] + ";";
            }
        }
        return l;
    };
})();