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

    var Variable = require('libdec/core/variable');
    var Base = require('libdec/core/base');
    var Extra = require('libdec/core/extra');
    var Long = require('libdec/long');

    var _operands = {
        'lsl': '<<',
        'sxtw': '<<',
        'uxtw': '<<',
        'lsr': '>>',
        'asl': '<<',
        'asr': '>>',
        'ror': '>>>',
        'rrx': '>>>'
    };

    var _operands_base = {
        'lsl': Base.shift_left,
        'sxtw': Base.shift_left,
        'uxtw': Base.shift_left,
        'lsr': Base.shift_right,
        'asl': Base.shift_left,
        'asr': Base.shift_right,
        'ror': Base.rotate_right,
        'rrx': Base.rotate_right
    };

    var _reg_bits = {
        'b': 8,
        'h': 16,
        's': 32,
        'r': 32,
        'w': 32,
        'd': 64,
        'x': 64,
        'q': 128
    };

    var _common_math = function(e, op) {
        if (e.opd[0] == 'ip' || e.opd[0] == 'sp' || e.opd[0] == 'fp') {
            return Base.nop();
        }
        if (e.opd.length == 2) {
            return op(e.opd[0], e.opd[0], e.opd[1]);
        } else if (e.opd.length == 3) {
            return op(e.opd[0], e.opd[1], e.opd[2]);
        }
        var p = e.opd.slice(2);
        if (_operands[p[1]]) {
            p[1] = _operands[p[1]];
            if (p.length == 2) {
                p[2] = e.opd[1];
            }
        }
        return op(e.opd[0], e.opd[1], '(' + p.join(' ') + ')');
    };

    var _memory = function(op, instr, bits, signed) {
        signed = signed || false;
        var e = instr.parsed.opd;
        var mem, arg;
        if (e[0] == 'lr') {
            return null;
        }
        if (!bits) {
            bits = 32;
        }
        var last = e[e.length - 1];
        if (e.length == 2 && typeof e[1] == 'string') {
            return Base.assign(e[0], instr.string || e[1]);
        } else if (e.length == 2) {
            //str A, [B...] is *((u32*) B...) = A;
            mem = e[1].slice();
            if (mem.length < 3) {
                return op(mem.join(' + ').replace(/\+ -/, '- '), e[0], bits, false);
            }
            arg = Variable.uniqueName('offset');
            return Base.composed([
                _operands_base[mem[2]](arg, mem[1], mem[3], bits),
                op([mem[0], arg].join(' + ').replace(/\+ -/, '- '), e[0], bits, false),
            ]);
        } else if (e.length == 3 && last == "!") {
            mem = e[1].slice();
            if (mem.length < 3) {
                return op(mem.join(' += ').replace(/\+=\s-/, '-= '), e[0], bits, false);
            }
            arg = Variable.uniqueName('offset');
            return Base.composed([
                _operands_base[mem[2]](arg, mem[1], mem[3], bits),
                op([mem[0], arg].join(' += ').replace(/\+=\s-/, '-= '), e[0], bits, false),
            ]);
        }
        mem = e[1].slice();
        if (mem.length < 3) {
            return Base.composed([
                op(mem.join(' + ').replace(/\+ -/, '- '), e[0], bits, false),
                Base.add(mem[0], mem[0], last)
            ]);
        }
        arg = Variable.uniqueName('offset');
        return Base.composed([
            _operands_base[mem[2]](arg, mem[1], mem[3], bits),
            op([mem[0], arg].join(' + ').replace(/\+ -/, '- '), e[0], bits, false),
            Base.add(mem[0], mem[0], last)
        ]);
    };

    var _compare = function(instr, context) {
        if (instr.mnem == 'cmn') {
            context.cond.a = instr.parsed.opd[1];
            context.cond.b = instr.parsed.opd[0];
        } else {
            context.cond.a = instr.parsed.opd[0];
            context.cond.b = instr.parsed.opd[1];
        }
        return Base.nop();
    };

    var _conditional = function(instr, context, type) {
        return instr.conditional(context.cond.a, context.cond.b, type);
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        var next = instructions[instructions.indexOf(instr) + 1];
        if (next) {
            instr.jump = next.location;
        } else {
            instr.jump = instr.location.add(1);
        }
    };

    var _fix_arg = function(instr) {
        var t = instr.code.toString();
        if (t.match(/^.+[+-|&^*/%]=\s/)) {
            instr.valid = false;
            return instr.string ? Variable.string(instr.string) : instr.parsed.opd[0];
        }
        t = t.replace(/^.+\s=\s/, '').trim();
        instr.valid = false;
        return new Base.bits_argument(instr.string ? Variable.string(instr.string) : t);
    };

    var _call = function(instr, context, instructions) {
        instr.setBadJump();
        var callname = instr.parsed.opd[0].replace(/\./g, '_');
        var returnval = null;
        var args = [];
        var regnum = 3;
        var known_args_n = Extra.find.arguments_number(callname);
        if (known_args_n == 0) {
            return Base.call(callname, args);
        } else if (known_args_n > 0) {
            regnum = known_args_n - 1;
        }

        var arg0 = null;
        var start = instructions.indexOf(instr);
        for (var i = start - 1; i >= 0 && regnum >= 0; i--) {
            var op = instructions[i].parsed[0];
            if (!op) {
                break;
            }
            arg0 = instructions[i].parsed[1];
            var reg = 'r' + regnum;
            var reg32 = 'w' + regnum;
            var reg64 = 'x' + regnum;
            if (op == 'pop' || op.indexOf('cb') == 0 || op.indexOf('b') == 0) {
                regnum--;
                i = start;
            } else if (arg0 == reg || arg0 == reg32 || arg0 == reg64) {
                args.unshift(_fix_arg(instructions[i]));
                regnum--;
                i = start;
            }
        }
        if (instructions[start + 1]) {
            if (instructions[start + 1].parsed[0] &&
                instructions[start + 1].parsed[0].charAt(0) == 'c' &&
                instructions[start + 1].parsed[1] == 'r0') {
                // cbz/cmp
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[2] == 'r0') {
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[3] == 'r0') {
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[0] &&
                instructions[start + 1].parsed[0].charAt(0) == 'c' &&
                instructions[start + 1].parsed[1] == 'w0') {
                // cbz/cmp
                returnval = 'w0';
            } else if (instructions[start + 1].parsed[2] == 'w0') {
                returnval = 'w0';
            } else if (instructions[start + 1].parsed[3] == 'w0') {
                returnval = 'w0';
            } else if (instructions[start + 1].parsed[0] &&
                instructions[start + 1].parsed[0].charAt(0) == 'c' &&
                instructions[start + 1].parsed[1] == 'x0') {
                // cbz/cmp
                returnval = 'x0';
            } else if (instructions[start + 1].parsed[2] == 'x0') {
                returnval = 'x0';
            } else if (instructions[start + 1].parsed[3] == 'x0') {
                returnval = 'x0';
            }
        }

        if (callname.match(/^[rwx]\d+$/)) {
            callname = Variable.functionPointer(callname, _reg_bits[callname[0]] || 0, args);
        }

        if (returnval) {
            return Base.assign(Base.call(callname, args));
        }
        return Base.call(callname, args);
    };

    var _arm_conditional_execution = function(condition, p) {
        var f = function(instr, context, instructions) {
            _conditional_inline(instr, context, instructions, arguments.callee.condition);
            return arguments.callee.instruction(instr, context, instructions);
        };
        f.condition = condition;
        f.instruction = p;
        return f;
    };

    var _arm_conditional_bit = function(p) {
        var f = function(instr, context, instructions) {
            _compare(instr, context);
            return arguments.callee.instruction(instr, context, instructions);
        };
        f.instruction = p;
        return f;
    };

    var _conditional_instruction_list = [
        'add', 'and', 'eor', 'ldr', 'ldrb', 'ldm', 'lsl', 'lsr',
        'mov', 'mvn', 'mul', 'orr', 'pop', 'str', 'strb', 'sub', 'bx'
    ];

    var _arm = {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.add);
            },
            adr: function(instr) {
                var dst = instr.parsed.opd[0];
                return Base.assign(dst, instr.parsed.opd[1]);
            },
            adrp: function(instr) {
                var dst = instr.parsed.opd[0];
                return Base.assign(dst, instr.parsed.opd[1]);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.and);
            },
            b: function() {
                return Base.nop();
            },
            br: function(instr, context, instructions) {
                var callname = instr.parsed.opd[0];
                instr.setBadJump();
                callname = Variable.functionPointer(callname, _reg_bits[callname[0]] || 0, []);
                if (instructions[instructions.length - 1] == instr) {
                    return Base.return(Base.call(callname, []));
                }
                return Base.call(callname, []);
            },
            bx: function(instr, context, instructions) {
                var callname = instr.parsed.opd[0];
                if (callname == 'lr') {
                    var start = instructions.indexOf(instr);
                    var returnval = null;
                    if (instructions[start - 1].parsed[1] == 'r0') {
                        returnval = 'r0';
                    }
                    return Base.return(returnval);
                }
                instr.setBadJump();
                callname = Variable.functionPointer(callname, _reg_bits[callname[0]] || 0, []);
                return Base.return(Base.call(callname, []));
            },
            bpl: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            bls: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            bne: function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            beq: function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            bgt: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bhi: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bhs: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            bge: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            'b.pl': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'b.ls': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'b.lt': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'b.ne': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            'b.eq': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'b.lo': function(instr, context) {
                return _conditional(instr, context, 'LO');
            },
            'b.hi': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'b.hs': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'b.ge': function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            'b.gt': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            eon: function(instr) {
                return Base.composed([
                    _common_math(instr.parsed, Base.xor),
                    Base.not(instr.parsed.opd[0], instr.parsed.opd[0])
                ]);
            },
            eor: function(instr) {
                return _common_math(instr.parsed, Base.xor);
            },
            bl: _call,
            blx: _call,
            cmp: _compare,
            cmn: _compare,
            fcmp: _compare,
            cbz: function(instr, context, instructions) {
                context.cond.a = instr.parsed.opd[0];
                context.cond.b = '0';
                return _conditional(instr, context, 'EQ');
            },
            cbnz: function(instr, context, instructions) {
                context.cond.a = instr.parsed.opd[0];
                context.cond.b = '0';
                return _conditional(instr, context, 'NE');
            },
            ldr: function(instr) {
                return _memory(Base.read_memory, instr, '32');
            },
            ldur: function(instr) {
                return _memory(Base.read_memory, instr, '32');
            },
            ldrh: function(instr) {
                return _memory(Base.read_memory, instr, '16');
            },
            ldrb: function(instr) {
                return _memory(Base.read_memory, instr, '8');
            },
            ldrsr: function(instr) {
                return _memory(Base.read_memory, instr, '32', true);
            },
            ldrsh: function(instr) {
                return _memory(Base.read_memory, instr, '16', true);
            },
            ldrsb: function(instr) {
                return _memory(Base.read_memory, instr, '8', true);
            },
            ldm: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return Base.return();
                    }
                }
                instr.comments.push(instr.opcode);
                return Base.nop();
            },
            lsl: function(instr) {
                return _common_math(instr.parsed, Base.shift_left);
            },
            lsr: function(instr) {
                return _common_math(instr.parsed, Base.shift_right);
            },
            mov: function(instr) {
                var dst = instr.parsed.opd[0];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.assign(dst, instr.parsed.opd[1]);
            },
            movt: function(instr) {
                var dst = instr.parsed.opd[0];
                var src = parseInt(instr.parsed.opd[1]);
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                if (instr.parsed.opd[1] == 0) {
                    instr.parsed = ['nop'];
                    return Base.nop();
                }
                return Base.special(dst + ' = (' + dst + ' & 0xFFFF) | 0x' + src.toString(16) + '0000');
            },
            movw: function(instr) {
                var dst = instr.parsed.opd[0];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                if (instr.string) {
                    return Base.assign(dst, Variable.string(instr.string));
                }
                if (instr.parsed.opd[1] == '0') {
                    instr.parsed = ['nop'];
                    return Base.nop();
                }
                return Base.special(dst + ' = (' + dst + ' & 0xFFFF0000) | (' + instr.parsed.opd[1] + ' & 0xFFFF)');
            },
            movz: function(instr) {
                var dst = instr.parsed.opd[0];
                return Base.assign(dst, instr.parsed.opd[1]);
            },
            mvn: function(instr) {
                var dst = instr.parsed.opd[0];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.not(dst, instr.parsed.opd[1]);
            },
            mul: function(instr) {
                return _common_math(instr.parsed, Base.multiply);
            },
            nop: function(instr) {
                return Base.nop();
            },
            orr: function(instr) {
                return _common_math(instr.parsed, Base.or);
            },
            pop: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return Base.return();
                    }
                }
                return null;
            },
            popeq: function(instr, context, instructions) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        _conditional_inline(instr, context, instructions, 'EQ');
                        return Base.return();
                    }
                }
                return null;
            },
            popne: function(instr, context, instructions) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        _conditional_inline(instr, context, instructions, 'NE');
                        return Base.return();
                    }
                }
                return null;
            },
            push: function() {},
            'push.w': function() {},
            ror: function(instr) {
                return Base.rotate_right(instr.parsed.opd[0], instr.parsed.opd[1], parseInt(instr.parsed.opd[2], 16).toString(), 32);
            },
            rol: function(instr) {
                return Base.rotate_left(instr.parsed.opd[0], instr.parsed.opd[1], parseInt(instr.parsed.opd[2], 16).toString(), 32);
            },
            ret: function(instr, context, instructions) {
                var start = instructions.indexOf(instr);
                var returnval = null;
                if (instructions[start - 1].parsed[1] == 'x0') {
                    returnval = 'x0';
                }
                return Base.return(returnval);
            },
            stp: function(instr) {
                var e = instr.parsed.opd;
                var bits = _reg_bits[e[0][0]] || 64;
                return Base.composed([
                    Base.write_memory(e[2].join(' + '), e[0], bits, false),
                    Base.write_memory(e[2].concat([(bits / 8)]).join(' + '), e[1], bits, false)
                ]);
            },
            ldp: function(instr) {
                var e = instr.parsed.opd;
                var bits = _reg_bits[e[0][0]] || 64;
                return Base.composed([
                    Base.read_memory(e[2].join(' + '), e[0], bits, false),
                    Base.read_memory(e[2].concat([(bits / 8)]).join(' + '), e[1], bits, false)
                ]);
            },
            str: function(instr) {
                return _memory(Base.write_memory, instr, 32);
            },
            strb: function(instr) {
                return _memory(Base.write_memory, instr, 8);
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            rsb: function(instr) {
                var op = Base.subtract;
                var e = instr.parsed;
                if (e.opd[0] == 'ip' || e.opd[0] == 'sp' || e.opd[0] == 'fp') {
                    return Base.nop();
                }
                if (e.opd.length == 3) {
                    return op(e.opd[0], e.opd[2], e.opd[1]);
                }
                if (_operands[e.opd[3]]) {
                    e.opd[3] = _operands[e.opd[3]];
                }
                return op(e.opd[0], '(' + e.slice(3).join(' ') + ')', e.opd[1]);
            },
            ubfx: function(instr) {
                //UBFX dest, src, lsb, width
                var dest = instr.parsed.opd[0];
                var src = instr.parsed.opd[1];
                var lsb = instr.parsed.opd[2];
                var width = instr.parsed.opd[3];
                return Base.special(dest + ' = ' + '(' + src + ' >> ' + lsb + ') & ((1 << ' + width + ') - 1)');
            },
            uxtb: function(instr) {
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], Extra.to.type(8, true));
            },
            uxth: function(instr) {
                return Base.cast(instr.parsed.opd[0], instr.parsed.opd[1], Extra.to.type(16, true));
            },
            /* ARM64 */
            blr: _call,
            bic: function(instr, context, instructions) {
                return Base.bit_mask(instr.parsed.opd[0], instr.parsed.opd[1], instr.parsed.opd[2]);
            },
            bfc: function(instr, context, instructions) {
                var arg0 = Variable.uniqueName();
                return Base.composed([
                    Base.bit_mask(arg0, instr.parsed.opd[2], instr.parsed.opd[3]),
                    Base.not(arg0, arg0),
                    Base.and(instr.parsed.opd[0], instr.parsed.opd[0], arg0),
                ]);
            },
            bfi: function(instr, context, instructions) {
                /*
                    BFI R9, R2, #8, #12; 
                    Replace bit 8 to bit 19 (12 bits) of R9 with bit 0 to bit 11 from R2.
                */
                var arg0 = Variable.uniqueName();
                var arg1 = Variable.uniqueName();
                return Base.composed([
                    Base.bit_mask(arg0, instr.parsed.opd[2], instr.parsed.opd[3]),
                    Base.and(arg1, instr.parsed.opd[1], arg0),
                    Base.not(arg0, arg0),
                    Base.and(instr.parsed.opd[0], instr.parsed.opd[0], arg0),
                    Base.or(instr.parsed.opd[0], instr.parsed.opd[0], arg1),
                ]);
            },
            bfxil: function(instr, context, instructions) {
                var opds = instr.parsed.opd;
                var lsb = parseInt(opds[2]);
                var width = parseInt(opds[3]);
                var bits = _reg_bits[opds[0][0]] || 32;
                var mask_A = Long.MAX_UNSIGNED_VALUE.shl(lsb + width);
                var mask_B = mask_A.not();

                if (bits < 64) {
                    mask_A = mask_A.and(0xffffffff);
                    mask_B = mask_B.and(0xffffffff);
                }
                var sp = opds[0] + ' = (uint' + bits + '_t) (' + opds[0] + ' & 0x' + mask_A.toString(16);
                sp += ') | (' + opds[1] + ' & 0x' + mask_B.toString(16) + ')';
                return Base.special(sp);
            },
            csel: function(instr, context) {
                var opds = instr.parsed.opd;
                var cond = 'EQ';
                for (var i = 0; i < _conditional_list.length; i++) {
                    if (_conditional_list[i].ext == opds[3]) {
                        cond = _conditional_list[i].type;
                        break;
                    }
                }
                return Base.conditional_assign(opds[0], context.cond.a, context.cond.b, cond, opds[1], opds[2]);
            },
            cset: function(instr, context) {
                var opds = instr.parsed.opd;
                var cond = 'EQ';
                for (var i = 0; i < _conditional_list.length; i++) {
                    if (_conditional_list[i].ext == opds[1]) {
                        cond = _conditional_list[i].type;
                        break;
                    }
                }
                return Base.conditional_assign(opds[0], context.cond.a, context.cond.b, cond, 1, 0);
            },
            csinc: function(instr, context) {
                var opds = instr.parsed.opd;
                var cond = 'EQ';
                for (var i = 0; i < _conditional_list.length; i++) {
                    if (_conditional_list[i].ext == opds[3]) {
                        cond = _conditional_list[i].type;
                        break;
                    }
                }
                return Base.conditional_assign(opds[0], context.cond.a, context.cond.b, cond, opds[1], opds[2] + " + 1");
            },
            orn: function(instr) {
                var opds = instr.parsed.opd;
                var ops = [];
                ops.push(Base.or(opds[0], opds[1], opds[2]));
                ops.push(Base.not(opds[0], opds[0]));
                return Base.composed(ops);
            },
            neg: function(instr) {
                var dst = instr.parsed.opd[0];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.negate(dst, instr.parsed.opd[1]);
            },
            movi: function(instr) {
                var opds = instr.parsed.opd;
                var val = Long.fromString(opds[1], true, opds[1].indexOf('0x') == 0 ? 16 : 10);
                return Base.assign(opds[0], '0x' + val.toString(16));
            },
            movn: function(instr) {
                var opds = instr.parsed.opd;
                var val = Long.fromString(opds[1], true, opds[1].indexOf('0x') == 0 ? 16 : 10);
                if (instr.parsed.opd.length == 2) {
                    return Base.assign(opds[0], '0x' + val.toString(16));
                }
                val = val.shl(parseInt(opds[3]));
                return Base.assign(opds[0], '0x' + val.toString(16));
            },
            movk: function(instr) {
                var opds = instr.parsed.opd;
                var ops = [];
                var val = Long.fromString(opds[1], true, opds[1].indexOf('0x') == 0 ? 16 : 10);
                var mask = Long.fromValue(0xffff, true);


                if (instr.parsed.opd.length != 2) {
                    var shift = parseInt(opds[3]);
                    mask = mask.shl(shift);
                    val = val.shl(shift);
                }
                mask = mask.not();

                if (opds[0][0] == 'w') {
                    mask = mask.and(0xffffffff);
                }

                ops.push(Base.and(opds[0], opds[0], '0x' + mask.toString(16)));
                if (parseInt(opds[1]) == 0) {
                    return ops[0];
                }
                ops.push(Base.or(opds[0], opds[0], '0x' + val.toString(16)));
                return Base.composed(ops);
            },
            ldrw: function(instr) {
                return _memory(Base.read_memory, instr, '64', true);
            },
            ldrsw: function(instr) {
                return _memory(Base.read_memory, instr, '64', true);
            },
            rev: function(instr) {
                return Base.swap_endian(instr.parsed.opd[0], instr.parsed.opd[1], _reg_bits[instr.parsed.opd[0][0]]);
            },
            tst: function(instr, context) {
                var a = instr.parsed.opd[0];
                var b = instr.parsed.opd[1];
                context.cond.a = (a === b) ? a : '(' + a + ' & ' + b + ')';
                context.cond.b = '0';
            },
            tbnz: function(instr, context) {
                var a = instr.parsed.opd[0];
                var b = instr.parsed.opd[1];
                context.cond.a = (a === b) ? a : '(' + a + ' & ' + b + ')';
                context.cond.b = '0';
                return _conditional(instr, context, 'NE');
            },
            sxtw: function(instr) {
                var a = instr.parsed.opd[0];
                var b = instr.parsed.opd[1];
                return Base.cast(a, b, Extra.to.type(_reg_bits[a[0]], true));
            },
            ubfiz: function(instr) {
                var opds = instr.parsed.opd;
                var arg = Variable.uniqueName();
                var shift = parseInt(opds[2]);
                var width = parseInt(opds[3]);
                var bits = _reg_bits[opds[0][0]] || 32;
                var rc = bits - width;
                var lc = rc - shift;
                return Base.composed([
                    Base.shift_right(arg, opds[1], '0x' + lc.toString(16)),
                    Base.shift_left(opds[0], arg, '0x' + lc.toString(16))
                ]);
            },
            sbfiz: function(instr) {
                var opds = instr.parsed.opd;
                var arg = Variable.uniqueName();
                var shift = parseInt(opds[2]);
                var width = parseInt(opds[3]);
                var bits = _reg_bits[opds[0][0]] || 32;
                var rc = bits - width;
                var lc = rc - shift;
                return Base.composed([
                    Base.shift_right(arg, opds[1], '0x' + lc.toString(16)),
                    Base.shift_left(opds[0], arg, '0x' + lc.toString(16)),
                    Base.cast(opds[0], opds[0], Extra.to.type(bits, true)),
                ]);
            },
            /* SIMD/FP */
            stur: function(instr) {
                return _memory(Base.write_memory, instr, _reg_bits[instr.parsed.opd[0][0]]);
            },
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(asm) {
            var ret = asm.replace(/(\[|\])/g, ' $1 ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/#/g, ' ');
            ret = ret.replace(/\s+/g, ' ');
            //constant zero regs wz[rw]/xz[rw]
            //ret = ret.replace(/\bwzr\b|\bwzw\b|\bxzw|\bxzr\b/g, "0");
            ret = ret.replace(/-\s/g, "-").trim().split(' ');
            var ops = [ret[0]];
            for (var i = 1, mem = false, mops = []; i < ret.length; i++) {
                if (mem && ret[i] == "+") {
                    continue;
                } else if (ret[i] == "[") {
                    mem = true;
                } else if (ret[i] == "]") {
                    mem = false;
                    ops.push(mops);
                    mops = [];
                } else if (mem) {
                    if (ret[i].match(/^[su]xtw$/) && ret[i] == ']') {
                        continue;
                    }
                    mops.push(ret[i]);
                } else {
                    ops.push(ret[i]);
                }
            }
            return {
                mnem: ops.shift(),
                opd: ops
            };
        },
        context: function() {
            return {
                cond: {
                    a: '?',
                    b: '?'
                },
                leave: false,
                vars: []
            };
        },
        globalvars: function(context) {
            return [];
        },
        localvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return 'void';
        }
    };

    var _conditional_list = [{
        type: 'LT',
        ext: 'lt'
    }, {
        type: 'LT',
        ext: 'mi'
    }, {
        type: 'LT',
        ext: 'cc'
    }, {
        type: 'LT',
        ext: 'lo'
    }, {
        type: 'LE',
        ext: 'ls'
    }, {
        type: 'LE',
        ext: 'le'
    }, {
        type: 'GT',
        ext: 'gt'
    }, {
        type: 'GT',
        ext: 'hi'
    }, {
        type: 'GE',
        ext: 'ge'
    }, {
        type: 'GE',
        ext: 'hs'
    }, {
        type: 'GE',
        ext: 'cs'
    }, {
        type: 'GE',
        ext: 'pl'
    }, {
        type: 'EQ',
        ext: 'eq'
    }, {
        type: 'NE',
        ext: 'ne'
    }, {
        type: 'LO',
        ext: 'lo'
    }];

    for (var i = 0; i < _conditional_instruction_list.length; i++) {
        var e = _conditional_instruction_list[i];
        var p = _arm.instructions[e];
        for (var j = 0; j < _conditional_list.length; j++) {
            var c = _conditional_list[j];
            if (!_arm.instructions[e + c.ext]) {
                _arm.instructions[e + c.ext] = _arm_conditional_execution(c.type, p);
            }
        }
        if (!_arm.instructions[e + 's']) {
            _arm.instructions[e + 's'] = _arm_conditional_bit(p);
        }
        if (!_arm.instructions[e + '.w']) {
            _arm.instructions[e + '.w'] = p;
        }
    }
    return _arm;
})();