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
    var not64bit = "argument not a 64 bit number.";
    var notinstance = "argument not instance of uint64.";
    var notnumber = "argument not Number.";
    var limitsreached = "argument out of limits.";
    var _check_instanceof = function(x) {
        if (!b instanceof int64) {
            throw new Error(notinstance);
        }
    }
    var _check_numeric = function(x, limit_lo, limit_hi) {
        if (typeof x != 'number') {
            throw new Error(notnumber);
        }
        if (limit_hi && x > limit_hi) {
            throw new Error(limitsreached);
        }
        if (limit_lo && x < limit_lo) {
            throw new Error(limitsreached);
        }
    }
    var _from_base10 = function(str) {
        if (!str.match(/^[-]?\d+$/)) {
            return null;
        }
        var dec = str.toString().split(''),
            sum = [],
            num = [],
            i, s;
        while (dec.length) {
            s = 1 * dec.shift()
            for (i = 0; s || i < sum.length; i++) {
                s += (sum[i] || 0) * 10
                sum[i] = s % 16
                s = (s - sum[i]) / 16
            }
        }
        var hex = [];
        while (sum.length && hex.length < 8) {
            hex.push(sum.pop().toString(16))
        }
        num[1] = parseInt(hex.join(''), 16);
        hex = [];
        while (sum.length && hex.length < 8) {
            hex.push(sum.pop().toString(16))
        }
        if (hex.length == 0) {
            hex.push('00');
        }
        num[0] = parseInt(hex.join(''), 16);
        return num;
    };
    var _from_base16 = function(s) {
        if (!s.match(/^0x[\dA-Fa-f]+$/)) {
            return null;
        }
        s = s.replace(/0x/, '');
        if (s.length < 16)
            s = "0000000000000000".substr(s.length, 16) + s;
        var num = s.match(/[\dA-Fa-f]{8}/g);
        num[0] = parseInt(num[0], 16) >>> 0;
        num[1] = parseInt(num[1], 16) >>> 0;
        return num;
    };
    var _HI = 0;
    var _LO = 1;
    var uint64 = function(value) {
        this.or = function(b) {
            _check_instanceof(b);
            var hi = this._value[_HI] | b._value[_HI];
            var lo = this._value[_LO] | b._value[_LO];
            return uint64.create(hi, lo);
        };
        this.and = function(b) {
            _check_instanceof(b);
            var hi = this._value[_HI] & b._value[_HI];
            var lo = this._value[_LO] & b._value[_LO];
            return uint64.create(hi, lo);
        };
        this.xor = function(b) {
            _check_instanceof(b);
            var hi = this._value[_HI] ^ b._value[_HI];
            var lo = this._value[_LO] ^ b._value[_LO];
            return uint64.create(hi, lo);
        };
        this.shiftleft = function(b) {
            // <<<<<<
            _check_numeric(b, 0, 64)
            var hi = this._value[_HI];
            var lo = this._value[_LO];
            if (b < 32) {
                hi <<= b;
                hi |= (lo >> (32 - b));
                lo <<= b;
            } else {
                lo = 0;
                hi <<= (b - 32);
            }
            return uint64.create(hi, lo);
        };
        this.shiftright = function(b) {
            // >>>>>>
            _check_numeric(b, 0, 64)
            var hi = this._value[_HI];
            var lo = this._value[_LO];
            if (b < 32) {
                lo >>>= b;
                lo |= ((hi << (32 - b)) >>> 0);
                hi >>>= b;
            } else {
                lo = 0;
                hi <<= (b - 32);
            }
            return uint64.create(hi, lo);
        };
        this.sub = function(b) {
            _check_instanceof(b);
            var hi = this._value[_HI] - b._value[_HI];
            var lo = this._value[_LO] - b._value[_LO];
            if (lo < 0) {
                hi -= 1;
            }
            return uint64.create(hi, lo);
        };
        this.mul = function(b) {
            var ah = this._value[_HI];
            var al = this._value[_LO];
            var bh = b._value[_HI];
            var bl = b._value[_LO];

            var a5 = ah >>> 20;
            var a4 = (ah >>> 7) & 0x1fff;
            var a3 = ((ah << 6) | (al >>> 26)) & 0x1fff;
            var a2 = (al >>> 13) & 0x1fff;
            var a1 = al & 0x1fff;

            var b5 = bh >>> 20;
            var b4 = (bh >>> 7) & 0x1fff;
            var b3 = ((bh << 6) | (bl >>> 26)) & 0x1fff;
            var b2 = (bl >>> 13) & 0x1fff;
            var b1 = bl & 0x1fff;

            var c1 = a1 * b1;
            var c2 = a1 * b2 + a2 * b1;
            var c3 = a1 * b3 + a2 * b2 + a3 * b1;
            var c4 = a1 * b4 + a2 * b3 + a3 * b2 + a4 * b1;
            var c5 = a1 * b5 + a2 * b4 + a3 * b3 + a4 * b2 + a5 * b1;

            c2 += c1 >>> 13;
            c1 &= 0x1fff;
            c3 += c2 >>> 13;
            c2 &= 0x1fff;
            c4 += c3 >>> 13;
            c3 &= 0x1fff;
            c5 += c4 >>> 13;
            c4 &= 0x1fff;

            var ch = ((c5 << 20) | (c4 << 7) | (c3 >>> 6)) >>> 0;
            var cl = ((c3 << 26) | (c2 << 13) | c1) >>> 0;

            return uint64.create(hi, lo);
        };
        this.cmp = function(b) {
            _check_instanceof(b);
            return b._value[_HI] == this._value[_HI] && b._value[_LO] == this._value[_LO];
        };
        if (typeof value === "string") {
            var n = _from_base10(value);
            if (!n) {
                n = _from_base16(value);
            }
            if (n) {
                this._value = n;
            }
        } else {
            this._value = new Array(2);
        }
    };
    uint64.create = function(hi, lo) {
        var r = new int64();
        hi &= 0xFFFFFFFF;
        lo &= 0xFFFFFFFF;
        r._value[_HI] = hi >>> 0;
        r._value[_LO] = lo >>> 0;
        return r;
    };
    return uint64;
})();