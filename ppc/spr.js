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
    var sprs = {
        SPR_MQ: {
            bits: 'uint64_t',
            id: 0x0
        },
        SPR_XER: {
            bits: 'uint64_t',
            id: 0x1
        },
        SPR_RTCU: {
            bits: 'uint64_t',
            id: 0x4
        },
        SPR_RTCL: {
            bits: 'uint64_t',
            id: 0x5
        },
        SPR_LR: {
            bits: 'uint64_t',
            id: 0x8
        },
        SPR_CTR: {
            bits: 'uint64_t',
            id: 0x9
        },
        SPR_DSISR: {
            bits: 'uint64_t',
            id: 0x12
        },
        SPR_DAR: {
            bits: 'uint64_t',
            id: 0x13
        },
        SPR_DEC: {
            bits: 'uint64_t',
            id: 0x16
        },
        SPR_SDR1: {
            bits: 'uint64_t',
            id: 0x19
        },
        SPR_SRR0: {
            bits: 'uint64_t',
            id: 0x1a
        },
        SPR_SRR1: {
            bits: 'uint64_t',
            id: 0x1b
        },
        SPR_VRSAVE: {
            bits: 'uint64_t',
            id: 0x100
        },
        SPR_TBRL: {
            bits: 'uint64_t',
            id: 0x10c
        },
        SPR_TBRU: {
            bits: 'uint64_t',
            id: 0x10d
        },
        SPR_SPRG0: {
            bits: 'uint64_t',
            id: 0x110
        },
        SPR_SPRG1: {
            bits: 'uint64_t',
            id: 0x111
        },
        SPR_SPRG2: {
            bits: 'uint64_t',
            id: 0x112
        },
        SPR_SPRG3: {
            bits: 'uint64_t',
            id: 0x113
        },
        SPR_EAR: {
            bits: 'uint64_t',
            id: 0x11a
        },
        SPR_TBL: {
            bits: 'uint64_t',
            id: 0x11c
        },
        SPR_TBU: {
            bits: 'uint64_t',
            id: 0x11d
        },
        SPR_PVR: {
            bits: 'uint64_t',
            id: 0x11f
        },
        SPR_SPEFSCR: {
            bits: 'uint64_t',
            id: 0x200
        },
        SPR_IBAT0U: {
            bits: 'uint64_t',
            id: 0x210
        },
        SPR_IBAT0L: {
            bits: 'uint64_t',
            id: 0x211
        },
        SPR_IBAT1U: {
            bits: 'uint64_t',
            id: 0x212
        },
        SPR_IBAT1L: {
            bits: 'uint64_t',
            id: 0x213
        },
        SPR_IBAT2U: {
            bits: 'uint64_t',
            id: 0x214
        },
        SPR_IBAT2L: {
            bits: 'uint64_t',
            id: 0x215
        },
        SPR_IBAT3U: {
            bits: 'uint64_t',
            id: 0x216
        },
        SPR_IBAT3L: {
            bits: 'uint64_t',
            id: 0x217
        },
        SPR_DBAT0U: {
            bits: 'uint64_t',
            id: 0x218
        },
        SPR_DBAT0L: {
            bits: 'uint64_t',
            id: 0x219
        },
        SPR_DBAT1U: {
            bits: 'uint64_t',
            id: 0x21a
        },
        SPR_DBAT1L: {
            bits: 'uint64_t',
            id: 0x21b
        },
        SPR_DBAT2U: {
            bits: 'uint64_t',
            id: 0x21c
        },
        SPR_DBAT2L: {
            bits: 'uint64_t',
            id: 0x21d
        },
        SPR_DBAT3U: {
            bits: 'uint64_t',
            id: 0x21e
        },
        SPR_DBAT3L: {
            bits: 'uint64_t',
            id: 0x21f
        },
        SPR_UMMCR0: {
            bits: 'uint64_t',
            id: 0x3a8
        },
        SPR_UMMCR1: {
            bits: 'uint64_t',
            id: 0x3ac
        },
        SPR_UPMC1: {
            bits: 'uint64_t',
            id: 0x3a9
        },
        SPR_UPMC2: {
            bits: 'uint64_t',
            id: 0x3aa
        },
        SPR_USIA: {
            bits: 'uint64_t',
            id: 0x3ab
        },
        SPR_UPMC3: {
            bits: 'uint64_t',
            id: 0x3ad
        },
        SPR_UPMC4: {
            bits: 'uint64_t',
            id: 0x3ae
        },
        SPR_MMCR0: {
            bits: 'uint64_t',
            id: 0x3b8
        },
        SPR_PMC1: {
            bits: 'uint64_t',
            id: 0x3b9
        },
        SPR_PMC2: {
            bits: 'uint64_t',
            id: 0x3ba
        },
        SPR_SIA: {
            bits: 'uint64_t',
            id: 0x3bb
        },
        SPR_MMCR1: {
            bits: 'uint64_t',
            id: 0x3bc
        },
        SPR_PMC3: {
            bits: 'uint64_t',
            id: 0x3bd
        },
        SPR_PMC4: {
            bits: 'uint64_t',
            id: 0x3be
        },
        SPR_SDA: {
            bits: 'uint64_t',
            id: 0x3bf
        },
        SPR_DMISS: {
            bits: 'uint64_t',
            id: 0x3d0
        },
        SPR_DCMP: {
            bits: 'uint64_t',
            id: 0x3d1
        },
        SPR_HASH1: {
            bits: 'uint64_t',
            id: 0x3d2
        },
        SPR_HASH2: {
            bits: 'uint64_t',
            id: 0x3d3
        },
        SPR_IMISS: {
            bits: 'uint64_t',
            id: 0x3d4
        },
        SPR_ICMP: {
            bits: 'uint64_t',
            id: 0x3d5
        },
        SPR_RPA: {
            bits: 'uint64_t',
            id: 0x3d6
        },
        SPR_HID0: {
            bits: 'uint64_t',
            id: 0x3f0
        },
        SPR_HID1: {
            bits: 'uint64_t',
            id: 0x3f1
        },
        SPR_IABR: {
            bits: 'uint64_t',
            id: 0x3f2
        },
        SPR_HID2: {
            bits: 'uint64_t',
            id: 0x3f3
        },
        SPR_HID4: {
            bits: 'uint64_t',
            id: 0x3f4
        },
        SPR_DABR: {
            bits: 'uint64_t',
            id: 0x3f5
        },
        SPR_HID5: {
            bits: 'uint64_t',
            id: 0x3f6
        },
        SPR_HID6: {
            bits: 'uint64_t',
            id: 0x3f9
        },
        SPR_ICTC: {
            bits: 'uint64_t',
            id: 0x3fb
        },
        SPR_THRM1: {
            bits: 'uint64_t',
            id: 0x3fc
        },
        SPR_THRM2: {
            bits: 'uint64_t',
            id: 0x3fd
        },
        SPR_THRM3: {
            bits: 'uint64_t',
            id: 0x3fe
        },
        SPR_PIR: {
            bits: 'uint64_t',
            id: 0x3ff
        }
    };

    var get_spr = function(n) {
        n = parseInt(n);
        var name = null;
        for (var e in sprs) {
            if (n == sprs[e].id) {
                name = e;
                break;
            }
        }
        if (name == null)
            return '0x' + n.toString(16);
        return name; //+ " /* " + sprs[e].id + " */";
    };

    var get_bits = function(spr) {
        var o = sprs[spr];
        if (o == null)
            return 'uint64_t';
        return o.bits;
    };

    var sprmem = {
        'mtmsrd': function(e) {
            return '_mtmsrd (' + e[1] + ');';
        },
        'mfmsrd': function(e) {
            return e[1] + ' = (uint64_t) _mfmsrd ();';
        },
        'mfcr': function(e) {
            return e[1] + ' = _mfcr ();';
        },
        'mtcr': function(e) {
            return '_mtcr (' + e[1] + ');';
        },
        'mtctr': function(e) {
            return 'ctr = ' + e[1] + ';';
        },
        'mfctr': function(e) {
            return e[1] + ' = ctr;';
        },
        'mflr': function(e) {
            return e[1] + ' = _mflr ();';
        },
        'mtocrf': function(e) {
            return '_mtocrf (' + e[1] + ', ' + e[2] + ');';
        },
        'mfpvr': function(e) {
            return e[1] + ' = _mfpvr ();';
        },
        'mfdccr': function(e) {
            return e[1] + ' = _mfdccr ();';
        },
        'mtdccr': function(e) {
            return '_mtdccr (' + e[1] + ');';
        },
    };

    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (e[0] == 'mfspr') {
                l[i].comments.push("SPR num: " + parseInt(e[2]));
                var spr = get_spr(e[2]);
                var bits = get_bits(spr);
                l[i].opcode = e[1] + ' = (' + bits + ') _mfspr (' + spr + ');';
            } else if (e[0] == 'mtspr') {
                l[i].comments.push("SPR num: " + parseInt(e[1]));
                var spr = get_spr(e[1]);
                var bits = get_bits(spr);
                l[i].opcode = '_mtspr (' + spr + ', ' + e[2] + ');';
            } else if (sprmem[e[0]]) {
                l[i].opcode = sprmem[e[0]](e);
            }
        }
        return l;
    };
})();