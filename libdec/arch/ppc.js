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

/* https://www.ibm.com/developerworks/systems/library/es-archguide-v2.html */
(function() { // lgtm [js/useless-expression]
    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');
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
        var a = swap ? e.opd[2] : e.opd[1];
        var b = swap ? e.opd[1] : e.opd[2];
        //value, bits, is_signed, is_pointer, is_memory
        if (swap) {
            b = Variable.local(b, bits);
        } else {
            a = Variable.local(a, bits);
        }
        return op(e.opd[0], a, b);
    };

    var op_bits3 = function(e, op, bits) {
        var a = e.opd[0];
        var b = e.opd[1];
        if (bits) {
            b = Variable.local(b, bits);
        }
        return op(a, a, b);
    };

    var op_rotate = function(e, bits, left) {
        if (left) {
            return Base.rotate_left(e.opd[0], e.opd[1], e.opd[2], bits);
        }
        return Base.rotate_right(e.opd[0], e.opd[1], e.opd[2], bits);
    };

    var op_rotate3 = function(e, bits, left) {
        if (left) {
            return Base.rotate_left(e.opd[0], e.opd[0], e.opd[1], bits);
        }
        return Base.rotate_right(e.opd[0], e.opd[0], e.opd[1], bits);
    };

    function mask32(mb, me) {
        if (mb == (me + 1)) {
            return 0xffffffff;
        }
        var maskmb = 0xffffffff >>> mb;
        var maskme = 0xffffffff << (31 - me);
        return ((mb <= me) ? (maskmb & maskme) : (maskmb | maskme)) >>> 0;
    }

    function mask32inv(mb, me) {
        return ((~mask32(mb, me)) & 0xffffffff) >>> 0;
    }

    var mask64 = function(mb, me) {
        var value = Long.MAX_UNSIGNED_VALUE;
        if (mb == (me + 1)) {
            return value;
        }
        var maskmb = value.shl(mb);
        var maskme = value.shru(63 - me);
        return (mb <= me) ? maskmb.and(maskme) : maskmb.or(maskme);
    };

    /*
        var mask64inv = function(mb, me) {
            return mask64(mb, me).not();
        };
    */
    var load_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        var arg = e.opd[1].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[0], e.opd[0], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.read_memory(arg[1], e.opd[0], bits, !unsigned);
        }
        arg[0] = (parseInt(arg[0]) >> 0) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
        } else {
            arg[0] = " + 0x" + arg[0].toString(16);
        }
        //pointer, register, bits, is_signed
        return Base.read_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
    };

    var store_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        var arg = e.opd[1].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.write_memory(arg[0], e.opd[0], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.write_memory(arg[1], e.opd[0], bits, !unsigned);
        }
        arg[0] = (parseInt(arg[0]) >> 0) / (bits / 8);
        if (arg[0] < 0) {
            arg[0] = " - 0x" + Math.abs(arg[0]).toString(16);
        } else {
            arg[0] = " + 0x" + arg[0].toString(16);
        }
        //pointer, register, bits, is_signed
        return Base.write_memory(arg[1] + arg[0], e.opd[0], bits, !unsigned);
    };

    var load_idx_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        instr.comments.push('with lock');
        if (e.opd[1] == '0') {
            return Base.read_memory(e.opd[2], e.opd[0], bits, !unsigned);
        }
        return Base.read_memory('(' + e.opd[1] + ' + ' + e.opd[2] + ')', e.opd[0], bits, !unsigned);
    };

    var store_idx_bits = function(instr, bits, unsigned) {
        instr.setBadJump();
        var e = instr.parsed;
        instr.comments.push('with lock');
        if (e.opd[1] == '0') {
            return Base.write_memory(e.opd[2], e.opd[0], bits, !unsigned);
        }
        return Base.write_memory('(' + e.opd[1] + ' + ' + e.opd[2] + ')', e.opd[0], bits, !unsigned);
    };

    var _compare = function(instr, context, bits) {
        var e = instr.parsed;
        var cr = e.opd[0];
        var shift = 1;
        if (!context.cond[cr]) {
            cr = 'cr0';
            shift = 0;
        }
        context.cond[cr].a = Variable.local(e.opd[shift], bits);
        context.cond[cr].b = Variable.local(e.opd[shift + 1], e.opd[shift + 1].charAt(0) == 'r' ? bits : null);
        return Base.nop();
    };

    var _conditional = function(instr, context, type) {
        var e = instr.parsed;
        var cr = e.opd[0];
        if (!context.cond[cr]) {
            cr = 'cr0';
        }
        instr.conditional(context.cond[cr].a, context.cond[cr].b, type);
        return Base.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.cr0.a, context.cond.cr0.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].location;
    };

    var _ppc_return = function(instr, context, instructions) {
        var start = instructions.indexOf(instr);
        var reg = '';
        if (start >= 0) {
            for (var i = (start - 10 < 0 ? 0 : (start - 10)); i < start && i < instructions.length; i++) {
                var t = instructions[i];
                if (t.parsed.opd.length < 1) {
                    continue;
                }
                var p = 0;
                if (t.parsed.opd[0] == 'r3') {
                    reg = 'r3';
                    context.returns = 'uint32_t';
                } else if (t.parsed.mnem.indexOf('lw') == 0 && (p = t.assembly.indexOf('r3')) > 0 && t.assembly.indexOf('r1') > p) {
                    reg = '';
                    context.returns = 'void';
                }
            }
        }
        return Base.return(reg);
    };

    var _new_variable = function(context, type) {
        var value = Variable.uniqueName('local');
        var local = Variable.local(value, type);
        context.localvars.push(local);
        return local;
    };

    var _rotate_left_and_mask32 = function(dest, src, shift, mask) {
        if (mask == 0xffffffff) {
            return Base.rotate_left(dest, src, shift.toString(), 64);
        } else if (shift == 0) {
            return Base.and(dest, src, '0x' + mask.toString(16));
        }
        return Base.composed([
            Base.rotate_left(dest, src, shift.toString(), 64),
            Base.and(dest, dest, '0x' + mask.toString(16))
        ]);
    };

    var _rotate_left_and_mask64 = function(dest, src, shift, mask) {
        if (mask.eq(Long.MAX_UNSIGNED_VALUE)) {
            return Base.rotate_left(dest, src, shift.toString(), 64);
        } else if (shift == 0) {
            return Base.and(dest, src, '0x' + mask.toString(16));
        }
        return Base.composed([
            Base.rotate_left(dest, src, shift.toString(), 64),
            Base.and(dest, dest, '0x' + mask.toString(16))
        ]);
    };

    var _rlwimi = function(dst, src, sh, mb, me, context) {
        var m = mask32(mb, me);
        var minv = mask32inv(mb, me);
        var ops = [];
        // (dst & ~mask) | (rotl32(src, sh) & mask)
        if (m == 0) {
            ops.push(Base.and(dst, dst, minv.toString(16)));
        } else if (minv == 0) {
            if (sh == 0) {
                ops.push(Base.and(dst, src, m.toString(16)));
            } else {
                var value = _new_variable(context, 'uint32_t');
                ops.push(Base.rotate_left(value, src, sh, 32));
                ops.push(Base.and(dst, value, '0x' + m.toString(16)));
            }
        } else {
            var value0 = _new_variable(context, 'uint32_t');
            var value1 = _new_variable(context, 'uint32_t');
            if (sh > 0) {
                ops.push(Base.rotate_left(value0, src, sh, 32));
                ops.push(Base.and(value0, value0, '0x' + m.toString(16)));
            } else if (sh == 0 && m == 0xffff) {
                if (dst != src) {
                    return Base.assign(dst, src);
                }
                return Base.nop();
            } else {
                ops.push(Base.and(value0, src, '0x' + m.toString(16)));
            }
            ops.push(Base.and(value1, dst, '0x' + minv.toString(16)));
            ops.push(Base.or(dst, value1, value0));
        }
        return Base.composed(ops);
    };

    var _lis_instr = function(instr) {
        if (instr.parsed.opd[1] == '0') {
            return Base.assign(instr.parsed.opd[0], '0');
        }
        return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1] + "0000");
    };

    var lis64_ppc = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e.mnem == 'lis' && e.opd[0] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                return (e.mnem == 'ori' && e.opd[0] == r && e.opd[1] == r) || (e.mnem == 'addi' && e.opd[0] == r && e.opd[1] == r);
            },
            function(e, r) {
                var p = parseInt(e.opd[2]);
                return e.mnem == 'sldi' && e.opd[0] == r && e.opd[1] == r && p == 32;
            },
            function(e, r) {
                return e.mnem == 'oris' && e.opd[0] == r && e.opd[1] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                return (e.mnem == 'ori' && e.opd[0] == r && e.opd[1] == r) || (e.mnem == 'addi' && e.opd[0] == r && e.opd[1] == r);
            }
        ];
        var address = [
            function(e, addr) {
                return Long.fromString(parseInt(e.opd[1]).toString(16) + '0000', false, 16);
            },
            function(e, addr) {
                var n = Long.fromString(parseInt(e.opd[2]).toString(16), false, 16);
                var op = e.mnem.replace(/i/, '');
                return addr[op](n);
            },
            function(e, addr) {
                return addr.shl(32);
            },
            function(e, addr) {
                var n = Long.fromString(parseInt(e.opd[2]).toString(16) + '0000', true, 16);
                return addr.or(n);
            },
            function(e, addr) {
                return addr.or(Long.fromString(parseInt(e.opd[2]).toString(16), true, 16));
            }
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed.opd[0])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].valid = false;
        }
        --i;
        instr.string = Global.xrefs.find_string(addr);
        instr.symbol = Global.xrefs.find_symbol(addr);
        addr = instr.string ? Variable.string(instr.string) : (instr.symbol || ('0x' + addr.toString(16)).replace(/0x-/, '-0x'));
        instr.code = Base.assign(instr.parsed.opd[0], addr);
        instr.valid = true;
        return i;
    };

    var vle_imm_check = {
        "e_add16i": function(e, reg) {
            return e.opd[1] == e.opd[0] && e.opd[1] == reg;
        },
        "se_addi": function(e, reg) {
            return e.opd[0] == reg;
        },
        "e_or2i": function(e, reg) {
            return e.opd[0] == reg;
        },
        "e_ori": function(e, reg) {
            return e.opd[1] == e.opd[0] && e.opd[1] == reg;
        },
    };

    var vle_imm = {
        "e_add16i": function(e, addr) {
            var n = Long.fromString((parseInt(e.opd[2]) >> 0).toString(16), false, 16);
            return addr.add(n);
        },
        "se_addi": function(e, addr) {
            var n = Long.fromString((parseInt(e.opd[1]) >> 0).toString(16), false, 16);
            return addr.add(n);
        },
        "e_or2i": function(e, addr) {
            var n = Long.fromString((parseInt(e.opd[1]) >> 0).toString(16), false, 16);
            return addr.or(n);
        },
        "e_ori": function(e, addr) {
            var n = Long.fromString((parseInt(e.opd[2]) >> 0).toString(16), false, 16);
            return addr.or(n);
        },
    };

    var lis64_vle = function(instr, start, instructions) {
        var addr = null;
        var check = [
            function(e, r) {
                return e.mnem == 'e_lis' && e.opd[0] == r;
            },
            function(e, r) {
                if (e.mnem == 'nop') {
                    return true;
                }
                var op = vle_imm_check[e.mnem];
                return op && op(e, r);
            },
        ];
        var address = [
            function(e, addr) {
                return Long.fromString(parseInt(e.opd[1]).toString(16) + '0000', false, 16);
            },
            function(e, addr) {
                if (e.mnem == 'nop') {
                    return addr;
                }
                return vle_imm[e.mnem](e, addr);
            },
        ];
        var step = 0;
        var i;
        for (i = start; i < instructions.length && step < check.length; ++i) {
            var elem = instructions[i].parsed;
            if (!check[step](elem, instr.parsed.opd[0])) {
                break;
            }
            addr = address[step](elem, addr);
            step++;
            instructions[i].valid = false;
        }
        --i;
        instructions[i].valid = true;
        instr.string = Global.xrefs.find_string(addr);
        instr.symbol = Global.xrefs.find_symbol(addr);
        addr = instr.string ? Variable.string(instr.string) : (instr.symbol || ('0x' + addr.toString(16)).replace(/0x-/, '-0x'));
        instr.code = Base.assign(instr.parsed.opd[0], addr);
        return i;
    };

    var _load_address_32_64 = function(start, instructions) {
        var instr = instructions[start];
        var op = instr.parsed.mnem;
        if (op == 'lis') {
            /* PPC */
            return lis64_ppc(instr, start, instructions);
        } else if (op == 'e_lis') {
            /* PPC VLE */
            return lis64_vle(instr, start, instructions);
        }
        return start;
    };

    var _is_jumping_outside = function(instructions, instr) {
        return instr.jump.lt(instructions[0].location) || instr.jump.gt(instructions[instructions.length - 1].location);
    };

    return {
        instructions: {
            b: function(instr, context, instructions) {
                if (_is_jumping_outside(instructions, instr)) {
                    var arg = instr.parsed.opd[0];
                    arg = arg.indexOf('0x') == 0 ? Variable.functionPointer(arg) : arg;
                    return Base.call(arg, []);
                }
                return Base.nop();
            },
            'bne': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'bne-': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'bne+': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'beq': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'beq-': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'beq+': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'bgt': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'bgt-': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'bgt+': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'bge': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'bge-': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'bge+': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'blt': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'blt-': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'blt+': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'ble': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'ble-': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'ble+': function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            bl: function(instr, context, instructions) {
                var i;
                var fcn_name = instr.parsed.opd[0].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                instr.setBadJump();
                var args = [];
                var regs = ['r10', 'r9', 'r8', 'r7', 'r6', 'r5', 'r4', 'r3'];
                var found = 0;
                for (i = instructions.indexOf(instr) - 1; i >= 0; i--) {
                    if (instructions[i].parsed.mnem.startsWith('b')) {
                        break;
                    }
                    var reg = instructions[i].parsed.opd[0];
                    if (regs.indexOf(reg) >= 0) {
                        var n = parseInt(reg.substr(1, 3));
                        found = n - 2;
                        break;
                    }
                }
                for (i = 0; i < found; i++) {
                    args.push('r' + (i + 3));
                }
                return Base.call(fcn_name, args);
            },
            bdnz: function(instr, context) {
                instr.conditional('(--ctr)', '0', 'NE');
                return Base.nop();
            },
            blrl: function(instr, context) {
                if (context.mtlr.register) {
                    context.mtlr.instr.valid = false;
                    return Base.call(Variable.functionPointer(context.mtlr.register), []);
                }
                return Base.call(Variable.functionPointer('lr'), []);
            },
            bctrl: function(instr, context) {
                return Base.call(Variable.functionPointer('ctr'), []);
            },
            mtlr: function(instr, context) {
                context.mtlr = {
                    instr: instr,
                    register: instr.parsed.opd[0]
                };
                /*
                if (instr.parsed.opd[0] == 'r0') {
                    return Base.nop();
                }
                */
                return Base.assign('lr', instr.parsed.opd[0]);
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
                return load_bits(instr, 64, false);
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
                return load_bits(instr, 64, true);
            },
            lwz: function(instr) {
                return load_bits(instr, 32, false);
            },
            lwzu: function(instr) {
                return load_bits(instr, 32, true);
            },
            lmw: function(instr) {
                return load_bits(instr, 32, true);
            },
            lwzx: function(instr) {
                return load_idx_bits(instr, 32, true);
            },
            lhz: function(instr) {
                return load_bits(instr, 16, false);
            },
            lbz: function(instr) {
                return load_bits(instr, 8, true);
            },
            lbzu: function(instr) {
                return load_bits(instr, 8, false);
            },
            std: function(instr) {
                return store_bits(instr, 64, false);
            },
            stdcx: function(instr) {
                return store_idx_bits(instr, 64, false);
            },
            'stdcx.': function(instr) {
                return store_idx_bits(instr, 64, false);
            },
            stdu: function(instr) {
                return store_bits(instr, 64, true);
            },
            stwu: function(instr) {
                return store_bits(instr, 32, true);
            },
            stw: function(instr) {
                return store_bits(instr, 32, false);
            },
            stmw: function(instr) {
                return store_bits(instr, 32, false);
            },
            sth: function(instr) {
                return store_bits(instr, 16, false);
            },
            stb: function(instr) {
                return store_bits(instr, 8, false);
            },
            dcbz: function(instr) {
                if (instr.parsed.opd[0] == "0") {
                    return Base.call('_dcbz', [instr.parsed.opd[1]]);
                }
                return Base.call('_dcbz', [instr.parsed.opd[0] + ' + ' + instr.parsed.opd[1]]);
            },
            mtmsrd: function(instr) {
                return Base.call('_mtmsrd', [instr.parsed.opd[0]]);
            },
            mfmsrd: function(instr) {
                return Base.assign(Variable.local(instr.parsed.opd[0], 64, false), Base.call('_mfmsrd', []));
            },
            mtmsr: function(instr) {
                return Base.call('_mtmsr', [instr.parsed.opd[0]]);
            },
            mfmsr: function(instr) {
                return Base.assign(Variable.local(instr.parsed.opd[0], 64, false), Base.call('_mfmsr', []));
            },
            mfcr: function(instr) {
                return Base.assign(instr.parsed.opd[0], Base.call('_mfcr', []));
            },
            mtcr: function(instr) {
                return Base.call('_mtcr', [instr.parsed.opd[0]]);
            },
            mtctr: function(instr) {
                return Base.assign('ctr', instr.parsed.opd[0]);
            },
            mfctr: function(instr) {
                return Base.assign(instr.parsed.opd[0], 'ctr');
            },
            mtcrf: function(instr) {
                return Base.call('_mtcrf', [instr.parsed.opd[0], instr.parsed.opd[1]]);
            },
            mflr: function(instr) {
                /*
                if (instr.parsed.opd[0] == 'r0') {
                    return Base.nop();
                }
                */
                return Base.assign(instr.parsed.opd[0], 'lr');
            },
            mtocrf: function(instr) {
                return Base.call('_mtocrf', [instr.parsed.opd[0], instr.parsed.opd[1]]);
            },
            mfpvr: function(instr) {
                return Base.call('_mfpvr', [], false, instr.parsed.opd[0]);
            },
            mfdccr: function(instr) {
                return Base.call('_mfdccr', [], false, instr.parsed.opd[0]);
            },
            mtdccr: function(instr) {
                return Base.call('_mtdccr', [instr.parsed.opd[0]]);
            },
            mfspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(instr.parsed.opd[1]));
                var spr = get_spr(instr.parsed.opd[1]);
                var bits = get_bits(spr);
                var arg0 = spr.indexOf('0x') != 0 ? new Base.macro(spr) : spr;
                var op = Base.call('_mfspr', [arg0], false, instr.parsed.opd[0], bits, false);
                if (spr.indexOf('0x') != 0) {
                    Global.context.addMacro('#define ' + spr + ' (' + instr.parsed.opd[0] + ')');
                }
                return op;
            },
            mtspr: function(instr) {
                instr.comments.push("SPR num: " + parseInt(instr.parsed.opd[0]));
                var spr = get_spr(instr.parsed.opd[0]);
                var bits = get_bits(spr);
                var reg = Variable.local(instr.parsed.opd[1], bits);
                var arg0 = spr.indexOf('0x') != 0 ? Variable.macro(spr) : spr;
                var op = Base.call('_mtspr', [arg0, reg]);
                if (spr.indexOf('0x') != 0) {
                    Global.context.addMacro('#define ' + spr + ' (' + instr.parsed.opd[0] + ')');
                }
                return op;
            },
            sync: function() {
                return Base.call('_sync');
            },
            lwsync: function() {
                return Base.call('_lwsync');
            },
            isync: function() {
                return Base.call('_isync');
            },
            slbia: function() {
                return Base.call('_slbia');
            },
            eieio: function() {
                return Base.call('_eieio');
            },
            li: function(instr) {
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            lis: _lis_instr,
            mr: function(instr) {
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            neg: function(instr) {
                return Base.negate(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            not: function(instr) {
                return Base.not(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            add: function(instr) {
                return op_bits4(instr.parsed, Base.add);
            },
            addi: function(instr, _, instructions) {
                var p = instructions.indexOf(instr) - 1;
                if (p > -1 &&
                    instructions[p].parsed.mnem == 'lis' &&
                    instructions[p].parsed.opd[0] == instr.parsed.opd[1]) {
                    var v0 = Long.fromString(instructions[p].parsed.opd[1] + '0000', 16).add(Long.fromString(instr.parsed.opd[2], 16));
                    if (instructions[p].parsed.opd[0] == instr.parsed.opd[0]) {
                        instructions[p].valid = false;
                    }
                    var xref = Global.xrefs.find_string(v0);
                    if (xref) {
                        instr.string = xref;
                        xref = Variable.string(xref);
                    }
                    return Base.assign(instr.parsed.opd[0], xref || '0x' + v0.toString(16));
                } else if (instr.parsed.opd[2] == '0') {
                    return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
                }
                return op_bits4(instr.parsed, Base.add);
            },
            addis: function(instr) {
                instr.parsed.opd[2] += '0000';
                return op_bits4(instr.parsed, Base.add);
            },
            sub: function(instr) {
                return op_bits4(instr.parsed, Base.subtract, false, true);
            },
            subc: function(instr) {
                return op_bits4(instr.parsed, Base.subtract, false, true);
            },
            subf: function(instr) {
                return op_bits4(instr.parsed, Base.subtract, false, true);
            },
            xor: function(instr) {
                return op_bits4(instr.parsed, Base.xor);
            },
            xori: function(instr) {
                return op_bits4(instr.parsed, Base.xor);
            },
            or: function(instr) {
                return op_bits4(instr.parsed, Base.or);
            },
            ori: function(instr) {
                return op_bits4(instr.parsed, Base.or);
            },
            oris: function(instr) {
                instr.parsed.opd[2] += '0000';
                return op_bits4(instr.parsed, Base.or);
            },
            and: function(instr) {
                return op_bits4(instr.parsed, Base.and);
            },
            andi: function(instr) {
                return op_bits4(instr.parsed, Base.and);
            },
            divwu: function(instr) {
                return op_bits4(instr.parsed, Base.divide);
            },
            mullw: function(instr) {
                return op_bits4(instr.parsed, Base.multiply);
            },
            mulhwu: function(instr) {
                instr.comments.push("64bit multiplication");
                return Base.composed([
                    op_bits4(instr.parsed, Base.multiply),
                    Base.shift_right(instr.parsed.opd[0], instr.parsed.opd[0], 32)
                ]);
            },
            subfc: function(instr) {
                return op_bits4(instr.parsed, Base.subtract);
            },
            subfic: function(instr) {
                return op_bits4(instr.parsed, Base.subtract);
            },
            subfe: function(instr) {
                return op_bits4(instr.parsed, Base.subtract);
            },
            sld: function(instr) {
                return op_bits4(instr.parsed, Base.shift_left, 64);
            },
            sldi: function(instr) {
                return op_bits4(instr.parsed, Base.shift_left, 64);
            },
            slw: function(instr) {
                return op_bits4(instr.parsed, Base.shift_left, 32);
            },
            slwi: function(instr) {
                return op_bits4(instr.parsed, Base.shift_left, 32);
            },
            srw: function(instr) {
                return op_bits4(instr.parsed, Base.shift_right, 32);
            },
            srwi: function(instr) {
                return op_bits4(instr.parsed, Base.shift_right, 32);
            },
            srawi: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srai: function(instr) {
                return op_rotate(instr.parsed, 32, true);
            },
            srad: function(instr) {
                return op_bits4(instr.parsed, Base.shift_right, 64);
            },
            sradi: function(instr) {
                return op_bits4(instr.parsed, Base.shift_right, 64);
            },
            cntlz: function(instr) {
                var ret = instr.parsed.opd[0];
                var reg = instr.parsed.opd[1];
                return Base.assign(Variable.local(ret, 64, false), Base.call('_cntlz', [reg]));
            },
            cntlzw: function(instr) {
                var ret = instr.parsed.opd[0];
                var reg = instr.parsed.opd[1];
                return Base.assign(Variable.local(ret, 32, false), Base.call('_cntlzw', [reg]));
            },
            extsb: function(instr) {
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int64_t');
            },
            extsh: function(instr) {
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int64_t');
            },
            extsw: function(instr) {
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int64_t');
            },
            rlwinm: function(instr) {
                var dst = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2]);
                var mb = parseInt(instr.parsed.opd[3]);
                var me = parseInt(instr.parsed.opd[4]);
                var mask = mask32(mb, me);
                return _rotate_left_and_mask32(dst, src, sh, mask);
            },
            rlwimi: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2]);
                var mb = parseInt(instr.parsed.opd[3]);
                var me = parseInt(instr.parsed.opd[4]);
                return _rlwimi(dst, src, sh, mb, me, context);
            },
            clrlwi: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var sh = 0;
                var mb = parseInt(instr.parsed.opd[2]);
                var me = 31;
                return _rlwimi(dst, src, sh, mb, me, context);
            },
            clrrwi: function(instr, context) {
                var dst = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var sh = 0;
                var mb = 0;
                var me = 31 - parseInt(instr.parsed.opd[2]);
                return _rlwimi(dst, src, sh, mb, me, context);
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
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2]);
                var mb = parseInt(instr.parsed.opd[3]);
                var me = 63;
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            rldcl: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = instr.parsed.opd[2];
                var mb = parseInt(instr.parsed.opd[3]);
                var me = 63 - sh;
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            rldcr: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = instr.parsed.opd[2];
                var mb = 0;
                var me = parseInt(instr.parsed.opd[3], 16);
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            rldicr: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2], 16);
                var mb = 0;
                var me = parseInt(instr.parsed.opd[3], 16);
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            clrrdi: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2], 16);
                var mb = 0;
                var me = 63 - sh;
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            rldicl: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = parseInt(instr.parsed.opd[2], 16);
                var mb = parseInt(instr.parsed.opd[3], 16);
                var me = 63;
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            clrldi: function(instr) {
                var ra = instr.parsed.opd[0];
                var rs = instr.parsed.opd[1];
                var sh = 0;
                var mb = parseInt(instr.parsed.opd[2], 16);
                var me = 63;
                var mask = mask64(mb, me);
                return _rotate_left_and_mask64(ra, rs, sh, mask);
            },
            wrteei: function(instr) {
                if (instr.parsed.opd[0] != '0') {
                    Global.context.addMacro('#define DISABLE_INTERRUPTS() __asm(wrteei 0)');
                    return Base.call(Variable.macro('DISABLE_INTERRUPTS'), []);
                } else if (instr.parsed.opd[0] != '1') {
                    Global.context.addMacro('#define ENABLE_INTERRUPTS() __asm(wrteei 1)');
                    return Base.call(Variable.macro('ENABLE_INTERRUPTS'), []);
                }
                return Base.unknown(instr.opcode);
            },
            "e_add16i": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.add, 32);
            },
            "e_add2i.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.subtract);
            },
            "e_addi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.subtract);
            },
            "e_addic": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.subtract);
            },
            "e_and2i.": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.and);
            },
            "e_andi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.and);
            },
            "e_bge": function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            "e_ble": function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            "e_bne": function(instr, context, instructions) {
                return _conditional(instr, context, 'NE_');
            },
            "e_blt": function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            "e_bgt": function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            "e_beq": function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            "e_bgel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return _ppc_return(instr, context, instructions);
            },
            "e_blel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return _ppc_return(instr, context, instructions);
            },
            "e_bnel": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return _ppc_return(instr, context, instructions);
            },
            "e_bltl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return _ppc_return(instr, context, instructions);
            },
            "e_bgtl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return _ppc_return(instr, context, instructions);
            },
            "e_beql": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE_');
                return _ppc_return(instr, context, instructions);
            },
            "e_bgectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return Base.call('ctr', [], true, 'return');
            },
            "e_blectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return Base.call('ctr', [], true, 'return');
            },
            "e_bnectr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return Base.call('ctr', [], true, 'return');
            },
            "e_bltctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return Base.call('ctr', [], true, 'return');
            },
            "e_bgtctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return Base.call('ctr', [], true, 'return');
            },
            "e_beqctr": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE_');
                return Base.call('ctr', [], true, 'return');
            },
            "e_bgectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LT');
                return Base.call('ctr', [], true);
            },
            "e_blectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GT');
                return Base.call('ctr', [], true);
            },
            "e_bnectrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'EQ');
                return Base.call('ctr', [], true);
            },
            "e_bltctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'GE');
                return Base.call('ctr', [], true);
            },
            "e_bgtctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'LE');
                return Base.call('ctr', [], true);
            },
            "e_beqctrl": function(instr, context, instructions) {
                _conditional_inline(instr, context, instructions, 'NE_');
                return Base.call('ctr', [], true);
            },
            "e_b": function(instr) {
                return Base.nop();
            },
            "e_bl": function(instr) {
                var fcn_name = instr.parsed.opd[0].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.call(fcn_name);
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
                return load_bits(instr, 8, false);
            },
            "e_lbzu": function(instr, context, instructions) {
                return load_bits(instr, 8, true);
            },
            "e_lha": function(instr, context, instructions) {
                return load_bits(instr, 8, false);
            },
            "e_lhau": function(instr, context, instructions) {
                return load_bits(instr, 8, true);
            },
            "e_lhz": function(instr, context, instructions) {
                return load_bits(instr, 8, false);
            },
            "e_lhzu": function(instr, context, instructions) {
                return load_bits(instr, 8, true);
            },
            "e_li": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            "e_lis": function(instr, context, instructions) {
                var num = instr.parsed.opd[1].replace(/0x/, '');
                if (num.length > 4) {
                    num = num.substr(3, 8);
                }
                return Base.assign(instr.parsed.opd[0], '0x' + num + '0000');
            },
            "e_lmw": function(instr, context, instructions) {
                return load_bits(instr, 32, true);
            },
            "e_lwz": function(instr, context, instructions) {
                return load_bits(instr, 32, false);
            },
            "e_lwzu": function(instr, context, instructions) {
                return load_bits(instr, 32, true);
            },
            "e_or2i": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.or);
            },
            "e_ori": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.or);
            },
            "e_rlw": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_rlwi": function(instr, context, instructions) {
                return op_rotate(instr.parsed, 32, true);
            },
            "e_slwi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.shift_left, 32);
            },
            "e_srwi": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.shift_right, 32);
            },
            "e_stb": function(instr, context, instructions) {
                return store_bits(instr, 8, false);
            },
            "e_stbu": function(instr, context, instructions) {
                return store_bits(instr, 8, true);
            },
            "e_sth": function(instr, context, instructions) {
                return store_bits(instr, 16, false);
            },
            "e_sthu": function(instr, context, instructions) {
                return store_bits(instr, 16, true);
            },
            "e_stmw": function(instr, context, instructions) {
                return store_bits(instr, 32, false);
            },
            "e_stw": function(instr, context, instructions) {
                return store_bits(instr, 32, false);
            },
            "e_stwu": function(instr, context, instructions) {
                return store_bits(instr, 32, true);
            },
            "e_subfic": function(instr, context, instructions) {
                return op_bits4(instr.parsed, Base.subtract, 32);
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
                return op_bits3(instr.parsed, Base.xor);
            },
            "se_illegal": function() {
                return Base.nop();
            },
            "se_isync": function(instr, context, instructions) {
                return Base.call('_isync');
            },
            "se_sc": function(instr, context, instructions) {},
            "se_blr": function(instr, context, instructions) {
                var start = instructions.indexOf(instr);
                if (start >= 0) {
                    for (var i = start - 1; i >= start - 4; i--) {
                        if (instructions[i].parsed.opd.length < 1) {
                            continue;
                        }
                        if (instructions[i].parsed.opd[0] == 'r3') {
                            return Base.return('r3');
                        }
                    }
                }
                return Base.return();
            },
            "se_blrl": function(instr, context, instructions) {
                if (context.mtlr.register) {
                    context.mtlr.instr.valid = false;
                    return Base.call(Variable.functionPointer(context.mtlr.register), []);
                }
                return Base.call(Variable.functionPointer('lr'), []);
            },
            "se_bctrl": function(instr, context, instructions) {
                return Base.call(Variable.functionPointer('ctr'), []);
            },
            /*
            "se_bctr": function(instr, context, instructions) {},
            */
            "se_rfi": function(instr, context, instructions) {
                return Base.call('_rfi');
            },
            "se_rfci": function(instr, context, instructions) {
                return Base.call('_rfci');
            },
            "se_rfdi": function(instr, context, instructions) {
                return Base.call('_rfdi');
            },
            "se_not": function(instr, context, instructions) {
                return Base.not(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            "se_neg": function(instr, context, instructions) {
                return Base.negate(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            "se_mflr": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], 'lr');
            },
            "se_mtlr": function(instr, context, instructions) {
                return Base.assign('lr', instr.parsed.opd[0]);
            },
            "se_mfctr": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], 'ctr');
            },
            "se_mtctr": function(instr, context, instructions) {
                return Base.assign('ctr', instr.parsed.opd[0]);
            },
            "se_extzb": function(instr, context, instructions) {
                if (instr.parsed.opd.length == 1) {
                    return Base.cast(instr.parsed.opd[0], instr.parsed.opd[0], 'int32_t');
                }
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int32_t');
            },
            "se_extsb": function(instr, context, instructions) {
                if (instr.parsed.opd.length == 1) {
                    return Base.cast(instr.parsed.opd[0], instr.parsed.opd[0], 'int32_t');
                }
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int32_t');
            },
            "se_extzh": function(instr, context, instructions) {
                if (instr.parsed.opd.length == 1) {
                    return Base.cast(instr.parsed.opd[0], instr.parsed.opd[0], 'int32_t');
                }
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int32_t');
            },
            "se_extsh": function(instr, context, instructions) {
                if (instr.parsed.opd.length == 1) {
                    return Base.cast(instr.parsed.opd[0], instr.parsed.opd[0], 'int32_t');
                }
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], 'int32_t');
            },
            "se_mr": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            "se_mtar": function(instr, context, instructions) {
                return Base.call('_mtar', [instr.parsed.opd[0]]);
            },
            "se_mfar": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], Base.call('_mfar', []));
            },
            "se_add": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.add);
            },
            "se_mullw": function(instr, context, instructions) {},
            "se_sub": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.subtract);
            },
            "se_subf": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.subtract);
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
                return op_bits3(instr.parsed, Base.add);
            },
            "se_and": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.and);
            },
            "se_andi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.and);
            },
            "se_andc": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.and);
            },
            "se_b": function(instr, context, instructions) {
                return Base.nop();
            },
            "se_bl": function(instr, context, instructions) {
                var fcn_name = instr.parsed.opd[0].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.call(fcn_name);
            },
            "se_bge": function(instr, context, instructions) {
                return _conditional(instr, context, 'GE');
            },
            "se_ble": function(instr, context, instructions) {
                return _conditional(instr, context, 'LE');
            },
            "se_bne": function(instr, context, instructions) {
                return _conditional(instr, context, 'NE_');
            },
            "se_blt": function(instr, context, instructions) {
                return _conditional(instr, context, 'LT');
            },
            "se_bgt": function(instr, context, instructions) {
                return _conditional(instr, context, 'GT');
            },
            "se_beq": function(instr, context, instructions) {
                return _conditional(instr, context, 'EQ');
            },
            "se_or": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.or);
            },
            "se_li": function(instr, context, instructions) {
                return Base.assign(instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            "se_bmaski": function(instr, context, instructions) {
                return Base.bit_mask(instr.parsed.opd[0], instr.parsed.opd[0], instr.parsed.opd[1]);
            },
            /*
                        "se_bclri": function(instr, context, instructions) {},
                        "se_bgeni": function(instr, context, instructions) {},
            */
            "se_bseti": function(instr, context, instructions) {
                var bit = '(1 << ' + parseInt(instr.parsed.opd[1]) + ')';
                return Base.or(instr.parsed.opd[0], instr.parsed.opd[0], bit);
            },
            "se_btsti": function(instr, context, instructions) {
                var bit = '(1 << ' + parseInt(instr.parsed.opd[1]) + ')';
                context.cond.cr0.a = Variable.local(instr.parsed.opd[0]);
                context.cond.cr0.b = Variable.local(bit);
            },
            "se_lbz": function(instr, context, instructions) {
                return load_bits(instr, 8, false);
            },
            "se_lbh": function(instr, context, instructions) {
                return load_bits(instr, 16, false);
            },
            "se_lwz": function(instr, context, instructions) {
                return load_bits(instr, 32, false);
            },
            "se_slw": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.shift_left, 32);
            },
            "se_slwi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.shift_left, 32);
            },
            "se_sraw": function(instr, context, instructions) {
                return op_rotate3(instr.parsed, 32, true);
            },
            "se_srawi": function(instr, context, instructions) {
                return op_rotate3(instr.parsed, 32, true);
            },
            "se_srw": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.shift_right, 32);
            },
            "se_srwi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.shift_right, 32);
            },
            "se_stb": function(instr, context, instructions) {
                return store_bits(instr, 8, false);
            },
            "se_sth": function(instr, context, instructions) {
                return store_bits(instr, 16, false);
            },
            "se_stw": function(instr, context, instructions) {
                return store_bits(instr, 32, false);
            },
            "se_subi": function(instr, context, instructions) {
                return op_bits3(instr.parsed, Base.subtract);
            },
            nop: function() {
                return Base.nop();
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(asm) {
            asm = asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
            return {
                mnem: asm.shift().replace(/\./, ''),
                opd: asm
            };
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
                localvars: []
            };
        },
        postanalisys: function(instructions, context) {
            /* simplifies any load address 32/64 bit */
            for (var i = 0; i < instructions.length; i++) {
                i = _load_address_32_64(i, instructions);
            }
        },
        localvars: function(context) {
            return context.localvars;
        },
        globalvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return context.returns;
        }
    };
});