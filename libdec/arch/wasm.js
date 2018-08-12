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

module.exports = (function() {

    var Instruction = require('libdec/core/instruction');
    var Base = require('libdec/core/base');
    var Variable = require('libdec/core/variable');
    var Long = require('libdec/long');

    var _call_fix_name = function(name) {
        if (typeof name != 'string') {
            return name;
        }
        if (name.indexOf('fcn.') == 0 || name.indexOf('func.') == 0) {
            return name.replace(/[\.:]/g, '_').replace(/__+/g, '_');
        }
        return name.replace(/\[reloc\.|\]/g, '').replace(/[\.:]/g, '_').replace(/__+/g, '_').replace(/_[0-9a-f]+$/, '').replace(/^_+/, '');
    };

    var StackVar = function(type, isarg) {
        this.name = Variable.uniqueName(isarg ? 'arg_' : 'local_');
        this.type = type;
        this.toString = function(s) {
            if (s == 'arg') {
                return this.type + ' ' + this.name;
            }
            return this.name;
        };
    };

    var _is_next_local = function(instr, instructions) {
        var pos = instructions.indexOf(instr) + 1;
        return instructions[pos].parsed.mnem == 'set_local' ? pos : -1;
    };

    var _set_local = function(instr, context, instructions, type, allow_args) {
        var pos = _is_next_local(instr, instructions);
        if (pos < 0) {
            return new StackVar(type);
        }
        var n = parseInt(instructions[pos].parsed.opd[0]);
        if (!context.local[n]) {
            context.local[n] = new StackVar(type, allow_args);
            if (allow_args) {
                context.input[n] = context.local[n];
            }
        }
        return context.local[n];
    };

    var _type = function(o, unsigned) {
        if (typeof o == 'object') {
            o = o.parsed.type;
        }
        switch (o) {
            case 'f32':
                return 'float';
            case 'f64':
                return 'double';
            case 'i64':
                return unsigned ? 'uint64_t' : 'int64_t';
            default:
                return unsigned ? 'uint32_t' : 'int32_t';
        }
    };

    var _math = function(instr, context, instructions, type, op) {
        var pos = instructions.indexOf(instr) + 1;
        var b = context.stack.pop();
        var a = context.stack.pop();
        a.type = type;
        b.type = type;
        var s = _set_local(instr, context, instructions, type, false);
        context.stack.push(s);
        if (_is_next_local(instr, instructions) < 0) {
            return op(s.toString('arg'), a.toString(), b.toString());
        }
        return op(s.toString(), a.toString(), b.toString());
    };

    var _cmp = {
        eq: 'NE',
        ne: 'EQ',
        gt_s: 'LE',
        gt_u: 'LE',
        ge_s: 'LT',
        ge_u: 'LT',
        lt_s: 'GE',
        lt_u: 'GE',
        le_s: 'GT',
        le_u: 'GT',
        gt: 'LE',
        ge: 'LT',
        lt: 'GE',
        le: 'GT'
    };

    var _conditional = function(instr, context, instructions) {
        var cond = {};
        cond.b = context.stack.pop().toString();
        cond.a = context.stack.pop().toString();
        cond.cmp = _cmp[instr.parsed.mnem];
        context.stack.push(cond);
        return Base.nop();
    };

    var _NOP = function(instr) {
        var nopdata = {
            "offset": instr.location,
            "size": 1,
            "opcode": "nop",
            "disasm": "nop",
        };
        return new Instruction(nopdata, _wasm_arch);
    };

    var _wasm_arch = {
        instructions: {
            eq: _conditional,
            ne: _conditional,
            gt_s: _conditional,
            gt_u: _conditional,
            ge_s: _conditional,
            ge_u: _conditional,
            lt_s: _conditional,
            lt_u: _conditional,
            le_s: _conditional,
            le_u: _conditional,
            gt: _conditional,
            ge: _conditional,
            lt: _conditional,
            le: _conditional,
            const: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, 'const ' + _type(instr), false);
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.assign(s.toString('arg'), instr.parsed.opd[0]);
                }
                return Base.assign(s.toString(), instr.parsed.opd[0]);
            },
            add: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.add);
            },
            and: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.and);
            },
            div_s: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.divide);
            },
            div_u: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr, true), Base.divide);
            },
            extend_s: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.extend(s.toString('arg'), b.toString(), _type(instr));
                }
                return Base.extend(s.toString(), b.toString(), _type(instr));
            },
            extend_u: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.extend(s.toString('arg'), b.toString(), _type(instr, true));
                }
                return Base.extend(s.toString(), b.toString(), _type(instr, true));
            },
            mul: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.multiply);
            },
            or: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.or);
            },
            reinterpret: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.assign(s.toString('arg'), b.toString());
                }
                return Base.assign(s.toString(), b.toString());
            },
            rem_s: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.module);
            },
            rem_u: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr, true), Base.module);
            },
            shl: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.shift_left);
            },
            shr_s: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.shift_right);
            },
            shr_u: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr, true), Base.shift_right);
            },
            sub: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.subtract);
            },
            wrap: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.extend(s.toString('arg'), b.toString(), _type(instr, true));
                }
                return Base.extend(s.toString(), b.toString(), _type(instr, true));
            },
            trunc_s: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.extend(s.toString('arg'), b.toString(), _type(instr, true));
                }
                return Base.extend(s.toString(), b.toString(), _type(instr, true));
            },
            trunc_u: function(instr, context, instructions) {
                var s = _set_local(instr, context, instructions, _type(instr), false);
                var b = context.stack.pop();
                context.stack.push(s);
                if (_is_next_local(instr, instructions) < 0) {
                    return Base.extend(s.toString('arg'), b.toString(), _type(instr, true));
                }
                return Base.extend(s.toString(), b.toString(), _type(instr, true));
            },
            xor: function(instr, context, instructions) {
                return _math(instr, context, instructions, _type(instr), Base.xor);
            },
            get_local: function(instr, context, instructions) {
                var n = parseInt(instr.parsed.opd[0]);
                if (!context.local[n]) {
                    context.local[n] = new StackVar('int32_t');
                    context.input[n] = context.local[n];
                }
                context.stack.push(context.local[n]);
                return Base.nop();
            },
            set_local: function(instr, context, instructions) {
                var n = parseInt(instr.parsed.opd[0]);
                context.local[n] = context.stack.pop();
                return Base.nop();
            },
            tee_local: function(instr, context, instructions) {
                var n = parseInt(instr.parsed.opd[0]);
                context.local[n] = context.stack[context.stack.length - 1];
                return Base.nop();
            },
            call: function(instr, context, instructions) {
                var args = context.stack.slice().map(function(x) {
                    return x.toString();
                });
                if (instr.parsed.opd[0].match(/^(0x)?[\dA-Fa-f]+$/)) {
                    return Base.call(instr.parsed.opd[0], args, true);
                }
                return Base.call(_call_fix_name(instr.parsed.opd[0]), args);
            },
            return: function(instr, context, instructions) {
                var ret = null;
                if (context.stack.length > 0) {
                    if (context.stack.length > 1) {
                        console.log('unimplemented..', context.stack);
                    }
                    context.returned = context.stack.pop();
                    ret = context.returned.toString();
                }
                return Base.return(ret);
            },
            'if': function(instr, context, instructions) {
                var cond = context.stack.pop();
                if (cond.a) {
                    instr.conditional(cond.a, cond.b, cond.cmp);
                } else {
                    instr.conditional(cond.toString(), '0', 'EQ');
                }
                return Base.nop();
            },
            'else': function(instr, context, instructions) {
                return Base.nop();
            },
            end: function(instr, context, instructions) {
                return Base.nop();
            },
            nop: function(instr, context, instructions) {
                return Base.nop();
            },
            invalid: function(instr, context, instructions) {
                return Base.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            asm = asm.trim().replace(/\s+/g, ' ').replace(/\//g, ' ');
            var type = asm.match(/[if]\d\d\./);
            if (type) {
                type = type[0];
                asm = asm.replace(/[if]\d\d\./, '');
            }
            asm = asm.split(' ');

            return {
                type: type,
                mnem: asm.shift(),
                opd: asm
            };
        },
        context: function() {
            return {
                returned: null,
                input: [],
                local: [],
                stack: [],
            }
        },
        custom_start: function(instructions) {
            var stack = [];
            var pos = 0;
            for (var i = 0; i < instructions.length; i++) {
                instructions[i].setBadJump();
                var op = instructions[i].parsed.mnem;
                if (op == 'if') {
                    pos = stack.push(instructions[i]);
                } else if (op == 'else') {
                    stack[pos - 1].jump = instructions[i + 1].location;
                    stack[pos - 1] = instructions[i];
                } else if (op == 'end') {
                    var o = stack.pop();
                    if (o) {
                        o.jump = instructions[i + 1].location;
                    }
                }
            }
        },
        localvars: function(context) {
            return context.local.filter(function(x) {
                for (var i = 0; i < context.input.length; i++) {
                    if (x == context.input[i]) {
                        return false;
                    }
                }
                return true;
            }).map(function(x) {
                return x.toString('arg') + ';';
            });
        },
        arguments: function(context) {
            return context.input.map(function(x) {
                return x.toString('arg');
            });
        },
        returns: function(context) {
            if (context.returned) {
                return context.returned.type.replace(/const\s/, '');
            }
            return 'void';
        }
    };
    return _wasm_arch;
})();