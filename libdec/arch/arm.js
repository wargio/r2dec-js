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

    var _operands = {
        'lsl': '<<',
        'lsr': '>>',
        'asl': '<<',
        'asr': '>>',
        'ror': '>>>',
        'rrx': '>>>'
    }

    var _is_register = function(name) {
        return name && name.match(/r[0-9]+/) != null;
    }

    var _common_math = function(e, op) {
        if (e[1] == 'ip' || e[1] == 'sp' || e[1] == 'fp') {
            return Base.instructions.nop();
        }
        if (e.length == 3) {
            return op(e[1], e[1], e[2]);
        } else if (e.length == 4) {
            return op(e[1], e[2], e[3]);
        }
        var p = e.slice(3);
        if (_operands[p[1]]) {
            p[1] = _operands[p[1]];
            if (p.length == 2) {
                p[2] = e[2];
            }
        }
        return op(e[1], e[2], '(' + p.join(' ') + ')');
    };

    var _load = function(instr, bits) {
        var e = instr.parsed;
        if (e[1] == 'lr') {
            return Base.instructions.nop();
        }
        if (!bits) {
            bits = 32
        }
        var cast = (bits == 8) ? ' = *((uint8_t*) ' : ' = *((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == 8) ? ');' : '))';

        switch (e.length) {
        case 3:
            if (_is_register(e[2])) {
                if (instr.string) {
                    return Base.instructions.assign(e[1], new Base.string(instr.string));
                }
                return Base.instructions.read_memory(e[1], e[2], bits, false);
            }
            return Base.instructions.assign(e[1], instr.string ? new Base.string(instr.string) : e[2]);
        case 4:
            return new Base.common(e[1] + cast + e[2] + ' + ' + e[3] + castend);
        case 5:
            if (e[3] != '-' && e[3] != '+') {
              return new Base.common(e[2] + ' += ' + e[3] + '; ' + e[1] + ' = ' + e[2] + '[0]');
            }
            if (e[2] == 'fp') {
                return Base.instructions.extend(e[1], e[4], bits);
            }
            return new Base.common(e[1] + cast + e[2] + ' ' + e[3] + ' ' + e[4] + castend);
        case 6:
            if (e[4].toLowerCase() == 'lsl') {
              return new Base.common(e[1] + ' = ' + e[2] + '[' + e[3] + ' << ' + e[5] + ']');
            }
            return new Base.common(e[1] + ' = ' + e[2] + '[' + e[3] + ' + ' + e[5] + ']');
            // return Base.instructions.nop();
            break;
        case 7:
            if (e[4].toLowerCase() == 'lsl') {
              return new Base.common(e[2] + ' += (' + e[3] + ' << ' + e[5] + '); ' + e[1] + ' = ' + e[2] + '[0]');
            }
            return new Base.common(e[1] + ' = ' + e[2] + '[' + e[3] + ' ' + e[5] + ' ' + e[6] + ']');
            break;
        }
        return instr.pseudo;
    };

    var _store = function(instr, bits) {
        var e = instr.parsed;
        if (e[1] == 'lr') {
            return null;
        }
        if (!bits) {
            bits = 32
        }
        var cast = (bits == 8) ? '*((uint8_t*) ' : '*((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == 8) ? ') = ' : ')) = ';
        if (e.length == 3) {
            if (instr.string) {
                return Base.instructions.assign(e[1], new Base.string(instr.string));
            }
            return Base.instructions.write_memory(e[2], e[1], bits, false);
        } else if (e.length == 4) {
            return new Base.common(cast + e[2] + ' + ' + e[3] + castend + e[1]);
        } else if (e.length == 5 && e[3] != '-' && e[3] != '+') {
            return new Base.common(e[2] + ' += ' + e[3] + '; ' + e[2] + '[0] = ' + e[1]);
        } else if (e.length == 5) {
            if (e[2] == 'fp') {
                return Base.instructions.extend(e[4], e[1], bits);
            }
            return new Base.common(cast + e[2] + ' ' + e[3] + ' ' + e[4] + castend + e[1]);
        } else if (e.length == 6 && e[4].toLowerCase() == 'lsl') {
            return new Base.common(e[2] + '[' + e[3] + ' << ' + e[5] + '] = ' + e[1]);
        } else if (e.length == 7 && e[4].toLowerCase() == 'lsl') {
            return new Base.common(e[2] + ' += (' + e[3] + ' << ' + e[5] + '); ' + e[2] + '[0] = ' + e[1]);
        }
        return instr.pseudo;
    };

    var _compare = function(instr, context) {
        context.cond.a = instr.parsed[1];
        context.cond.b = instr.parsed[2];
        return Base.instructions.nop();
    }

    var _conditional = function(instr, context, type) {
        return instr.conditional(context.cond.a, context.cond.b, type);
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _fix_arg = function(instr) {
        var t = instr.pseudo.toString();
        if (t.match(/^.+[+-|&^*/%]=\s/)) {
            instr.valid = false;
            return instr.string ? new Base.string(instr.string) : instr.parsed[1];
        }
        t = t.replace(/^.+\s=\s/, '').trim();
        instr.valid = false;
        return new Base.bits_argument(instr.string ? new Base.string(instr.string) : t);
    };

    var _call = function(instr, context, instructions) {
        instr.invalidate_jump();
        var callname = instr.parsed[1].replace(/\./g, '_');
        var returnval = null;
        var args = [];
        var regnum = 3;
        var known_args_n = Base.arguments(callname);
        if (known_args_n == 0) {
            return Base.instructions.call(callname, args, is_pointer || false, returnval);
        } else if (known_args_n > 0) {
            regnum = known_args_n - 1;
        }
        var arg0 = null;
        var start = instructions.indexOf(instr);
        for (var i = start - 1; i >= 0 && regnum >= 0; i--) {
            var op = instructions[i].parsed[0];
            arg0 = instructions[i].parsed[1];
            var reg = 'r' + regnum;
            if (op == 'pop' || op.indexOf('cb') == 0 || op.indexOf('b') == 0) {
                regnum--;
                i = start;
            } else if (arg0 == reg) {
                args.unshift(_fix_arg(instructions[i]));
                regnum--;
                i = start;
            }
        }
        if (instructions[start + 1]) {
            if (instructions[start + 1].parsed[0].charAt(0) == 'c' && instructions[start + 1].parsed[1] == 'r0') {
                // cbz/cmp
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[2] == 'r0') {
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[3] == 'r0') {
                returnval = 'r0';
            }
        }
        return Base.instructions.call(callname, args, _is_register(callname) || callname.indexOf('0x') == 0, returnval);
    };

    var _arm_conditional_execution = function(condition, p) {
        var f = function(instr, context, instructions) {
            _conditional_inline(instr, context, instructions, arguments.callee.condition);
            return arguments.callee.instruction(instr, context, instructions);
        };
        f.condition = condition;
        f.instruction = p;
        return f;
    }

    var _arm_conditional_bit = function(p) {
        var f = function(instr, context, instructions) {
            _compare(instr, context);
            return arguments.callee.instruction(instr, context, instructions);
        };
        f.instruction = p;
        return f;
    }

    var _conditional_instruction_list = [
        'add', 'and', 'eor', 'ldr', 'ldrb', 'ldm', 'lsl', 'lsr',
        'mov', 'mvn', 'mul', 'orr', 'pop', 'str', 'strb', 'sub', 'bx'
    ];

    var _arm = {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.instructions.add);
            },
            adr: function(instr) {
                var dst = instr.parsed[1];
                return Base.instructions.assign(dst, instr.parsed[2]);
            },
            adrp: function(instr) {
                var dst = instr.parsed[1];
                return Base.instructions.assign(dst, instr.parsed[2]);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.instructions.and);
            },
            b: function() {
                return Base.instructions.nop();
            },
            bx: function(instr, context, instructions) {
                if (instr.parsed[1] == 'lr') {
                    var start = instructions.indexOf(instr)
                    var returnval = null;
                    if (instructions[start - 1].parsed[1] == 'r0') {
                        returnval = 'r0';
                    }
                    return Base.instructions.return(returnval);
                }
                instr.invalidate_jump();
                return Base.instructions.call(instr.parsed[1], [], true, 'return');
            },
            'b.pl': function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            bpl: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            'b.ls': function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bls: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'b.ne': function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            bne: function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            'b.eq': function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            beq: function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            bgt: function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            bge: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            'b.lo': function(instr, context) {
                return _conditional(instr, context, 'LO');
            },
            eor: function(instr) {
                return _common_math(instr.parsed, Base.instructions.xor);
            },
            bl: _call,
            blx: _call,
            cmp: _compare,
            fcmp: _compare,
            cbz: function(instr, context, instructions) {
                context.cond.a = instr.parsed[1];
                context.cond.b = '0';
                return _conditional(instr, context, 'EQ');
            },
            cbnz: function(instr, context, instructions) {
                context.cond.a = instr.parsed[1];
                context.cond.b = '0';
                return _conditional(instr, context, 'NE');
            },
            ldr: function(instr) {
                return _load(instr, '32');
            },
            ldur: function(instr) {
                return _load(instr, '32');
            },
            ldrb: function(instr) {
                return _load(instr, '8');
            },
            ldm: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return Base.instructions.return();
                    }
                }
                instr.comments.push(instr.opcode);
                return Base.instructions.nop();
            },
            lsl: function(instr) {
                return _common_math(instr.parsed, Base.instructions.shift_left);
            },
            lsr: function(instr) {
                return _common_math(instr.parsed, Base.instructions.shift_right);
            },
            mov: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.instructions.nop();
                }
                return Base.instructions.assign(dst, instr.parsed[2]);
            },
            movt: function(instr) {
                var dst = instr.parsed[1];
                var src = parseInt(instr.parsed[2]);
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.instructions.nop();
                }
                if (instr.parsed[2] == 0) {
                    instr.parsed = ['nop'];
                    return Base.instructions.nop();
                }
                return Base.instructions.special(dst + ' = (' + dst + ' & 0xFFFF) | 0x' + src.toString(16) + '0000');
            },
            movw: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.instructions.nop();
                }
                if (instr.string) {
                    return Base.instructions.assign(dst, new Base.string(instr.string));
                }
                if (instr.parsed[2] == '0') {
                    instr.parsed = ['nop'];
                    return Base.instructions.nop();
                }
                return Base.instructions.special(dst + ' = (' + dst + ' & 0xFFFF0000) | (' + instr.parsed[2] + ' & 0xFFFF)');
            },
            movz: function(instr) {
                var dst = instr.parsed[1];
                return Base.instructions.assign(dst, instr.parsed[2]);
            },
            mvn: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.instructions.nop();
                }
                return Base.instructions.inverse(dst, instr.parsed[2]);
            },
            mul: function(instr) {
                return _common_math(instr.parsed, Base.instructions.multiply);
            },
            nop: function(instr) {
                return Base.instructions.nop();
            },
            orr: function(instr) {
                return _common_math(instr.parsed, Base.instructions.or);
            },
            pop: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return Base.instructions.return();
                    }
                }
                return null;
            },
            popeq: function(instr, context, instructions) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        _conditional_inline(instr, context, instructions, 'EQ');
                        return Base.instructions.return();
                    }
                }
                return null;
            },
            popne: function(instr, context, instructions) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        _conditional_inline(instr, context, instructions, 'NE');
                        return Base.instructions.return();
                    }
                }
                return null;
            },
            push: function() {},
            'push.w': function() {},
            ror: function(instr) {
                return Base.instructions.rotate_right(instr.parsed[1], instr.parsed[2], parseInt(instr.parsed[3], 16).toString(), 32);
            },
            rol: function(instr) {
                return Base.instructions.rotate_left(instr.parsed[1], instr.parsed[2], parseInt(instr.parsed[3], 16).toString(), 32);
            },
            ret: function(instr, context, instructions) {
                var start = instructions.indexOf(instr)
                var returnval = null;
                if (instructions[start - 1].parsed[1] == 'x0') {
                    returnval = 'x0';
                }
                return Base.instructions.return(returnval);
            },
            stp: function(instr) {
                var e = instr.parsed;
                return Base.instructions.write_memory(
                    e[3] + ' + ' + e[4],
                    e[1] + ', ' + e[2],
                    64, false);
            },
            ldp: function(instr) {
                var e = instr.parsed;
                var src = e[4] == '+'? e[5]: e[3] + ' + ' + e[4];
                return Base.instructions.read_memory(src,
                    e[1] + ', ' + e[2],
                    64, false);
            },
            str: function(instr) {
                return _store(instr, '32');
            },
            strb: function(instr) {
                return _store(instr, '8');
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.instructions.subtract);
            },
            rsb: function(instr) {
                var op = Base.instructions.subtract;
                var e = instr.parsed;
                if (e[1] == 'ip' || e[1] == 'sp' || e[1] == 'fp') {
                    return Base.instructions.nop();
                }
                if (e.length == 4) {
                    return op(e[1], e[3], e[2]);
                }
                if (_operands[e[4]]) {
                    e[4] = _operands[e[4]];
                }
                return op(e[1], '(' + e.slice(3).join(' ') + ')', e[2]);
            },
            ubfx: function(instr) {
                //UBFX dest, src, lsb, width
                var dest = instr.parsed[1];
                var src = instr.parsed[2];
                var lsb = instr.parsed[3];
                var width = instr.parsed[4];
                return Base.instructions.special(dest + ' = ' + '(' + src + ' >> ' + lsb + ') & ((1 << ' + width + ') - 1)');
            },
            uxtb: function(instr) {
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 8);
            },
            uxth: function(instr) {
                return Base.instructions.extend(instr.parsed[1], instr.parsed[2], 16);
            },
            invalid: function() {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var ret = asm.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            return ret.trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                },
                leave: false,
                vars: []
            }
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
    }, ];

    for (var i = 0; i < _conditional_instruction_list.length; i++) {
        var e = _conditional_instruction_list[i];
        var p = _arm.instructions[e];
        for (var j = 0; j < _conditional_list.length; j++) {
            var c = _conditional_list[j]
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
