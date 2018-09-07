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

    var _operands = {
        'lsl': '<<',
        'lsr': '>>',
        'asl': '<<',
        'asr': '>>',
        'ror': '>>>',
        'rrx': '>>>'
    };

    var _is_register = function(name) {
        return name && name.match(/r[0-9]+/) != null;
    };

    var _common_math = function(e, op) {
        if (e.mnem == 'ip' || e.mnem == 'sp' || e.mnem == 'fp') {
            return Base.nop();
        }
        if (e.opd.length == 2) {
            return op(e.mnem, e.mnem, e.opd[1]);
        } else if (e.opd.length == 3) {
            return op(e.mnem, e.opd[1], e.opd[2]);
        }
        var p = e.opd.slice(2);
        if (_operands[p[1]]) {
            p[1] = _operands[p[1]];
            if (p.length == 2) {
                p[2] = e.opd[1];
            }
        }
        return op(e.mnem, e.opd[1], '(' + p.join(' ') + ')');
    };

    var _load = function(instr, bits) {
        var e = instr.parsed;
        if (e.mnem == 'lr') {
            return Base.nop();
        }
        if (!bits) {
            bits = 32;
        }
        var cast = (bits == 8) ? ' = *((uint8_t*) ' : ' = *((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == 8) ? ');' : '))';

        switch (e.opd.length) {
            case 2:
                if (_is_register(e.opd[1])) {
                    if (instr.string) {
                        return Base.assign(e.mnem, Variable.string(instr.string));
                    }
                    return Base.read_memory(e.mnem, e.opd[1], bits, false);
                }
                return Base.assign(e.mnem, instr.string ? Variable.string(instr.string) : e.opd[1]);
            case 3:
                return Base.special(e.mnem + cast + e.opd[1] + ' + ' + e.opd[2] + castend);
            case 4:
                if (e.opd[2] != '-' && e.opd[2] != '+') {
                    return Base.special(e.opd[1] + ' += ' + e.opd[2] + '; ' + e.mnem + ' = ' + e.opd[1] + '[0]');
                }
                if (e.opd[1] == 'fp') {
                    return Base.cast(e.mnem, e.opd[3], Extra.to.type(bits, true));
                }
                return Base.special(e.mnem + cast + e.opd[1] + ' ' + e.opd[2] + ' ' + e.opd[3] + castend);
            case 5:
                if (e.opd[3].toLowerCase() == 'lsl') {
                    return Base.special(e.mnem + ' = ' + e.opd[1] + '[' + e.opd[2] + ' << ' + e.opd[4] + ']');
                }
                return Base.special(e.mnem + ' = ' + e.opd[1] + '[' + e.opd[2] + ' + ' + e.opd[4] + ']');
            case 6:
                if (e.opd[3].toLowerCase() == 'lsl') {
                    return Base.special(e.opd[1] + ' += (' + e.opd[2] + ' << ' + e.opd[4] + '); ' + e.mnem + ' = ' + e.opd[1] + '[0]');
                }
                return Base.special(e.mnem + ' = ' + e.opd[1] + '[' + e.opd[2] + ' ' + e.opd[4] + ' ' + e.opd[5] + ']');
            default:
                break;
        }
        return instr.code;
    };

    var _store = function(instr, bits) {
        var e = instr.parsed;
        if (e.mnem == 'lr') {
            return null;
        }
        if (!bits) {
            bits = 32;
        }
        var cast = (bits == 8) ? '*((uint8_t*) ' : '*((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == 8) ? ') = ' : ')) = ';
        if (e.opd.length == 2) {
            if (instr.string) {
                return Base.assign(e.mnem, Variable.string(instr.string));
            }
            return Base.write_memory(e.opd[1], e.mnem, bits, false);
        } else if (e.opd.length == 3) {
            return Base.special(cast + e.opd[1] + ' + ' + e.opd[2] + castend + e.mnem);
        } else if (e.opd.length == 4 && e.opd[2] != '-' && e.opd[2] != '+') {
            return Base.special(e.opd[1] + ' += ' + e.opd[2] + '; ' + e.opd[1] + '[0] = ' + e.mnem);
        } else if (e.opd.length == 4) {
            if (e.opd[1] == 'fp') {
                return Base.cast(e.opd[3], e.mnem, Extra.to.type(bits, true));
            }
            return Base.special(cast + e.opd[1] + ' ' + e.opd[2] + ' ' + e.opd[3] + castend + e.mnem);
        } else if (e.opd.length == 5 && e.opd[3].toLowerCase() == 'lsl') {
            return Base.special(e.opd[1] + '[' + e.opd[2] + ' << ' + e.opd[4] + '] = ' + e.mnem);
        } else if (e.opd.length == 6 && e.opd[3].toLowerCase() == 'lsl') {
            return Base.special(e.opd[1] + ' += (' + e.opd[2] + ' << ' + e.opd[4] + '); ' + e.opd[1] + '[0] = ' + e.mnem);
        }
        return instr.code;
    };

    var _compare = function(instr, context) {
        context.cond.a = instr.parsed.opd[0];
        context.cond.b = instr.parsed.opd[1];
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
            if (instructions[start + 1].parsed[0] &&
                instructions[start + 1].parsed[0].charAt(0) == 'c' &&
                instructions[start + 1].parsed[1] == 'r0') {
                // cbz/cmp
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[2] == 'r0') {
                returnval = 'r0';
            } else if (instructions[start + 1].parsed[3] == 'r0') {
                returnval = 'r0';
            }
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
            bx: function(instr, context, instructions) {
                if (instr.parsed.opd[0] == 'lr') {
                    var start = instructions.indexOf(instr);
                    var returnval = null;
                    if (instructions[start - 1].parsed[1] == 'r0') {
                        returnval = 'r0';
                    }
                    return Base.return(returnval);
                }
                instr.setBadJump();
                return Base.return(Base.call(instr.parsed.opd[0], []));
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
                return _common_math(instr.parsed, Base.xor);
            },
            bl: _call,
            blx: _call,
            cmp: _compare,
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
                return Base.inverse(dst, instr.parsed.opd[1]);
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
                var e = instr.parsed;
                return Base.write_memory(
                    e.opd[2] + ' + ' + e.opd[3],
                    e.mnem + ', ' + e.opd[1],
                    64, false);
            },
            ldp: function(instr) {
                var e = instr.parsed;
                var src = e.opd[3] == '+' ? e.opd[4] : e.opd[2] + ' + ' + e.opd[3];
                return Base.read_memory(src,
                    e.mnem + ', ' + e.opd[1],
                    64, false);
            },
            str: function(instr) {
                return _store(instr, '32');
            },
            strb: function(instr) {
                return _store(instr, '8');
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            rsb: function(instr) {
                var op = Base.subtract;
                var e = instr.parsed;
                if (e.mnem == 'ip' || e.mnem == 'sp' || e.mnem == 'fp') {
                    return Base.nop();
                }
                if (e.opd.length == 3) {
                    return op(e.mnem, e.opd[2], e.opd[1]);
                }
                if (_operands[e.opd[3]]) {
                    e.opd[3] = _operands[e.opd[3]];
                }
                return op(e.mnem, '(' + e.slice(3).join(' ') + ')', e.opd[1]);
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
            invalid: function() {
                return Base.nop();
            }
        },
        parse: function(asm) {
            var ret = asm.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            ret = ret.trim().split(' ');

            return {
                mnem: ret.shift(),
                opd: ret
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
    }, ];

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