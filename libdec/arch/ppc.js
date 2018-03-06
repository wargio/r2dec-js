/* 
 * Copyright (C) 2017-2018 deroad
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
    var Base = require('./base');

    var sprs = {
        SPR_MQ: {
            bits: 64,
            id: 0x0
        },
        SPR_XER: {
            bits: 64,
            id: 0x1
        },
        SPR_RTCU: {
            bits: 64,
            id: 0x4
        },
        SPR_RTCL: {
            bits: 64,
            id: 0x5
        },
        SPR_LR: {
            bits: 64,
            id: 0x8
        },
        SPR_CTR: {
            bits: 64,
            id: 0x9
        },
        SPR_DSISR: {
            bits: 64,
            id: 0x12
        },
        SPR_DAR: {
            bits: 64,
            id: 0x13
        },
        SPR_DEC: {
            bits: 64,
            id: 0x16
        },
        SPR_SDR1: {
            bits: 64,
            id: 0x19
        },
        SPR_SRR0: {
            bits: 64,
            id: 0x1a
        },
        SPR_SRR1: {
            bits: 64,
            id: 0x1b
        },
        SPR_VRSAVE: {
            bits: 64,
            id: 0x100
        },
        SPR_TBRL: {
            bits: 64,
            id: 0x10c
        },
        SPR_TBRU: {
            bits: 64,
            id: 0x10d
        },
        SPR_SPRG0: {
            bits: 64,
            id: 0x110
        },
        SPR_SPRG1: {
            bits: 64,
            id: 0x111
        },
        SPR_SPRG2: {
            bits: 64,
            id: 0x112
        },
        SPR_SPRG3: {
            bits: 64,
            id: 0x113
        },
        SPR_EAR: {
            bits: 64,
            id: 0x11a
        },
        SPR_TBL: {
            bits: 64,
            id: 0x11c
        },
        SPR_TBU: {
            bits: 64,
            id: 0x11d
        },
        SPR_PVR: {
            bits: 64,
            id: 0x11f
        },
        SPR_SPEFSCR: {
            bits: 64,
            id: 0x200
        },
        SPR_IBAT0U: {
            bits: 64,
            id: 0x210
        },
        SPR_IBAT0L: {
            bits: 64,
            id: 0x211
        },
        SPR_IBAT1U: {
            bits: 64,
            id: 0x212
        },
        SPR_IBAT1L: {
            bits: 64,
            id: 0x213
        },
        SPR_IBAT2U: {
            bits: 64,
            id: 0x214
        },
        SPR_IBAT2L: {
            bits: 64,
            id: 0x215
        },
        SPR_IBAT3U: {
            bits: 64,
            id: 0x216
        },
        SPR_IBAT3L: {
            bits: 64,
            id: 0x217
        },
        SPR_DBAT0U: {
            bits: 64,
            id: 0x218
        },
        SPR_DBAT0L: {
            bits: 64,
            id: 0x219
        },
        SPR_DBAT1U: {
            bits: 64,
            id: 0x21a
        },
        SPR_DBAT1L: {
            bits: 64,
            id: 0x21b
        },
        SPR_DBAT2U: {
            bits: 64,
            id: 0x21c
        },
        SPR_DBAT2L: {
            bits: 64,
            id: 0x21d
        },
        SPR_DBAT3U: {
            bits: 64,
            id: 0x21e
        },
        SPR_DBAT3L: {
            bits: 64,
            id: 0x21f
        },
        SPR_UMMCR0: {
            bits: 64,
            id: 0x3a8
        },
        SPR_UMMCR1: {
            bits: 64,
            id: 0x3ac
        },
        SPR_UPMC1: {
            bits: 64,
            id: 0x3a9
        },
        SPR_UPMC2: {
            bits: 64,
            id: 0x3aa
        },
        SPR_USIA: {
            bits: 64,
            id: 0x3ab
        },
        SPR_UPMC3: {
            bits: 64,
            id: 0x3ad
        },
        SPR_UPMC4: {
            bits: 64,
            id: 0x3ae
        },
        SPR_MMCR0: {
            bits: 64,
            id: 0x3b8
        },
        SPR_PMC1: {
            bits: 64,
            id: 0x3b9
        },
        SPR_PMC2: {
            bits: 64,
            id: 0x3ba
        },
        SPR_SIA: {
            bits: 64,
            id: 0x3bb
        },
        SPR_MMCR1: {
            bits: 64,
            id: 0x3bc
        },
        SPR_PMC3: {
            bits: 64,
            id: 0x3bd
        },
        SPR_PMC4: {
            bits: 64,
            id: 0x3be
        },
        SPR_SDA: {
            bits: 64,
            id: 0x3bf
        },
        SPR_DMISS: {
            bits: 64,
            id: 0x3d0
        },
        SPR_DCMP: {
            bits: 64,
            id: 0x3d1
        },
        SPR_HASH1: {
            bits: 64,
            id: 0x3d2
        },
        SPR_HASH2: {
            bits: 64,
            id: 0x3d3
        },
        SPR_IMISS: {
            bits: 64,
            id: 0x3d4
        },
        SPR_ICMP: {
            bits: 64,
            id: 0x3d5
        },
        SPR_RPA: {
            bits: 64,
            id: 0x3d6
        },
        SPR_HID0: {
            bits: 64,
            id: 0x3f0
        },
        SPR_HID1: {
            bits: 64,
            id: 0x3f1
        },
        SPR_IABR: {
            bits: 64,
            id: 0x3f2
        },
        SPR_HID2: {
            bits: 64,
            id: 0x3f3
        },
        SPR_HID4: {
            bits: 64,
            id: 0x3f4
        },
        SPR_DABR: {
            bits: 64,
            id: 0x3f5
        },
        SPR_HID5: {
            bits: 64,
            id: 0x3f6
        },
        SPR_HID6: {
            bits: 64,
            id: 0x3f9
        },
        SPR_ICTC: {
            bits: 64,
            id: 0x3fb
        },
        SPR_THRM1: {
            bits: 64,
            id: 0x3fc
        },
        SPR_THRM2: {
            bits: 64,
            id: 0x3fd
        },
        SPR_THRM3: {
            bits: 64,
            id: 0x3fe
        },
        SPR_PIR: {
            bits: 64,
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
        if (name == null) {
            return '0x' + n.toString(16);
        }
        return name; //+ " /* " + sprs[e].id + " */";
    };

    var get_bits = function(spr) {
        var o = sprs[spr];
        if (o == null) {
            return 64;
        }
        return o.bits;
    };

    var op_bits4 = function(e, op, bits, swap) {
        var a = swap ? e[3] : e[2];
        var b = swap ? e[2] : e[3];
        if (e[1] == a && !bits) {
            return op(e[1], e[1], b);
        }
        if (bits) {
            //value, bits, is_signed, is_pointer, is_memory
            a = new Base.bits_argument(a, bits, false);
        }
        return op(e[1], a, b, bits);
    };

    var op_rotate = function(e, bits, left) {
        if (left) {
            return Base.instructions.rotate_left(e[1], e[2], e[3], bits);
        }
        return Base.instructions.rotate_right(e[1], e[2], e[3], bits);
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
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.read_memory(arg[0], e[1], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.read_memory(arg[1], e[1], bits, !unsigned);
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - " + Math.abs(arg[0]);
        } else {
            arg[0] = " + " + arg[0];
        }
        //pointer, register, bits, is_signed
        return Base.instructions.read_memory(arg[1] + arg[0], e[1], bits, !unsigned);
    };

    var store_bits = function(e, bits, unsigned) {
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.write_memory(arg[0], e[1], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.write_memory(arg[1], e[1], bits, !unsigned);
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - " + Math.abs(arg[0]);
        } else {
            arg[0] = " + " + arg[0];
        }
        //pointer, register, bits, is_signed
        return Base.instructions.write_memory(arg[1] + arg[0], e[1], bits, !unsigned);
    };

    var load_idx_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        instr.comments.push('with lock');
        if (e[2] == '0') {
            return Base.instructions.read_memory(e[3], e[1], bits, !unsigned);
        }
        return Base.instructions.read_memory('(' + arg[2] + ' + ' + arg[3] + ')', e[1], bits, !unsigned);
    };

    var store_idx_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        instr.comments.push('with lock');
        if (e[2] == '0') {
            return Base.instructions.write_memory(e[3], e[1], bits, !unsigned);
        }
        return Base.instructions.write_memory('(' + e[2] + ' + ' + e[3] + ')', e[1], bits, !unsigned);
    };

    var _compare = function(instr, context, bits) {
        var e = instr.parsed;
        if (e.length == 3) {
            //value, bits, is_signed, is_pointer, is_memory
            context.cond.cr0.a = new Base.bits_argument(e[1], bits, false);
            context.cond.cr0.b = new Base.bits_argument(e[2], e[2].charAt(0) == 'r' ? bits : null, false);
        } else {
            var cr = e[1];
            context.cond[cr].a = new Base.bits_argument(e[2], bits, false);
            context.cond[cr].b = new Base.bits_argument(e[3], e[3].charAt(0) == 'r' ? bits : null, false);
        }
        return Base.instructions.nop();
    };

    var _conditional = function(instr, context, type) {
        var e = instr.parsed;
        if (e.length == 2) {
            instr.conditional(context.cond.cr0.a, context.cond.cr0.b, type);
        } else {
            cr = e[1];
            instr.conditional(context.cond[cr].a, context.cond[cr].b, type);
        }
        return Base.instructions.nop();
    };

    return {
        instructions: {
            b: function() {
                return Base.instructions.nop();
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
                return Base.instructions.call(fcn_name);
            },
            bdnz: function(instr, context) {
                instr.conditional('(--ctr)', '0', 'NE');
                return Base.instructions.nop();
            },
            blrl: function(instr, context) {
                if (context.mtlr.register) {
                    context.mtlr.instr.valid = false;
                    return Base.instructions.call(context.mtlr.register, [], true);
                }
                return Base.instructions.call('lr', [], true);
            },
            bctrl: function(instr, context) {
                return Base.instructions.call('ctr', [], true);
            },
            mtlr: function(instr, context) {
                context.mtlr = {
                    instr: instr,
                    register: instr.parsed[1]
                };
                if (false && instr.parsed[1] == 'r0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.call('_mtlr', [instr.parsed[1]]);
            },
            blr: function(instr, context, instructions) {
                var start = instructions.indexOf(instr);
                if (start >= 0) {
                    for (var i = start - 1; i >= start - 4; i--) {
                        if (instructions[i].parsed.length < 2) {
                            continue;
                        }
                        if (instructions[i].parsed[1] == 'r3') {
                            return Base.instructions.return('r3');
                        }
                    }
                }
                return Base.instructions.return();
            },
            cmplw: function(instr, context) {
                return _compare(instr, context, 32);
            },
            cmplwi: function(instr, context) {
                return _compare(instr, context, 32);
            },
            cmpld: function(instr, context) {
                return _compare(instr, context, 64);
            },
            cmpldi: function(instr, context) {
                return _compare(instr, context, 64);
            },
            cmpd: function(instr, context) {
                return _compare(instr, context, 64);
            },
            cmpdi: function(instr, context) {
                return _compare(instr, context, 64);
            },
            cmpw: function(instr, context) {
                return _compare(instr, context, 32);
            },
            cmpwi: function(instr, context) {
                return _compare(instr, context, 32);
            },
            cmph: function(instr, context) {
                return _compare(instr, context, 16);
            },
            cmphi: function(instr, context) {
                return _compare(instr, context, 16);
            },
            cmpb: function(instr, context) {
                return _compare(instr, context, 8);
            },
            cmpbi: function(instr, context) {
                return _compare(instr, context, 8);
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
                    return Base.instructions.call('_dcbz', [instr.parsed[2]]);
                }
                return Base.instructions.call('_dcbz', [instr.parsed[1] + ' + ' + instr.parsed[2]]);
            },
            mtmsrd: function(instr) {
                return Base.instructions.call('_mtcr', [instr.parsed[1]]);
            },
            mfmsrd: function(instr) {
                return Base.instructions.call('_mfmsrd', [], false, instr.parsed[1], 64, false);
            },
            mfcr: function(instr) {
                return Base.instructions.call('_mfcr', [], false, instr.parsed[1]);
            },
            mtcr: function(instr) {
                return Base.instructions.call('_mtcr', [instr.parsed[1]]);
            },
            mtctr: function(instr) {
                return Base.instructions.assign('ctr', instr.parsed[1]);
            },
            mfctr: function(instr) {
                return Base.instructions.assign(instr.parsed[1], 'ctr');
            },
            mtcrf: function(instr) {
                return Base.instructions.call('_mtcrf', [instr.parsed[1], instr.parsed[2]]);
            },
            mflr: function(instr) {
                if (false && instr.parsed[1] == 'r0') {
                    return Base.instructions.nop();
                }
                return Base.instructions.call('_mflr', [], false, instr.parsed[1]);
            },
            mtocrf: function(instr) {
                return Base.instructions.call('_mtocrf', [instr.parsed[1], instr.parsed[2]]);
            },
            mfpvr: function(instr) {
                return Base.instructions.call('_mfpvr', [], false, instr.parsed[1]);
            },
            mfdccr: function(instr) {
                return Base.instructions.call('_mfdccr', [], false, instr.parsed[1]);
            },
            mtdccr: function(instr) {
                return Base.instructions.call('_mtdccr', [instr.parsed[1]]);
            },
            mfspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(e[2]));
                var spr = get_spr(instr.parsed[2]);
                var bits = get_bits(spr);
                var arg0 = spr.indexOf('0x') != 0 ? new Base.macro(spr) : spr;
                var op = Base.instructions.call('_mfspr', [arg0], false, instr.parsed[1], bits, false);
                if (spr.indexOf('0x') != 0) {
                    Base.add_macro(op, '#define ' + spr + ' (' + instr.parsed[1] + ')')
                }
                return op;
            },
            mtspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(instr.parsed[1]));
                var spr = get_spr(instr.parsed[1]);
                var bits = get_bits(spr);
                var reg = new Base.bits_argument(instr.parsed[2], bits, false, false, false);
                var arg0 = spr.indexOf('0x') != 0 ? new Base.macro(spr) : spr;
                var op = Base.instructions.call('_mtspr', [arg0, reg]);
                if (spr.indexOf('0x') != 0) {
                    Base.add_macro(op, '#define ' + spr + ' (' + instr.parsed[1] + ')')
                }
                return op;
            },
            sync: function() {
                return Base.instructions.call('_isync');
            },
            lwsync: function() {
                return Base.instructions.call('_lwsync');
            },
            isync: function() {
                return Base.instructions.call('_isync');
            },
            slbia: function() {
                return Base.instructions.call('_slbia');
            },
            eieio: function() {
                return Base.instructions.call('_eieio');
            },
            li: function(instr) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            lis: function(instr) {
                if (instr.parsed[2] == '0') {
                    return Base.instructions.assign(instr.parsed[1], '0');
                }
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2] + "0000");
            },
            mr: function(instr) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            neg: function(instr) {
                return Base.instructions.negate(instr.parsed[1], instr.parsed[2]);
            },
            not: function(instr) {
                return Base.instructions.not(instr.parsed[1], instr.parsed[2]);
            },
            add: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.add);
            },
            addi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.add);
            },
            addis: function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr.parsed, Base.instructions.add);
            },
            sub: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.subtract, false, true);
            },
            subc: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.subtract, false, true);
            },
            subf: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.subtract, false, true);
            },
            xor: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.xor);
            },
            xori: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.xor);
            },
            or: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.or);
            },
            ori: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.or);
            },
            oris: function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr.parsed, Base.instructions.or);
            },
            and: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.and);
            },
            andi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.and);
            },
            sld: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 64);
            },
            sldi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 64);
            },
            slw: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 32);
            },
            slwi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 32);
            },
            srw: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 32);
            },
            srwi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 32);
            },
            srawi: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srai: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srad: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 64);
            },
            sradi: function(instr) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 64);
            },
            cntlz: function(instr) {
                var ret = instr.parsed[1];
                var reg = instr.parsed[2];
                return Base.instructions.call('_cntlz', [reg], false, ret, 64, false);
            },
            cntlzw: function(instr) {
                var ret = instr.parsed[1];
                var reg = instr.parsed[2];
                return Base.instructions.call('_cntlzw', [reg], false, ret, 32, false);
            },
            extsb: function(instr) {
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 64);
            },
            extsh: function(instr) {
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 64);
            },
            extsw: function(instr) {
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 64);
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
                var rol = Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], instr.parsed[3], 64);
                var and = Base.instructions.and(instr.parsed[1], instr.parsed[1], instr.parsed[4])
                return Base.composed([rol, and]);
            },
            rldcl: function(instr) {
                var rol = Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], instr.parsed[3], 64);
                var and = Base.instructions.and(instr.parsed[1], instr.parsed[1], instr.parsed[4])
                return Base.composed([rol, and]);
            },
            rldicl: function(instr) {
                var rol = Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], instr.parsed[3], 64);
                var and = Base.instructions.and(instr.parsed[1], instr.parsed[1], instr.parsed[4])
                return Base.composed([rol, and]);
            },
            rldcr: function(instr) {
                var rol = Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], instr.parsed[3], 64);
                var and = Base.instructions.and(instr.parsed[1], instr.parsed[1], instr.parsed[4]);
                return Base.composed([rol, and]);
            },
            /*
            //BROKEN
            rldicr: function(instr) {
                var res = instr.parsed[1] + ' = ';
                var rs = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mb = 0;
                var me = parseInt(instr.parsed[4]);
                var mask = mask64(mb, me);
                return res;
            },
            */
            clrlwi: function(instr) {
                var res = instr.parsed[1];
                var rs = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mask = 0xFFFFFFFF >>> sh;
                instr.parsed[3] = '0x' + mask.toString(16);
                return op_bits4(instr.parsed, Base.instructions.and, 32);
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
                return op_bits4(instr.parsed, Base.instructions.and, 64);
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
                mtlr: {},
                longaddr: [],
                vars: []
            }
        },
        returns: function(context) {
            return 'void';
        }
    };
})();