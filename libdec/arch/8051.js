/* 
 * Copyright (C) 2021 deroad
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

(function() { // lgtm [js/useless-expression]
    const Base = require('libdec/core/base');
    const Variable = require('libdec/core/variable');

    const EXTRAM = "eram + ";
    const INDRAM = "iram + ";

    function resolve_opd(instr, index) {
        var a = instr.parsed.opd[index].replace(/\+/, ' + ');
        if (a.indexOf('#') == 0) {
            return a.substr(1, a.length);
        } else if (a.match(/^\d+$|^0x[a-fA-F\d]+$/)) {
            return Variable.pointer(INDRAM + a, 8, false);
        } else if (a.indexOf('@') == 0) {
            return Variable.pointer(EXTRAM + a.substr(1, a.length), 8, false);
        }
        return a;
    }

    function previous(instr, instructions) {
        return instructions[instructions.indexOf(instr) - 1];
    }

    function is_mnem(instr, mnem, startswith) {
        if (startswith) {
            return instr && instr.parsed.mnem.indexOf(mnem) == 0;
        }
        return instr && instr.parsed.mnem == mnem;
    }

    function is_last(instr, instructions) {
        return instructions.indexOf(instr) == (instructions.length - 1);
    }

    function is_membit(instr, index) {
        return instr.parsed.opd[index].indexOf('.') > 0;
    }

    function write_membit(instr, index, b) {
        var a = instr.parsed.opd[index].split('.');
        var p = Variable.pointer(a[0], 8, false);
        if (b == '1') {
            b = '0x' + (1 << parseInt(a[1])).toString(16);
        } else if (b != '0') {
            b = '(' + b + ' & 1)' + (parseInt(a[1]) > 0 ? ' << ' + a[1] : '');
        } else {
            var bit = parseInt(a[1]) < 1 ? '~1' : '~(1 << ' + a[1] + ')';
            return Base.and(p, p, bit);
        }
        return Base.or(p, p, b);
    }

    function read_membit(instr, index, b) {
        var a = instr.parsed.opd[index].split('.');
        var p = Variable.pointer(a[0], 8, false);
        if (parseInt(a[1]) < 1) {
            return Base.and(b, p, '1');
        }
        return Base.assign(b, '(' + p.toString() + ' >> ' + a[1] + ') & 1');
    }

    function _mov(instr, context, instructions) {
        if (is_membit(instr, 0)) {
            return write_membit(instr, 0, resolve_opd(instr, 1));
        } else if (is_membit(instr, 1)) {
            return read_membit(instr, 1, resolve_opd(instr, 0));
        }
        var a = resolve_opd(instr, 0);
        var b = resolve_opd(instr, 1);
        return Base.assign(a, b);
    }

    function _call(instr, context, instructions) {
        var args = [];
        var prev = previous(instr, instructions);
        if (prev && prev.parsed.opd[0] == 'a') {
            args.push(prev.parsed.opd[0]);
        }
        return Base.call(instr.parsed.opd[0], args);
    }

    function _jump(instr, context, instructions) {
        if (is_last(instr, instructions) &&
            (instr.jump.gt(instr.location) || instr.jump.lt(instructions[0].location))) {
            return _call(instr, context, instructions);
        }
        return Base.nop();
    }

    function _math(instr, context, op, carry) {
        if (carry) {
            return op('a', op(resolve_opd(instr, 0), resolve_opd(instr, 1)), 'carry');
        }
        return op('a', resolve_opd(instr, 0), resolve_opd(instr, 1));
    }

    function _nop(instr, context, instructions) {
        return Base.nop();
    }

    return {
        instructions: {
            acall: _call,
            add: function(instr, context, instructions) {
                return _math(instr, context, Base.add);
            },
            addc: function(instr, context, instructions) {
                instr.comments.push("add with carry");
                return _math(instr, context, Base.add, true);
            },
            ajmp: _jump,
            anl: function(instr, context, instructions) {
                return _math(instr, context, Base.and);
            },
            cjne: function(instr, context, instructions) {
                instr.conditional(resolve_opd(instr, 0), resolve_opd(instr, 1), 'NE');
                return Base.nop();
            },
            clr: function(instr, context, instructions) {
                if (is_membit(instr, 0)) {
                    return write_membit(instr, 0, '0');
                }
                return Base.assign(resolve_opd(instr, 0), '0');
            },
            cpl: function(instr, context, instructions) {
                return Base.not(instr.parsed.opd[0], instr.parsed.opd[0]);
            },
            dec: function(instr, context, instructions) {
                return Base.decrease(resolve_opd(instr, 0), '1');
            },
            div: function(instr, context, instructions) {
                return Base.divide('a', 'a', 'b');
            },
            djnz: function(instr, context, instructions) {
                var a = resolve_opd(instr, 0);
                instr.conditional(a, '0', 'NE');
                return Base.decrease(a, '1');
            },
            inc: function(instr, context, instructions) {
                return Base.increase(resolve_opd(instr, 0), '1');
            },
            jb: function(instr, context, instructions) {
                instr.conditional('b', '0', 'NE');
                return Base.nop();
            },
            jbc: function(instr, context, instructions) {
                instr.conditional('b', '0 && c', 'NE');
                return Base.nop();
            },
            jc: function(instr, context) {
                instr.conditional('c', '0', 'NE');
                return Base.nop();
            },
            jmp: _jump,
            jnb: function(instr, context, instructions) {
                instr.conditional('b', '0', 'EQ');
                return Base.nop();
            },
            jnc: function(instr, context, instructions) {
                instr.conditional('c', '0', 'EQ');
                return Base.nop();
            },
            jnz: function(instr, context, instructions) {
                var p = previous(instr, instructions);
                instr.conditional(is_mnem(p, 'mov', true) ? resolve_opd(p, 1) : 'a', '0', 'NE');
                return Base.nop();
            },
            jz: function(instr, context, instructions) {
                var p = previous(instr, instructions);
                instr.conditional(is_mnem(p, 'mov', true) ? resolve_opd(p, 1) : 'a', '0', 'EQ');
                return Base.nop();
            },
            lcall: _call,
            ljmp: _jump,
            mov: _mov,
            movc: _mov,
            movx: _mov,
            mul: function(instr, context, instructions) {
                return Base.multiply('a', 'a', 'b');
            },
            orl: function(instr, context, instructions) {
                return _math(instr, context, Base.or);
            },
            pop: function(instr) {
                return Base.assign(resolve_opd(instr, 0), Base.call('pop', []));
            },
            push: function(instr) {
                return Base.call('push', [resolve_opd(instr, 0)]);
            },
            ret: function(instr) {
                return Base.return();
            },
            reti: function(instr) {
                return Base.return();
            },
            rl: function(instr) {
                return Base.rotate_left('a', 'a', '1', 8);
            },
            rlc: function(instr) {
                instr.comments.push("rotate with carry");
                return Base.rotate_left('a', 'a', '1', 8);
            },
            rr: function(instr) {
                return Base.rotate_right('a', 'a', '1', 8);
            },
            rrc: function(instr) {
                instr.comments.push("rotate with carry");
                return Base.rotate_right('a', 'a', '1', 8);
            },
            setb: function(instr, context, instructions) {
                if (is_membit(instr, 0)) {
                    return write_membit(instr, 0, '1');
                }
                return Base.assign(instr.parsed.opd[0], 1);
            },
            sjmp: _jump,
            subb: function(instr, context, instructions) {
                return _math(instr, context, Base.subtract);
            },
            swap: function(instr, context, instructions) {
                return Base.swap_endian(resolve_opd(instr, 1), resolve_opd(instr, 0), 8);
            },
            xch: function(instr, context, instructions) {
                return Base.swap(resolve_opd(instr, 0), resolve_opd(instr, 1), 8);
            },
            xchd: function(instr, context, instructions) {
                var a = resolve_opd(instr, 0);
                var b = resolve_opd(instr, 1);
                var tmp = Variable.uniqueName('tmp');
                var ops = [
                    Base.and(tmp, a, '0xF'),
                    Base.and(a, a, '0xF0'),
                    Base.or(a, b, '0xF0'),
                    Base.and(b, b, '0xF0'),
                    Base.or(b, b, tmp),
                ];
                context.local.push(tmp);
                return Base.composed(ops);
            },
            xrl: function(instr, context, instructions) {
                return _math(instr, context, Base.xor);
            },
            nop: _nop,
            reserved: _nop,
            invalid: _nop
        },
        parse: function(assembly) {
            assembly = assembly.trim().replace(/,/g, '');
            var tokens = assembly.split(' ');
            return {
                mnem: tokens[0],
                opd: tokens.splice(1)
            };
        },
        context: function() {
            return {
                local: []
            };
        },
        preanalisys: function(instructions, context) {},
        localvars: function(context) {
            return context.local.map(function(x) {
                return 'uint8_t ' + x;
            });
        },
        globalvars: function(context) {
            return [];
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return 'void';
        }
    };
});