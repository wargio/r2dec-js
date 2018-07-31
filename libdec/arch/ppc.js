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
    var Base = require('libdec/core/base');
    var Long = require('libdec/long');

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
        //value, bits, is_signed, is_pointer, is_memory
        if (swap) {
            b = new Base.bits_argument(b, bits, false);
        } else {
            a = new Base.bits_argument(a, bits, false);
        }
        return op(e[1], a, b);
    };

    var op_bits3 = function(e, op, bits) {
        a = e[1];
        b = e[2];
        if (bits) {
            b = new Base.bits_argument(b, bits, false);
        }
        return op(a, a, b);
    };

    var op_rotate = function(e, bits, left) {
        if (left) {
            return Base.instructions.rotate_left(e[1], e[2], e[3], bits);
        }
        return Base.instructions.rotate_right(e[1], e[2], e[3], bits);
    };

    var op_rotate3 = function(e, bits, left) {
        if (left) {
            return Base.instructions.rotate_left(e[1], e[1], e[2], bits);
        }
        return Base.instructions.rotate_right(e[1], e[1], e[2], bits);
    };

    function mask32(mb, me) {
        if (mb == (me + 1)) {
            return '0xffffffff';
        }
        var maskmb = 0xffffffff >> mb;
        var maskme = 0xffffffff << (31 - me);
        return (mb <= me) ? (maskmb & maskme) : (maskmb | maskme);
    }

    function mask32inv(mb, me) {
        return (~mask32(mb, me)) & 0xffffffff;
    }

    var mask64 = function(mb, me) {
        if (mb == (me + 1)) {
            return '0xffffffffffffffff';
        }
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
        arg[0] = (parseInt(arg[0]) >> 0) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
        } else {
            arg[0] = " + 0x" + arg[0].toString(16);
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
        arg[0] = (parseInt(arg[0]) >> 0) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
        } else {
            arg[0] = " + 0x" + arg[0].toString(16);
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
        return Base.instructions.read_memory('(' + e[2] + ' + ' + e[3] + ')', e[1], bits, !unsigned);
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

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _ppc_return = function(instr, context, instructions) {
        var start = instructions.indexOf(instr);
        var reg = '';
        if (start >= 0) {
            for (var i = (start - 10 < 0 ? 0 : (start - 10)); i < start && i < instructions.length; i++) {
                var t = instructions[i];
                if (t.parsed.length < 2) {
                    continue;
                }
                var p = 0;
                if (t.parsed[1] == 'r3') {
                    reg = 'r3';
                    context.returns = 'uint32_t';
                } else if (t.parsed[0].indexOf('lw') == 0 && (p = t.assembly.indexOf('r3')) > 0 && t.assembly.indexOf('r1') > p) {
                    reg = '';
                    context.returns = 'void';
                }
            }
        }
        return Base.instructions.return(reg);
    };

    var _rlwimi = function(dst, src, sh, mb, me) {
        var m = (mask32(mb, me) >>> 0);
        var minv = (mask32inv(mb, me) >>> 0);
        var ops = [];
        // (dst & ~mask) | (rotl32(src, sh) & mask)
        if (m == 0) {
            ops.push(Base.instructions.and(dst, dst, minv.toString(16)));
        } else if (minv == 0) {
            if (sh == 0) {
                ops.push(Base.instructions.and(dst, src, m.toString(16)));
            } else {
                var value = Base.variable();
                ops.push(Base.instructions.rotate_left(value, src, sh, 32));
                ops.push(Base.instructions.and(dst, value, m.toString(16)));
            }
        } else {
            var value0 = Base.variable();
            var value1 = Base.variable();
            ops.push(Base.instructions.rotate_left('uint32_t ' + value0, src, sh, 32));
            ops.push(Base.instructions.and(value0, value0, m.toString(16)));
            ops.push(Base.instructions.and('uint32_t ' + value1, dst, minv.toString(16)));
            ops.push(Base.instructions.or(dst, value1, value0));
        }
        return Base.composed(ops);
    };

    var _lis_instr = function(instr) {
        if (instr.parsed[2] == '0') {
            return Base.instructions.assign(instr.parsed[1], '0');
        }
        return Base.instructions.assign(instr.parsed[1], instr.parsed[2] + "0000");
    };

    var lis64_ppc = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e[0] == 'lis' && e[1] == r;
            },
            function(e, r) {
                if (e[0] == 'nop') {
                    return true;
                }
                return (e[0] == 'ori' && e[1] == r && e[2] == r) || (e[0] == 'addi' && e[1] == r && e[2] == r);
            },
            function(e, r) {
                var p = parseInt(e[3]);
                return e[0] == 'sldi' && e[1] == r && e[2] == r && p == 32;
            },
            function(e, r) {
                return e[0] == 'oris' && e[1] == r && e[2] == r;
            },
            function(e, r) {
                if (e[0] == 'nop') {
                    return true;
                }
                return (e[0] == 'ori' && e[1] == r && e[2] == r) || (e[0] == 'addi' && e[1] == r && e[2] == r);
            }
        ];
        var address = [
            function(e, addr) {
                return Long.fromString(parseInt(e[2]).toString(16) + '0000', false, 16);
            },
            function(e, addr) {
                var n = Long.fromString(parseInt(e[3]).toString(16), false, 16);
                var op = e[0].replace(/i/, '');
                return addr[op](n);
            },
            function(e, addr) {
                return addr.shl(32);
            },
            function(e, addr) {
                n = Long.fromString(parseInt(e[3]).toString(16) + '0000', true, 16);
                return addr.or(n);
            },
            function(e, addr) {
                return addr.or(Long.fromString(parseInt(e[3]).toString(16), true, 16));
            }
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed[1])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].pseudo = Base.instructions.nop();
        }
        --i;
        addr = '0x' + addr.toString(16)
        instr.pseudo = Base.instructions.assign(instr.parsed[1], addr.replace(/0x-/, '-0x'));
        return i;
    };

    var vle_imm_check = {
        "e_add16i": function(e, reg) {
            return e[2] == e[1] && e[2] == reg;
        },
        "se_addi": function(e, reg) {
            return e[1] == reg;
        },
        "e_or2i": function(e, reg) {
            return e[1] == reg;
        },
        "e_ori": function(e, reg) {
            return e[2] == e[1] && e[2] == reg;
        },
    }

    var vle_imm = {
        "e_add16i": function(e, addr) {
            var n = Long.fromString((parseInt(e[3]) >> 0).toString(16), false, 16);
            return addr.add(n);
        },
        "se_addi": function(e, addr) {
            var n = Long.fromString((parseInt(e[2]) >> 0).toString(16), false, 16);
            return addr.add(n);
        },
        "e_or2i": function(e, addr) {
            var n = Long.fromString((parseInt(e[2]) >> 0).toString(16), false, 16);
            return addr.or(n);
        },
        "e_ori": function(e, addr) {
            var n = Long.fromString((parseInt(e[3]) >> 0).toString(16), false, 16);
            return addr.or(n);
        },
    };

    var lis64_vle = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e[0] == 'e_lis' && e[1] == r;
            },
            function(e, r) {
                if (e[0] == 'nop') {
                    return true;
                }
                var op = vle_imm_check[e[0]];
                return op && op(e, r);
            },
        ];
        var address = [
            function(e, addr) {
                return Long.fromString(parseInt(e[2]).toString(16) + '0000', false, 16);
            },
            function(e, addr) {
                if (e[0] == 'nop') {
                    return addr;
                }
                return vle_imm[e[0]](e, addr);
            },
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed[1])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].pseudo = Base.instructions.nop();
        }
        --i;
        addr = '0x' + addr.toString(16)
        instr.pseudo = Base.instructions.assign(instr.parsed[1], addr.replace(/0x-/, '-0x'));
        return i;
    };

    var _load_address_32_64 = function(start, instructions) {
        var instr = instructions[start];
        var op = instr.parsed[0];
        if (op == 'lis') {
            /* PPC */
            return lis64_ppc(instr, start, instructions);
        } else if (op == 'e_lis') {
            /* PPC VLE */
            return lis64_vle(instr, start, instructions);
        }
        return start;
    };

    var _is_jumping_outside = function(instructions, instr){
        return instr.jump.lt(instructions[0].loc) || instr.jump.gt(instr.loc);
    };

    return {
        instructions: {
            b: function(instr, context, instructions) {
                if (instructions.indexOf(instr) == instructions.length - 1 && _is_jumping_outside(instructions, instr)) {
                    //name, args, is_pointer, returns, bits
                    return Base.instructions.call(instr.parsed[1], [], instr.parsed[1].indexOf('0x') == 0, 'return');
                }
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
            bl: function(instr, context, instructions) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                instr.invalidate_jump();
                var args = [];
                var regs = ['r10', 'r9', 'r8', 'r7', 'r6', 'r5', 'r4', 'r3'];
                var found = 0;
                for (var i = instructions.indexOf(instr) - 1; i >= 0; i--) {
                    var reg = instructions[i].parsed[1];
                    if (regs.indexOf(reg) >= 0) {
                        var n = parseInt(reg.substr(1, 3))
                        found = n - 2;
                        break;
                    }
                }
                for (var i = 0; i < found; i++) {
                    args.push('r' + (i + 3));
                }
                return Base.instructions.call(fcn_name, args);
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
                return Base.instructions.assign('lr', instr.parsed[1]);
            },
            blr: _ppc_return,
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
                return load_bits(instr.parsed, 32, false);
            },
            lwzu: function(instr) {
                return load_bits(instr.parsed, 32, true);
            },
            lmw: function(instr) {
                return load_bits(instr.parsed, 32, true);
            },
            lwzx: function(instr) {
                return load_idx_bits(instr, 32, true);
            },
            lhz: function(instr) {
                return load_bits(instr.parsed, 16, false);
            },
            lbz: function(instr) {
                return load_bits(instr.parsed, 8, true);
            },
            lbzu: function(instr) {
                return load_bits(instr.parsed, 8, false);
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
                return store_bits(instr.parsed, 32, false);
            },
            stmw: function(instr) {
                return store_bits(instr.parsed, 32, false);
            },
            sth: function(instr) {
                return store_bits(instr.parsed, 16, false);
            },
            stb: function(instr) {
                return store_bits(instr.parsed, 8, false);
            },
            dcbz: function(instr) {
                if (instr.parsed[1] == "0") {
                    return Base.instructions.call('_dcbz', [instr.parsed[2]]);
                }
                return Base.instructions.call('_dcbz', [instr.parsed[1] + ' + ' + instr.parsed[2]]);
            },
            mtmsrd: function(instr) {
                return Base.instructions.call('_mtmsrd', [instr.parsed[1]]);
            },
            mfmsrd: function(instr) {
                return Base.instructions.call('_mfmsrd', [], false, instr.parsed[1], 64, false);
            },
            mtmsr: function(instr) {
                return Base.instructions.call('_mtmsr', [instr.parsed[1]]);
            },
            mfmsr: function(instr) {
                return Base.instructions.call('_mfmsr', [], false, instr.parsed[1], 64, false);
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
                return Base.instructions.assign(instr.parsed[1], 'lr');
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
                instr.comments.push("SPR num: " + parseInt(instr.parsed[2]));
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
                return Base.instructions.call('_sync');
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
            lis: _lis_instr,
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
                if (instr.parsed[3] == '0') {
                    return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
                }
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
            rlwinm: function(instr) {
                var dst = instr.parsed[1];
                var src = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mb = parseInt(instr.parsed[4]);
                var me = parseInt(instr.parsed[5]);
                var m = '0x' + (mask32(mb, me) >>> 0).toString(16);
                if (sh == 0) {
                    return Base.instructions.and(instr.parsed[1], instr.parsed[2], m);
                }
                var rol = Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], sh, 32);
                var and = Base.instructions.and(instr.parsed[1], instr.parsed[1], m);
                return Base.composed([rol, and]);
            },
            rlwimi: function(instr) {
                var dst = instr.parsed[1];
                var src = instr.parsed[2];
                var sh = parseInt(instr.parsed[3]);
                var mb = parseInt(instr.parsed[4]);
                var me = parseInt(instr.parsed[5]);
                return _rlwimi(dst, src, sh, mb, me);
            },
            clrlwi: function(instr) {
                var dst = instr.parsed[1];
                var src = instr.parsed[2];
                var sh = 0;
                var mb = parseInt(instr.parsed[3]);
                var me = 31;
                return _rlwimi(dst, src, sh, mb, me);
            },
            clrrwi: function(instr) {
                var dst = instr.parsed[1];
                var src = instr.parsed[2];
                var sh = 0;
                var mb = 0;
                var me = 31 - parseInt(instr.parsed[3]);
                return _rlwimi(dst, src, sh, mb, me);
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
            wrteei: function(instr) {
                if (instr.parsed[1] != '0') {
                    return Base.instructions.macro('DISABLE_INTERRUPTS', null, '#define DISABLE_INTERRUPTS __asm(wrteei 0)')
                } else if (instr.parsed[1] != '1') {
                    return Base.instructions.macro('ENABLE_INTERRUPTS', null, '#define ENABLE_INTERRUPTS __asm(wrteei 1)')
                }
                return Base.instructions.unknown(instr.opcode);
            },
            "e_add16i": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.add, 32);
            },
            "e_add2i.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.subtract);
            },
            "e_addi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract);
            },
            "e_addi.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract);
            },
            "e_addic": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract);
            },
            "e_addic.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract);
            },
            "e_and2i.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.and);
            },
            "e_andi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.and);
            },
            "e_andi.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.and);
            },
            "e_bge": function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            "e_ble": function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            "e_bne": function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            "e_blt": function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            "e_bgt": function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            "e_beq": function(instr, context, instructions) {
                return _conditional(instr, context, 'NE');
            },
            "e_bgel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _ppc_return(instr, context, instructions);
            },
            "e_blel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _ppc_return(instr, context, instructions);
            },
            "e_bnel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return _ppc_return(instr, context, instructions);
            },
            "e_bltl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _ppc_return(instr, context, instructions);
            },
            "e_bgtl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _ppc_return(instr, context, instructions);
            },
            "e_beql": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return _ppc_return(instr, context, instructions);
            },
            "e_bgectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_blectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_bnectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_bltctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_bgtctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_beqctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return Base.instructions.call('ctr', [], true, 'return');
            },
            "e_bgectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return Base.instructions.call('ctr', [], true);
            },
            "e_blectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return Base.instructions.call('ctr', [], true);
            },
            "e_bnectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE');
                return Base.instructions.call('ctr', [], true);
            },
            "e_bltctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return Base.instructions.call('ctr', [], true);
            },
            "e_bgtctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return Base.instructions.call('ctr', [], true);
            },
            "e_beqctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return Base.instructions.call('ctr', [], true);
            },
            "e_b": function(instr) {
                return Base.instructions.nop();
            },
            "e_bl": function(instr) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.instructions.call(fcn_name);
            },
            "e_cmp16i": function(instr, context, instructions) {
                return _compare(instr, context, 16);
            },
            "e_cmph16i": function(instr, context, instructions) {
                return _compare(instr, context, 16);
            },
            "e_cmph": function(instr, context, instructions) {
                return _compare(instr, context, 16);
            },
            "e_cmphl16i": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "e_cmphl": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "e_cmpli": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "e_cmpi": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "e_cmpl16i": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "e_lbz": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, false);
            },
            "e_lbzu": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, true);
            },
            "e_lha": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, false);
            },
            "e_lhau": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, true);
            },
            "e_lhz": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, false);
            },
            "e_lhzu": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, true);
            },
            "e_li": function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            "e_lis": function(instr, context, instructions) {
                var num = instr.parsed[2].replace(/0x/, '');
                if (num.length > 4) {
                    num = num.substr(3, 8);
                }
                return Base.instructions.assign(instr.parsed[1], '0x' + num + '0000');
            },
            "e_lmw": function(instr, context, instructions) {
                return load_bits(instr.parsed, 32, true);
            },
            "e_lwz": function(instr, context, instructions) {
                return load_bits(instr.parsed, 32, false);
            },
            "e_lwzu": function(instr, context, instructions) {
                return load_bits(instr.parsed, 32, true);
            },
            "e_or2i": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.or);
            },
            "e_ori": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.or);
            },
            "e_ori.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.or);
            },
            "e_rlw": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_rlw.": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_rlwi": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_rlwi.": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_slwi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 32);
            },
            "e_slwi.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.shift_left, 32);
            },
            "e_srwi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 32);
            },
            "e_srwi.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.shift_right, 32);
            },
            "e_stb": function(instr, context, instructions) {
                return store_bits(instr.parsed, 8, false);
            },
            "e_stbu": function(instr, context, instructions) {
                return store_bits(instr.parsed, 8, true);
            },
            "e_sth": function(instr, context, instructions) {
                return store_bits(instr.parsed, 16, false);
            },
            "e_sthu": function(instr, context, instructions) {
                return store_bits(instr.parsed, 16, true);
            },
            "e_stmw": function(instr, context, instructions) {
                return store_bits(instr.parsed, 32, false);
            },
            "e_stw": function(instr, context, instructions) {
                return store_bits(instr.parsed, 32, false);
            },
            "e_stwu": function(instr, context, instructions) {
                return store_bits(instr.parsed, 32, true);
            },
            "e_subfic": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract, 32);
            },
            "e_subfic.": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.instructions.subtract, 32);
            },
            /*
            "e_add2is": function(instr, context, instructions) {},
            "e_and2is.": function(instr, context, instructions) {},
            "e_bns": function(instr, context, instructions) {},
            "e_bso": function(instr, context, instructions) {},
            "e_bc": function(instr, context, instructions) {},
            "e_bnsl": function(instr, context, instructions) {},
            "e_bsol": function(instr, context, instructions) {},
            "e_bcl": function(instr, context, instructions) {},
            "e_bnsctr": function(instr, context, instructions) {},
            "e_bsoctr": function(instr, context, instructions) {},
            "e_bcctr": function(instr, context, instructions) {},
            "e_bnsctrl": function(instr, context, instructions) {},
            "e_bsoctrl": function(instr, context, instructions) {},
            "e_bcctrl": function(instr, context, instructions) {},

            "e_crand": function(instr, context, instructions) {},
            "e_crandc": function(instr, context, instructions) {},
            "e_creqv": function(instr, context, instructions) {},
            "e_crnand": function(instr, context, instructions) {},
            "e_crnor": function(instr, context, instructions) {},
            "e_cror": function(instr, context, instructions) {},
            "e_crorc": function(instr, context, instructions) {},
            "e_crxor": function(instr, context, instructions) {},

            "e_mcrf": function(instr, context, instructions) {},
            "e_mull2i": function(instr, context, instructions) {},
            "e_mulli": function(instr, context, instructions) {},
            "e_or2is": function(instr, context, instructions) {},

            "e_rlwimi": function(instr, context, instructions) {},
            "e_rlwinm": function(instr, context, instructions) {},
            */
            "e_xori": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.xor);
            },
            "e_xori.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.xor);
            },
            "se_illegal": function() {
                return Base.instructions.nop();
            },
            "se_isync": function(instr, context, instructions) {
                return Base.instructions.call('_isync');
            },
            "se_sc": function(instr, context, instructions) {},
            "se_blr": function(instr, context, instructions) {
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
            "se_blrl": function(instr, context, instructions) {
                if (context.mtlr.register) {
                    context.mtlr.instr.valid = false;
                    return Base.instructions.call(context.mtlr.register, [], true);
                }
                return Base.instructions.call('lr', [], true);
            },
            "se_bctrl": function(instr, context, instructions) {
                return Base.instructions.call('ctr', [], true);
            },
            /*
            "se_bctr": function(instr, context, instructions) {},
            */
            "se_rfi": function(instr, context, instructions) {
                return Base.instructions.call('_rfi');
            },
            "se_rfci": function(instr, context, instructions) {
                return Base.instructions.call('_rfci');
            },
            "se_rfdi": function(instr, context, instructions) {
                return Base.instructions.call('_rfdi');
            },
            "se_not": function(instr, context, instructions) {
                return Base.instructions.not(instr.parsed[1], instr.parsed[2]);
            },
            "se_neg": function(instr, context, instructions) {
                return Base.instructions.negate(instr.parsed[1], instr.parsed[2]);
            },
            "se_mflr": function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[1], 'lr');
            },
            "se_mtlr": function(instr, context, instructions) {
                return Base.instructions.assign('lr', instr.parsed[1]);
            },
            "se_mfctr": function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[1], 'ctr');
            },
            "se_mtctr": function(instr, context, instructions) {
                return Base.instructions.assign('ctr', instr.parsed[1]);
            },
            "se_extzb": function(instr, context, instructions) {
                if (instr.parsed.length == 2) {
                    return Base.instructions.extend(instr.parsed[1], instr.parsed[1], 32);
                }
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 32);
            },
            "se_extsb": function(instr, context, instructions) {
                if (instr.parsed.length == 2) {
                    return Base.instructions.extend(instr.parsed[1], instr.parsed[1], 32);
                }
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 32);
            },
            "se_extzh": function(instr, context, instructions) {
                if (instr.parsed.length == 2) {
                    return Base.instructions.extend(instr.parsed[1], instr.parsed[1], 32);
                }
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 32);
            },
            "se_extsh": function(instr, context, instructions) {
                if (instr.parsed.length == 2) {
                    return Base.instructions.extend(instr.parsed[1], instr.parsed[1], 32);
                }
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 32);
            },
            "se_mr": function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            "se_mtar": function(instr, context, instructions) {
                return Base.instructions.call('_mtar', [instr.parsed[1]]);
            },
            "se_mfar": function(instr, context, instructions) {
                return Base.instructions.call('_mfar', [], false, instr.parsed[1]);
            },
            "se_add": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.add);
            },
            "se_mullw": function(instr, context, instructions) {},
            "se_sub": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.subtract);
            },
            "se_subf": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.subtract);
            },
            "se_cmpi": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "se_cmpli": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "se_cmp": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "se_cmpl": function(instr, context, instructions) {
                return _compare(instr, context, 32);
            },
            "se_cmph": function(instr, context, instructions) {
                return _compare(instr, context, 16);
            },
            "se_cmphl": function(instr, context, instructions) {
                return _compare(instr, context, 16);
            },
            "se_addi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.add);
            },
            "se_and": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.and);
            },
            "se_and.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.and);
            },
            "se_andi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.and);
            },
            "se_andc": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.and);
            },
            "se_b": function(instr, context, instructions) {
                return Base.instructions.nop();
            },
            "se_bl": function(instr, context, instructions) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.instructions.call(fcn_name);
            },
            "se_bge": function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            "se_ble": function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            "se_bne": function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            "se_blt": function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            "se_bgt": function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            "se_beq": function(instr, context, instructions) {
                return _conditional(instr, context, 'NE');
            },
            "se_or": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.or);
            },
            "se_li": function(instr, context, instructions) {
                return Base.instructions.assign(instr.parsed[1], instr.parsed[2]);
            },
            "se_bmaski": function(instr, context, instructions) {
                return Base.instructions.bit_mask(instr.parsed[1], instr.parsed[1], instr.parsed[2]);
            },
            /*
                        "se_bclri": function(instr, context, instructions) {},
                        "se_bgeni": function(instr, context, instructions) {},
            */
            "se_bseti": function(instr, context, instructions) {
                var bit = '(1 << ' + parseInt(instr.parsed[2]) + ')';
                return Base.instructions.or(instr.parsed[1], instr.parsed[1], bit);
            },
            "se_btsti": function(instr, context, instructions) {
                var bit = '(1 << ' + parseInt(instr.parsed[2]) + ')';
                context.cond.cr0.a = new Base.bits_argument(instr.parsed[1]);
                context.cond.cr0.b = new Base.bits_argument(bit);
            },
            "se_lbz": function(instr, context, instructions) {
                return load_bits(instr.parsed, 8, false);
            },
            "se_lbh": function(instr, context, instructions) {
                return load_bits(instr.parsed, 16, false);
            },
            "se_lwz": function(instr, context, instructions) {
                return load_bits(instr.parsed, 32, false);
            },
            "se_slw": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.shift_left, 32);
            },
            "se_slwi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.shift_left, 32);
            },
            "se_sraw": function(instr, context, instructions) {
                return op_rotate3(instr.parsed, 32, true);
            },
            "se_srawi": function(instr, context, instructions) {
                return op_rotate3(instr.parsed, 32, true);
            },
            "se_srw": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.shift_right, 32);
            },
            "se_srwi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.shift_right, 32);
            },
            "se_stb": function(instr, context, instructions) {
                return store_bits(instr.parsed, 8, false);
            },
            "se_sth": function(instr, context, instructions) {
                return store_bits(instr.parsed, 16, false);
            },
            "se_stw": function(instr, context, instructions) {
                return store_bits(instr.parsed, 32, false);
            },
            "se_subi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.subtract);
            },
            "se_subi.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.instructions.subtract);
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
                returns: 'void',
                mtlr: {},
                longaddr: [],
                vars: []
            }
        },
        custom_end: function(instructions, context) {
            /* simplifies any load address 32/64 bit */
            for (var i = 0; i < instructions.length; i++) {
                i = _load_address_32_64(i, instructions, context);
            }
        },
        localvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return context.returns;
        }
    };
})();
