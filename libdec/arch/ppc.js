/* 
 * Copyright (C) 2017 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

    var op_bits4 = function(e, op, bits, swap) {
        var a = swap ? 3 : 2;
        var b = swap ? 2 : 3;
        if (e[1] == e[a] && !bits) {
            return e[1] + " " + op + "= " + e[b];
        }
        return e[1] + " = " + (bits ? '(uint' + bits + '_t) ' : '') + e[a] + " " + op + " " + e[b];
    };

    var op_rotate = function(e, bits, left) {
        return e[1] + ' = ' + (left ? 'rol' : 'ror') + bits + ' (' + e[2] + ', ' + e[3] + ')';
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

    var load_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[0] + ")";
        } else if (arg[0] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[1] + ")";
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0)
            arg[0] = " - " + Math.abs(arg[0]);
        else
            arg[0] = " + " + arg[0];
        return e[1] + " = *(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ")";
    };

    var store_bits = function(e, bits, unsigned) {
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[0] + ") = " + e[1];
        } else if (arg[0] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[1] + ") = " + e[1];
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0)
            arg[0] = " - " + Math.abs(arg[0]);
        else
            arg[0] = " + " + arg[0];
        return "*(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ") = " + e[1];
    };

    var load_idx_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        instr.comments.push('with lock');
        var s = unsigned ? "u" : "";
        var sbits = bits > 8 ? "((" + s + "int" + bits + "_t*) (" : "";
        if (e[2] == '0') {
            return e[1] + " = *(" + sbits + e[3] + ")";
        }
        return e[1] + " = *(" + sbits + "(uint8_t*)" + e[2] + " + " + e[3] + (bits > 8 ? ")" : "") + ")";
    };

    var store_idx_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        instr.comments.push('with lock');
        var s = unsigned ? "u" : "";
        if (e[2] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + e[3] + ") = " + e[1];
        }
        return "*((" + s + "int" + bits + "_t*) " + "((uint8_t*)" + e[2] + " + " + e[3] + ")) = " + e[1];
    };

    var _compare = function(instr, context, bits) {
        var e = instr.parsed;
        if (!bits) {
            bits = "";
        } else {
            bits = "(" + bits + ") ";
        }
        if (e.length == 3) {
            context.cond.cr0.a = "(" + bits + e[1] + ")";
            context.cond.cr0.b = e[2].charAt(0) == 'r' ? "(" + bits + e[2] + ")" : e[2];
        } else {
            var cr = e[1];
            context.cond[cr].a = "(" + bits + e[2] + ")";
            context.cond[cr].b = e[3].charAt(0) == 'r' ? "(" + bits + e[3] + ")" : e[3];
        }
        return null;
    };

    var _conditional = function(instr, context, type) {
        var e = instr.parsed;
        if (e.length == 2) {
            instr.conditional(context.cond.cr0.a, context.cond.cr0.b, type);
        } else {
            cr = e[1];
            instr.conditional(context.cond[cr].a, context.cond[cr].b, type);
        }
        return null;
    };

    return {
        instructions: {
            b: function() {
                return null;
            },
            'bne': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'bne-': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'bne+': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'beq': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'beq-': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'beq+': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'bgt': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'bgt-': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'bgt+': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'bge': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'bge-': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'bge+': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'blt': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'blt-': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'blt+': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'ble': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'ble-': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'ble+': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bl: function(instr) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return fcn_name + " ()";
            },
            bdnz: function(instr, context) {
                instr.conditional('(--ctr)', '0', 'NE');
                return null;
            },
            blrl: function(instr, context) {
                return '(*(void(*)()) lr) ()';
            },
            bctrl: function(instr, context) {
                return '(*(void(*)()) ctr) ()';
            },
            mtlr: function(instr) {
                return '_mtlr (' + instr.parsed[1] + ')';
            },
            blr: function(instr, context, instructions) {
                var start = instructions.indexOf(instr);
                if (start >= 0) {
                    for (var i = start - 1; i >= start - 4; i--) {
                        if (instructions[i].parsed.length < 2) {
                            continue;
                        }
                        if (instructions[i].parsed[1] == 'r3') {
                            return "return r3";
                        }
                    }
                }
                return "return";
            },
            cmplw: function(instr, context) {
                return _compare(instr, context, "int32_t");
            },
            cmplwi: function(instr, context) {
                return _compare(instr, context, "int32_t");
            },
            cmpld: function(instr, context) {
                return _compare(instr, context, "int64_t");
            },
            cmpldi: function(instr, context) {
                return _compare(instr, context, "int64_t");
            },
            cmpd: function(instr, context) {
                return _compare(instr, context, "int64_t");
            },
            cmpdi: function(instr, context) {
                return _compare(instr, context, "int64_t");
            },
            cmpw: function(instr, context) {
                return _compare(instr, context, "int32_t");
            },
            cmpwi: function(instr, context) {
                return _compare(instr, context, "int32_t");
            },
            cmph: function(instr, context) {
                return _compare(instr, context, "int16_t");
            },
            cmphi: function(instr, context) {
                return _compare(instr, context, "int16_t");
            },
            cmpb: function(instr, context) {
                return _compare(instr, context, "int8_t");
            },
            cmpbi: function(instr, context) {
                return _compare(instr, context, "int8_t");
            },
            ld: function(instr) {
                return load_bits(instr.parsed, 64, false);
            },
            lbzx: function(instr) {
                return load_idx_bits(instr, 8, true);
            },
            ldarx: function(instr) {
                return load_idx_bits(instr, 64, true);
            },
            'ldarx.': function(instr) {
                return load_idx_bits(instr, 64, true);
            },
            ldu: function(instr) {
                return load_bits(instr.parsed, 64, true);
            },
            lwz: function(instr) {
                return load_bits(instr.parsed, 32, true);
            },
            lmw: function(instr) {
                return load_bits(instr.parsed, 32, true);
            },
            lwzx: function(instr) {
                return load_idx_bits(instr, 32, true);
            },
            lhz: function(instr) {
                return load_bits(instr.parsed, 16, true);
            },
            lbz: function(instr) {
                return load_bits(instr.parsed, 8, true);
            },
            std: function(instr) {
                return store_bits(instr.parsed, 64, false);
            },
            stdcx: function(instr) {
                return store_idx_bits(instr, 64, false);
            },
            'stdcx.': function(instr) {
                return store_idx_bits(instr, 64, false);
            },
            stdu: function(instr) {
                return store_bits(instr.parsed, 64, true);
            },
            stwu: function(instr) {
                return store_bits(instr.parsed, 32, true);
            },
            stw: function(instr) {
                return store_bits(instr.parsed, 32, true);
            },
            stmw: function(instr) {
                return store_bits(instr.parsed, 32, true);
            },
            sth: function(instr) {
                return store_bits(instr.parsed, 16, true);
            },
            stb: function(instr) {
                return store_bits(instr.parsed, 8, true);
            },
            dcbz: function(instr) {
                if (instr.parsed[1] == "0") {
                    return "_dcbz (" + instr.parsed[2] + ")";
                }
                return "_dcbz (" + instr.parsed[1] + " + " + instr.parsed[2] + ")";
            },
            mtmsrd: function(instr) {
                return '_mtmsrd (' + instr.parsed[1] + ')';
            },
            mfmsrd: function(instr) {
                return instr.parsed[1] + ' = (uint64_t) _mfmsrd ()';
            },
            mfcr: function(instr) {
                return instr.parsed[1] + ' = _mfcr ()';
            },
            mtcr: function(instr) {
                return '_mtcr (' + instr.parsed[1] + ')';
            },
            mtctr: function(instr) {
                return 'ctr = ' + instr.parsed[1];
            },
            mfctr: function(instr) {
                return instr.parsed[1] + ' = ctr';
            },
            mtcrf: function(instr) {
                return '_mtcrf (' + instr.parsed[1] + ', ' + instr.parsed[2] + ')';
            },
            mflr: function(instr) {
                return instr.parsed[1] + ' = _mflr ()';
            },
            mtocrf: function(instr) {
                return '_mtocrf (' + instr.parsed[1] + ', ' + instr.parsed[2] + ')';
            },
            mfpvr: function(instr) {
                return instr.parsed[1] + ' = _mfpvr ()';
            },
            mfdccr: function(instr) {
                return instr.parsed[1] + ' = _mfdccr ()';
            },
            mtdccr: function(instr) {
                return '_mtdccr (' + instr.parsed[1] + ')';
            },
            mfspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(e[2]));
                var spr = get_spr(instr.parsed[2]);
                var bits = get_bits(spr);
                return instr.parsed[1] + ' = (' + bits + ') _mfspr (' + spr + ')';
            },
            mtspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(instr.parsed[1]));
                var spr = get_spr(instr.parsed[1]);
                var bits = get_bits(spr);
                return '_mtspr (' + spr + ', ' + instr.parsed[2] + ')';
            },
            sync: function() {
                return "_isync ()";
            },
            lwsync: function() {
                return "_lwsync ()";
            },
            isync: function() {
                return "_isync ()";
            },
            slbia: function() {
                return "_slbia ()";
            },
            eieio: function() {
                return "_eieio ()";
            },
            li: function(instr) {
                return instr.parsed[1] + " = " + instr.parsed[2];
            },
            lis: function(instr) {
                if (instr.parsed[2] == '0') {
                    return instr.parsed[1] + " = 0";
                }
                return instr.parsed[1] + " = " + instr.parsed[2] + "0000";
            },
            mr: function(instr) {
                return instr.parsed[1] + " = " + instr.parsed[2];
            },
            neg: function(instr) {
                return instr.parsed[1] + " = -" + instr.parsed[2];
            },
            not: function(instr) {
                return instr.parsed[1] + " = !" + instr.parsed[2];
            },
            add: function(instr) {
                return op_bits4(instr.parsed, "+");
            },
            addi: function(instr) {
                return op_bits4(instr.parsed, "+");
            },
            addis: function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr.parsed, "+");
            },
            sub: function(instr) {
                return op_bits4(instr.parsed, "-", false, true);
            },
            subc: function(instr) {
                return op_bits4(instr.parsed, "-", false, true);
            },
            subf: function(instr) {
                return op_bits4(instr.parsed, "-", false, true);
            },
            xor: function(instr) {
                return op_bits4(instr.parsed, "^");
            },
            xori: function(instr) {
                return op_bits4(instr.parsed, "^");
            },
            or: function(instr) {
                return op_bits4(instr.parsed, "|");
            },
            ori: function(instr) {
                return op_bits4(instr.parsed, "|");
            },
            oris: function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr.parsed, "|");
            },
            and: function(instr) {
                return op_bits4(instr.parsed, "&");
            },
            andi: function(instr) {
                return op_bits4(instr.parsed, "&");
            },
            sld: function(instr) {
                return op_bits4(instr.parsed, "<<", 64);
            },
            sldi: function(instr) {
                return op_bits4(instr.parsed, "<<", 64);
            },
            slw: function(instr) {
                return op_bits4(instr.parsed, "<<", 32);
            },
            slwi: function(instr) {
                return op_bits4(instr.parsed, "<<", 32);
            },
            srw: function(instr) {
                return op_bits4(instr.parsed, ">>", 32);
            },
            srwi: function(instr) {
                return op_bits4(instr.parsed, ">>", 32);
            },
            srawi: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srai: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srad: function(instr) {
                return op_bits4(instr.parsed, ">>", 64);
            },
            sradi: function(instr) {
                return op_bits4(instr.parsed, ">>", 64);
            },
            cntlz: function(instr) {
                /*
                 int cntlz(u64 value) {
                    for (int n = 0; n < 32; n++, value <<= 1) {
                       if (value & 0x8000000000000000) break;
                    }
                    return n;
                 }
                 */
                var ret = instr.parsed[1];
                var reg = instr.parsed[2];
                return ret + " = (uint64_t) _cntlz(" + reg + ")";
            },
            cntlzw: function(instr) {
                /*
                 int cntlz(u32 value) {
                    for (int n = 0; n < 32; n++, value <<= 1) {
                       if (value & 0x80000000) break;
                    }
                    return n;
                 }
                 */
                var ret = instr.parsed[1];
                var reg = instr.parsed[2];
                return ret + " = (uint32_t) _cntlzw(" + reg + ")";
            },
            extsb: function(instr) {
                return instr.parsed[1] + " = (int64_t) " + instr.parsed[2];
            },
            extsh: function(instr) {
                return instr.parsed[1] + " = (int64_t) " + instr.parsed[2];
            },
            extsw: function(instr) {
                return instr.parsed[1] + " = (int64_t) " + instr.parsed[2];
            },
            /*
to be redone. this is wrong.
clrlwi %r0, %r0, 31       # %r0 = %r0 & 1
rldicr %r10, %r10, 24,39  # %r10 = ((%r10 << 24) | (%r10 >> 40)) & 0xFFFFFFFFFF000000
rldicl %r4, %r4, 0,48     # %r4 = %r4 & 0xFFFF
rldicl %r0, %r0, 0,59     # %r0 = %r0 & 0x1F
rldicl %r9, %r9, 61,3     # %r9 = (%r9 >> 3) & 0x1FFFFFFFFFFFFFFF
*/
            rldic: function(instr) {
                return instr.parsed[1] + ' = rol64(' + instr.parsed[2] + ', ' + instr.parsed[3] + ') & ' + instr.parsed[4];
            },
            rldcl: function(instr) {
                return instr.parsed[1] + ' = rol64(' + instr.parsed[2] + ', ' + instr.parsed[3] + ') & ' + instr.parsed[4];
            },
            rldicl: function(instr) {
                return instr.parsed[1] + ' = rol64(' + instr.parsed[2] + ', ' + instr.parsed[3] + ') & ' + instr.parsed[4];
            },
            rldcr: function(instr) {
                return instr.parsed[1] + ' = rol64(' + instr.parsed[2] + ', ' + instr.parsed[3] + ') & ' + instr.parsed[4];
            },
            rldicr: function(instr) {
                var res = instr.parsed[1] + ' = ';
                var rs = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mb = 0;
                var me = parseInt(instr.parsed[4]);
                var mask = mask64(mb, me);
                return res;
            },
            clrlwi: function(instr) {
                var res = instr.parsed[1];
                var rs = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mask = 0xFFFFFFFF >>> sh;
                instr.parsed[3] = '0x' + mask.toString(16);
                return op_bits4(instr.parsed, "&", 32);
            },
            clrldi: function(instr) {
                var res = instr.parsed[1];
                var rs = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]) - 1;
                var mask = [0xFFFFFFFF, 0xFFFFFFFF];
                if (sh >= 31) {
                    mask[0] = '';
                    mask[1] >>>= (sh - 31);
                } else {
                    mask[0] >>>= (sh - 31);
                }
                instr.parsed[3] = '0x' + mask[0].toString(16) + mask[1].toString(16) + 'll';
                return op_bits4(instr.parsed, "&", 64);
            },
            invalid: function() {
                return null;
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    cr0: {
                        a: null,
                        b: null
                    },
                    cr1: {
                        a: null,
                        b: null
                    },
                    cr2: {
                        a: null,
                        b: null
                    },
                    cr3: {
                        a: null,
                        b: null
                    },
                    cr4: {
                        a: null,
                        b: null
                    },
                    cr5: {
                        a: null,
                        b: null
                    },
                    cr6: {
                        a: null,
                        b: null
                    },
                    cr7: {
                        a: null,
                        b: null
                    },
                },
                longaddr: [],
                vars: []
            }
        }
    };
})();