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

    var _common_math = function(e, op) {
        if (e[1] == 'ip' || e[1] == 'sp' || e[1] == 'fp') {
            return Base.nop();
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

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _call = function(instr, context, instructions) {
        var callname = instr.parsed[1].replace(/\./g, '_');
        var args = [];
        var regnum = 3;
        var arg0 = null;
        var start = instructions.indexOf(instr)
        for (var i = start - 1; i >= 0 && regnum >= 0; regnum--) {
            arg0 = instructions[i].parsed[1];
            var reg = 'r' + regnum;
            if (arg0 != reg) {
                continue;
            }
            args.unshift(instructions[i].string || instructions[i].pseudo.toString().replace(/^.+\s=\s/, '').trim());
            instructions[i].valid = false;
            i--;
        }
        if (instructions[start + 1].parsed[2] == 'r0') {
            callname = 'r0 = ' + callname;
        } else if (instructions[start + 1].parsed[3] == 'r0') {
            callname = 'r0 = ' + callname;
        }
        return Base.call(callname, args, false);
    };

    return {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, Base.add);
            },
            addeq: function(instr, context) {
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.add);
            },
            addne: function(instr, context) {
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.add);
            },
            and: function(instr) {
                return _common_math(instr.parsed, Base.and);
            },
            andeq: function(instr, context) {
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.and);
            },
            andne: function(instr, context) {
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.and);
            },
            b: function() {},
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
            bl: _call,
            cmp: function(instr, context) {
                context.cond.a = instr.parsed[1];
                context.cond.b = instr.parsed[2];
                return Base.nop();
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
                        return 'return';
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
            moveq: function(instr, context) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + Base.assign(dst, instr.parsed[2]);
            },
            movne: function(instr, context) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + Base.assign(dst, instr.parsed[2]);
            },
            mvn: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return Base.inverse(dst, instr.parsed[2]);
            },
            mvneq: function(instr, context) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + Base.inverse(dst, instr.parsed[2]);
            },
            mvnne: function(instr, context) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return Base.nop();
                }
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + Base.inverse(dst, instr.parsed[2]);
            },
            mul: function(instr) {
                return _common_math(instr.parsed, Base.multiply);
            },
            muleq: function(instr, context) {
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.multiply);
            },
            mulne: function(instr, context) {
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.multiply);
            },
            or: function(instr) {
                return _common_math(instr.parsed, Base.or);
            },
            oreq: function(instr, context) {
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.or);
            },
            orne: function(instr, context) {
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.or);
            },
            pop: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return 'return';
                    }
                }
                return null;
            },
            popeq: function(instr, context) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return 'if (' + context.cond.a + ' == ' + context.cond.b + ') return';
                    }
                }
                return null;
            },
            popne: function(instr, context) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return 'if (' + context.cond.a + ' != ' + context.cond.b + ') return';
                    }
                }
                return null;
            },
            push: function() {},
            str: function(instr) {
                return _store(instr, '32');
            },
            strb: function(instr) {
                return _store(instr, '8');
            },
            sub: function(instr) {
                return _common_math(instr.parsed, Base.subtract);
            },
            xor: function(instr) {
                return _common_math(instr.parsed, Base.xor);
            },
            xoreq: function(instr, context) {
                return 'if (' + context.cond.a + ' == ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.xor);
            },
            xorne: function(instr, context) {
                return 'if (' + context.cond.a + ' != ' + context.cond.b + ') ' + _common_math(instr.parsed, Base.xor);
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
        }
    };
})();