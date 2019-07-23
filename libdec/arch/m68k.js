/* 
 * Copyright (C) 2018 deroad
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

    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');

    var _to_size = function(value) {
        if (value == 'b') {
            return 8;
        } else if (value == 'w') {
            return 16;
        } else if (value == 'l') {
            return 32;
        }
        return 0;
    };

    var _as_pointer = function(e, where, signed, ispointer) {
        var arg = e.opd[where];
        if (arg.pointer) {
            if (arg.presub) {
                var m = e.bits / 8;
                if (m == 1) {
                    arg = Variable.pointer('--' + arg.pointer, e.bits, signed);
                } else {
                    arg = Variable.pointer(arg.pointer + ' -= ' + m, e.bits, signed);
                }
            } else {
                return Variable.pointer(arg.pointer, e.bits, signed);
            }
        } else if (ispointer && arg.register.indexOf('0x') == 0) {
            var tokens = arg.register.replace(/\.([bwl])/, ' $1').split(' ');
            arg = Variable.pointer(tokens[0], _to_size(tokens[1]), signed);
        } else {
            return arg.register;
        }
        return arg;
    };

    var _is_register = function(name) {
        return name && name.match(/\b[acdsACDS][0-9ixIX]\b/);
    };

    var _common_math = function(e, op) {
        var src = _as_pointer(e, 0, true);
        var dst = _as_pointer(e, 1, true);
        if (e.opd[1].postadd) {
            return Base.composed([op(dst, dst, src), Base.add(e.opd[1].register, e.opd[1].register, '' + (e.bits / 8))]);
        }
        return op(dst, dst, src);
    };

    var _move = function(instr) {
        instr.setBadJump();
        var e = instr.parsed;
        var src = _as_pointer(e, 0, true, true);
        var dst = _as_pointer(e, 1, true, true);
        return Base.assign(dst, src);
    };

    var _move_multiple = function(instr, context) {
        instr.setBadJump();
        var memory, pointer, postadd, register, op;
        var e = instr.parsed;
        var incr = (e.bits / 8).toString();
        var ops = [];
        if (e.opd[0].pointer) {
            //movem.l -(a7), d2-d3/a2-a5
            memory = _as_pointer(e, 0, false);
            pointer = e.opd[0].register;
            postadd = e.opd[0].postadd;
            register = e.opd[1].register;
            op = Base.read_memory;
        } else {
            //movem.l d2-d3/a2-a5, -(a7)
            memory = _as_pointer(e, 1, false);
            pointer = e.opd[1].register;
            postadd = e.opd[1].postadd;
            register = e.opd[0].register;
            op = Base.write_memory;
        }
        var reg = register.split('/');
        for (var i = 0; i < reg.length; i++) {
            var prefix = reg[i].charAt(0);
            var tmp = reg[i].replace(/[a-zA-Z]/g, '').split('-');
            var start = tmp[0];
            var end = tmp[1] || tmp[0];
            for (var j = start; j <= end; j++) {
                ops.push(op(memory, prefix + j, e.bits, false));
                if (postadd) {
                    ops.push(Base.add(pointer, pointer, incr));
                }
            }
        }
        return Base.composed(ops);
    };

    var _compare = function(instr, context) {
        instr.setBadJump();
        context.cond.a = _as_pointer(instr.parsed, 1, false);
        context.cond.b = _as_pointer(instr.parsed, 0, false);
        return Base.nop();
    };

    var _conditional = function(instr, context, type, zero) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return Base.nop();
    };

    var _bitmask = function(offset, size) {
        var mask = 0;
        for (var i = 0; i < size; i++) {
            mask <<= 1;
            mask |= 1;
        }
        return '0x' + ((mask << offset) >>> 0).toString(16);
    };

    return {
        instructions: {
            add: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            addi: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            addq: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.add);
            },
            and: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.and);
            },
            andi: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.and);
            },
            bftst: function(instr, context) {
                instr.setBadJump();
                var vals = instr.assembly.match(/(\w+)(?:{(\d+):(\d+)})/);
                var mask = _bitmask(vals[2], vals[3]);
                var test = Variable.local('(' + vals[1] + ' & ' + mask + ')');
                context.cond.a = test;
                context.cond.b = '0';
                return Base.nop();
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
            bge: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            bra: function(instr, context) {
                return Base.nop();
            },
            btst: function(instr, context) {
                instr.setBadJump();
                var and = instr.parsed.opd[0].register == '0x0' ? ' & 1)' : ' & (1 << ' + instr.parsed.opd[0].register + '))';
                var test = Variable.local('(' + instr.parsed.opd[1].register + and);
                context.cond.a = test;
                context.cond.b = '0';
                return Base.nop();
            },
            clr: function(instr, context) {
                var e = instr.parsed;
                var dst = _as_pointer(e, 0, false);
                var op = Base.assign(dst, '0');
                if (e.opd[0].postadd) {
                    var ptr_reg = e.opd[0].register;
                    return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))]);
                }
                return op;
            },
            cmp: _compare,
            cmpi: _compare,
            eori: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.xor);
            },
            jsr: function(instr) {
                var arg = _is_register(instr.parsed.opd[0].register) ? Variable.functionPointer(instr.parsed.opd[0].register) : instr.parsed.opd[0].register;
                return Base.call(arg, []);
            },
            lea: function(instr, context) {
                instr.setBadJump();
                var src = instr.string ? Variable.string(instr.string) : _as_pointer(instr.parsed, 0, false, true);
                var dst = _as_pointer(instr.parsed, 1, false, true);
                return Base.assign(dst, src);
            },
            link: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                var src = e.opd[0].register;
                var dst = e.opd[1].register;
                return Base.write_memory(dst == '0x0' ? 'a7' : ('a7 + ' + dst), src, e.bits, false);
            },
            lsl: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                var src = _as_pointer(e, 0, false);
                var dst = _as_pointer(e, 1, false);
                if (!e.opd[1]) {
                    return Base.shift_left(dst, dst, '1');
                } else if (e.opd[1].pointer) {
                    var op = Base.shift_left(dst, dst, src);
                    if (e.opd[1].postadd) {
                        var ptr_reg = e.opd[1].register;
                        return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))]);
                    }
                    return op;
                }
                return Base.shift_left(dst, dst, src);

            },
            lsr: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                var src = _as_pointer(e, 0, false);
                var dst = _as_pointer(e, 1, false);
                if (!e.opd[1]) {
                    return Base.shift_right(dst, dst, '1');
                } else if (e.opd[1].pointer) {
                    var op = Base.shift_right(dst, dst, src);
                    if (e.opd[1].postadd) {
                        var ptr_reg = e.opd[1].register;
                        return Base.composed([op, Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))]);
                    }
                    return op;
                }
                return Base.shift_right(dst, dst, src);
            },
            move: function(instr) {
                instr.setBadJump();
                var ptr_reg, ops;
                var e = instr.parsed;
                var pointer = _as_pointer(e, 0, false, true);
                var register = _as_pointer(e, 1, false, true);

                if (e.opd[1].postadd) {
                    ptr_reg = e.opd[1].register;
                    ops = [
                        Base.read_memory(pointer, register, e.bits, false),
                        Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))
                    ];
                    if (e.opd[0].postadd) {
                        ptr_reg = e.opd[0].register;
                        ops.push(Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8)));
                    }
                    return Base.composed(ops);
                } else if (e.opd[0].postadd) {
                    ptr_reg = e.opd[0].register;
                    ops = [
                        Base.read_memory(pointer, register, e.bits, false),
                        Base.add(ptr_reg, ptr_reg, '' + (e.bits / 8))
                    ];
                    return Base.composed(ops);
                }
                return Base.read_memory(pointer, register, e.bits, false);
            },
            movea: _move,
            movem: _move_multiple,
            moveq: function(instr, context) {
                instr.setBadJump();
                return Base.assign(instr.parsed.opd[1].register, instr.parsed.opd[0].register);
            },
            or: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.or);
            },
            ori: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.or);
            },
            pea: function(instr) {
                instr.setBadJump();
                var bits = instr.parsed.bits;
                var pointer = Variable.pointer('a7 -= 4', bits, false);
                var register = instr.string ? Variable.string(instr.string) : _as_pointer(instr.parsed, 0, false);
                return Base.write_memory(pointer, register, bits, false);
            },
            rts: function(instr) {
                instr.setBadJump();
                return Base.return();
            },
            sf: function(instr, context) {
                instr.setBadJump();
                var e = instr.parsed;
                var dst = _as_pointer(e, 0, false, true);
                var op = Base.assign(dst, '0');
                if (e.opd[1].postadd) {
                    return Base.composed([op, Base.add(e.opd[1].register, e.opd[1].register, '' + (e.bits / 8))]);
                }
                return op;
            },
            st: function(instr, context) {
                instr.setBadJump();
                var e = instr.parsed;
                var dst = _as_pointer(e, 0, false, true);
                var op = Base.assign(dst, '1');
                if (e.opd[0].postadd) {
                    return Base.composed([op, Base.add(e.opd[0].register, e.opd[0].register, '' + (e.bits / 8))]);
                }
                return op;
            },
            sub: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.subtract);
            },
            subq: function(instr) {
                instr.setBadJump();
                return _common_math(instr.parsed, Base.subtract);
            },
            tst: function(instr, context) {
                instr.setBadJump();
                context.cond.a = _as_pointer(instr.parsed, 0, false);
                context.cond.b = '0';
                return Base.nop();
            },
            unlk: function(instr) {
                instr.setBadJump();
                var e = instr.parsed;
                return Base.read_memory(e.opd[1].register || 'a7', e.opd[0].register, e.bits, false);
            },
            invalid: function(instr) {
                instr.setBadJump();
                return Base.nop();
            }
        },
        parse: function(asm) {
            const expr = /([a-zA-Z]+)(\.[bwl])?\s+([\w.:_-]+\([\w. *,[\]]+\)|-?\([\w. *,[\]]+\)\+?|[\w./:_-]+)(?:,\s+([\w.:_-]+\([\w. *,[\]]+\)|-?\([\w. *,[\]]+\)\+?|[\w./:_-]+))?/;
            var token = asm.match(expr);
            token.shift();
            /*
             * [
                 "move.l obj.__unctrl(d0.l * 4), -(a7)",
                 "move",
                 ".l",
                 "obj.__unctrl(d0.l * 4)",
                 "-(a7)"
             * ]
             * token[0] = assembly
             * token[1] = mnem
             * token[2] = bits
             * token[3] = opd0
             * token[4] = opd1
             */

            var mnem = token.shift();
            var bits = token.shift();

            var ret = {
                mnem: mnem,
                bits: _to_size(bits ? bits.substring(1) : 'l'),
                opd: token.filter(function(x) {
                    return x ? true : false;
                }).map(function(x) {
                    var d = {
                        presub: false,
                        postadd: false,
                        pointer: null,
                        register: null,
                    };

                    var isreg = x.indexOf('(') < 0;
                    var ptr = x.replace(/([\w.:_-][\w.:_-]+)\(/, '$1 + ').replace(/(-?\()|\)\+?/g, ' ').replace(/,\sinvalid\.[bwl]/, '');
                    var p = x.replace(/[(),]/g, ' ').replace(/\s+/g, ' ');
                    p = p.replace(/invalid\.[bwl]/, '');
                    p = p.trim().split(' ');
                    if (p[0] == '-') {
                        d.presub = true;
                        p.shift();
                    } else if (p[p.length - 1] == '+') {
                        d.postadd = true;
                        p.pop();
                    }
                    if (isreg) {
                        d.register = p.pop();
                    } else if (ptr.indexOf('-') > 0 || ptr.indexOf('+') > 0 || ptr.indexOf('*') > 0) {
                        d.pointer = ptr.replace(/(\d)\.[bwl]/, '$1').replace(/,/g, ' +').trim();
                        d.register = ptr.match(/[ad]\d+/)[0];
                    } else {
                        d.pointer = p.join(' + ');
                        d.register = p[0];
                    }
                    return d;
                }),
            };
            return ret;
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
        localvars: function(context) {
            return [];
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