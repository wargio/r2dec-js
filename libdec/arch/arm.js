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

    var Base = require('./base');

    var _is_register = function(name) {
        return name && name.match(/r[0-9]+/) != null;
    }

    var _common_math = function(e, op) {
        if (e[1] == 'ip' || e[1] == 'sp' || e[1] == 'fp') {
            return Base.nop();
        }
        if (e.length == 3) {
            return op(e[1], e[1], e[2]);
        }
        return op(e[1], e[2], e[3]);
    };

    var _load = function(instr, bits) {
        var e = instr.parsed;
        if (e[1] == 'lr') {
            return Base.nop();
        }
        if (!bits) {
            bits = '32'
        }
        var cast = (bits == '8') ? ' = *((uint8_t*) ' : ' = *((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == '8') ? ');' : '))';
        if (e.length == 3) {
            if (_is_register(e[2])) {
                return e[1] + ' = ' + (instr.string ? instr.string : '*((uint' + bits + '_t*) ' + e[2] + ')');
            }
            return e[1] + ' = ' + (instr.string ? instr.string : e[2]);
        } else if (e.length == 4) {
            return e[1] + cast + e[2] + ' + ' + e[3] + castend;
        } else if (e.length == 5 && e[3] != '-' && e[3] != '+') {
            return e[2] + ' += ' + e[3] + '; ' + e[1] + ' = ' + e[2] + '[0]';
        } else if (e.length == 5) {
            if (e[2] == 'fp') {
                return e[1] + ' = (uint' + bits + '_t) ' + e[4];
            }
            return e[1] + cast + e[2] + ' ' + e[3] + ' ' + e[4] + castend;
        } else if (e.length == 6 && e[4].toLowerCase() == 'lsl') {
            return e[1] + ' = ' + e[2] + '[' + e[3] + ' << ' + e[5] + ']';
        } else if (e.length == 7 && e[4].toLowerCase() == 'lsl') {
            return e[2] + ' += (' + e[3] + ' << ' + e[5] + '); ' + e[1] + ' = ' + e[2] + '[0]';
        }
        return instr.pseudo;
    };

    var _store = function(instr, bits) {
        var e = instr.parsed;
        if (e[1] == 'lr') {
            return null;
        }
        if (!bits) {
            bits = '32'
        }
        var cast = (bits == '8') ? '*((uint8_t*) ' : '*((uint' + bits + '_t*)((uint8_t*) ';
        var castend = (bits == '8') ? ') = ' : ')) = ';
        if (e.length == 3) {
            return e[1] + ' = ' + (instr.string ? instr.string : e[2]);
        } else if (e.length == 4) {
            return cast + e[2] + ' + ' + e[3] + castend + e[1];
        } else if (e.length == 5 && e[3] != '-' && e[3] != '+') {
            return e[2] + ' += ' + e[3] + '; ' + e[2] + '[0] = ' + e[1];
        } else if (e.length == 5) {
            if (e[2] == 'fp') {
                return e[4] + ' = (uint' + bits + '_t) ' + e[1];
            }
            return cast + e[2] + ' ' + e[3] + ' ' + e[4] + castend + e[1];
        } else if (e.length == 6 && e[4].toLowerCase() == 'lsl') {
            return e[2] + '[' + e[3] + ' << ' + e[5] + '] = ' + e[1];
        } else if (e.length == 7 && e[4].toLowerCase() == 'lsl') {
            return e[2] + ' += (' + e[3] + ' << ' + e[5] + '); ' + e[2] + '[0] = ' + e[1];
        }
        return instr.pseudo;
    };

    var _compare = function(instr, context) {
        context.cond.a = instr.parsed[1];
        context.cond.b = instr.parsed[2];
        return Base.nop();
    }

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    var _fix_arg = function(instr) {
        var t = instr.pseudo.toString();
        if (t.match(/^.+[+-|&^*/%]=\s/)) {
            instr.valid = false;
            return instr.string ? nstr.string : instr.parsed[1];
        }
        t = t.replace(/^.+\s=\s/, '').trim();
        instr.valid = false;
        return new Base.call_argument(instr.string ? instr.string : t);
    };

    var _call = function(instr, context, instructions) {
        var callname = instr.parsed[1].replace(/\./g, '_');
        var returnval = null;
        var args = [];
        var regnum = 3;
        var known_args_n = Base.arguments(callname);
        if (known_args_n == 0) {
            return Base.call(callname, args, is_pointer || false, returnval);
        } else if (known_args_n > 0) {
            regnum = known_args_n - 1;
        }
        var arg0 = null;
        var start = instructions.indexOf(instr)
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
        if (instructions[start + 1].parsed[0].charAt(0) == 'c' && instructions[start + 1].parsed[1] == 'r0') {
            // cbz/cmp
            returnval = 'r0';
        } else if (instructions[start + 1].parsed[2] == 'r0') {
            returnval = 'r0';
        } else if (instructions[start + 1].parsed[3] == 'r0') {
            returnval = 'r0';
        }
        return Base.call(callname, args, _is_register(callname), returnval);
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
        'mov', 'mvn', 'mul', 'orr', 'pop', 'str', 'strb', 'sub'
    ];

    var _arm = {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.add);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.and);
            },
            b: function() {
                return Base.nop();
            },
            bx: function(instr) {
                return Base.call(instr.parsed[1], [], true, 'return');
            },
            bne: function(instr, context) {
                return _conditional(instr, context, 'EQ');
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
            eor: function(instr) {
                return _common_math(instr.parsed, Base.xor);
            },
            bl: _call,
            blx: _call,
            cmp: _compare,
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
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.assign(dst, instr.parsed[2]);
            },
            movt: function(instr) {
                var dst = instr.parsed[1];
                var src = parseInt(instr.parsed[2]);
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                if (instr.parsed[2] == 0) {
                    instr.parsed = ['nop'];
                    return Base.nop();
                }
                return Base.special(dst + ' = (' + dst + ' & 0xFFFF) | 0x' + src.toString(16) + '0000');
            },
            movw: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                if (instr.string) {
                    return Base.assign(dst, instr.string);
                }
                if (instr.parsed[2] == '0') {
                    instr.parsed = ['nop'];
                    return Base.nop();
                }
                return Base.special(dst + ' = (' + dst + ' & 0xFFFF0000) | (' + instr.parsed[2] + ' & 0xFFFF)');
            },
            mvn: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.inverse(dst, instr.parsed[2]);
            },
            mul: function(instr) {
                return _common_math(instr.parsed, Base.multiply);
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
            str: function(instr) {
                return _store(instr, '32');
            },
            strb: function(instr) {
                return _store(instr, '8');
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            ubfx: function(instr) {
                //UBFX dest, src, lsb, width
                var dest = instr.parsed[1];
                var src = instr.parsed[2];
                var lsb = instr.parsed[3];
                var width = instr.parsed[4];
                return Base.special(dest + ' = ' + '(' + src + ' >> ' + lsb + ') & ((1 << ' + width + ') - 1)');
            },
            uxtb: function(instr) {
                return Base.subtract(instr.parsed[1], instr.parsed[2], 8);
            },
            uxth: function(instr) {
                return Base.subtract(instr.parsed[1], instr.parsed[2], 16);
            },
            invalid: function() {
                return Base.nop();
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