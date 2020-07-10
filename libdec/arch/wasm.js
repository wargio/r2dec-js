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
    var Extra = require('libdec/core/extra');

    var _memory_name = "_memory";

    var _to_argument = function(wasm_var) {
        return wasm_var.toString('arg');
    };

    var WasmVar = function(name, type, instr) {
        this.name = name;
        this.type = type;
        this.instr = instr;
        this.toString = function(s) {
            if (s == 'arg') {
                return this.type + ' ' + this.name;
            }
            return this.name;
        };
    };

    var StackVar = function(type, instr) {
        return new WasmVar(Variable.uniqueName('stack'), type, instr);
    };

    var _is_next_a_set = function(instr, instructions) {
        var pos = instructions.indexOf(instr) + 1;
        if (!instructions[pos]) {
            return false;
        }
        var mnem = instructions[pos].parsed.mnem;
        return mnem == 'set_local' || mnem == 'set_global' ? pos : -1;
    };

    var _is_next_local = function(instr, instructions) {
        var pos = instructions.indexOf(instr) + 1;
        if (!instructions[pos]) {
            return false;
        }
        var mnem = instructions[pos].parsed.mnem;
        return mnem == 'set_local' ? pos : -1;
    };

    var _is_previous_call = function(instr, instructions) {
        var pos = instructions.indexOf(instr) - 1;
        if (!instructions[pos]) {
            return false;
        }
        var mnem = instructions[pos].parsed.mnem;
        return mnem == 'call' ? pos : -1;
    };

    var _set_local = function(instr, context, instructions, type, allow_args) {
        var pos = _is_next_local(instr, instructions);
        var name = allow_args ? 'arg_' : 'local';
        var n = '';
        if (pos < 0) {
            n = instr.parsed.opd[0];
            if (!context.local[n]) {
                name += n;
                context.local[n] = new WasmVar(name, type, instr);
                if (allow_args) {
                    context.input[n] = context.local[n];
                }
            }
            return context.local[n];
        }
        n = instructions[pos].parsed.opd[0];
        if (!context.local[n]) {
            name += n;
            context.local[n] = new WasmVar(name, type, instr);
            if (allow_args) {
                context.input[n] = context.local[n];
            }
        }
        return context.local[n];
    };

    var _set_global = function(instr, context, instructions, type) {
        var n = instr.parsed.opd[0].trim();
        if (!context.global[n]) {
            context.global[n] = new WasmVar('global_' + instr.parsed.opd[0], type, instr);
        }
        return context.global[n];
    };

    var _bits = function(o) {
        if (typeof o == 'object') {
            o = o.parsed.type;
        }
        switch (o) {
            case 'f32':
                return 32;
            case 'f64':
                return 64;
            case 'i64':
                return 64;
            default:
                return 32;
        }
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

    var _remove_const = function(instr, instructions, stackval) {
        if (stackval && instructions.indexOf(stackval.instr) == (instructions.indexOf(instr) - 1) && stackval.instr.parsed.mnem == 'const') {
            stackval.instr.valid = false;
            // <type>.const <N>
            return stackval.instr.parsed.opd[0];
        }
        return stackval;
    };

    var _math = function(instr, context, instructions, type, op) {
        var source_b = context.stack.pop();
        source_b = _remove_const(instr, instructions, source_b);
        var source_a = context.stack.pop();
        source_a.type = type;
        source_b.type = type;
        var pos = _is_next_a_set(instr, instructions);
        var destination = StackVar(type, instr);
        context.stack.push(destination); // push must happen.
        if (pos < 0) {
            return op(destination.toString(), source_a.toString(), source_b.toString());
        }
        var next_set = instructions[pos];
        next_set.valid = false;
        if (next_set.parsed.mnem == 'set_local') {
            destination = _set_local(next_set, context, instructions, 'int32_t', false);
        } else {
            destination = _set_global(next_set, context, instructions, 'int32_t');
        }
        return op(destination.toString(), source_a.toString(), source_b.toString());
    };

    var _cmp = {
        eq: 'EQ',
        ne: 'NE',
        eqz: 'EQ',
        nez: 'NE',
        gt_s: 'GT',
        gt_u: 'GT',
        ge_s: 'GE',
        ge_u: 'GE',
        lt_s: 'LT',
        lt_u: 'LT',
        le_s: 'LE',
        le_u: 'LE',
        gt: 'GT',
        ge: 'GE',
        lt: 'LT',
        le: 'LE'
    };

    var _conditional = function(instr, context, instructions) {
        var cond = {};
        cond.b = context.stack.pop().toString();
        cond.a = context.stack.pop().toString();
        if (!cond.a) {
            cond.a = '?';
        }
        if (!cond.b) {
            cond.b = '?';
        }
        cond.cmp = _cmp[instr.parsed.mnem];
        context.condstack.push(cond);
        return Base.nop();
    };

    var _conditional_zero = function(instr, context, instructions) {
        var cond = {};
        cond.b = '0';
        cond.a = context.stack.pop().toString();
        if (!cond.a) {
            cond.a = '?';
        }
        cond.cmp = _cmp[instr.parsed.mnem];
        context.condstack.push(cond);
        return Base.nop();
    };

    var _set_instruction_conditional = function(instr, context) {
        var cond = context.condstack.pop();
        if (!cond) {
            var arg = context.stack.pop();
            if (!arg) {
                arg = '?';
            }
            instr.conditional(arg.toString(), '0', 'NE');
        } else {
            instr.conditional(cond.a, cond.b, cond.cmp);
        }
    };

    var _common_load = function(instr, context) {
        context.memory = true;
        var offset = instr.parsed.opd[instr.parsed.opd.length - 1];
        var pointer = context.stack.pop().toString();
        var register = StackVar(_type(instr), instr);
        context.stack.push(register);
        if (offset != '0') {
            var bits = instr.parsed.mnem.match(/\d+/) || ["32"];
            bits = parseInt(bits[0]) / 8;
            pointer += ' + ' + (parseInt(offset) / bits).toString();
        }
        pointer = _memory_name + ' + ' + pointer;
        return Base.read_memory(pointer, register.toString(), _bits(instr), instr.parsed.mnem.endsWith('_s'));
    };

    var _common_store = function(instr, context) {
        context.memory = true;
        var offset = instr.parsed.opd[instr.parsed.opd.length - 1];
        var register = context.stack.pop().toString();
        var pointer = context.stack.pop().toString();
        var bits = instr.parsed.mnem.match(/\d+/) || ["32"];
        bits = parseInt(bits[0]);
        if (offset != '0') {
            pointer += ' + ' + (parseInt(offset) / (bits / 8)).toString();
        }
        pointer = _memory_name + ' + ' + pointer;
        return Base.write_memory(pointer, register.toString(), bits, false);
    };

    var _wasm_arch = {
        instructions: {
            eq: _conditional,
            ne: _conditional,
            eqz: _conditional_zero,
            nez: _conditional_zero,
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
                var s = StackVar('const ' + _type(instr), instr);
                context.stack.push(s);
                var num = parseInt(instr.parsed.opd[0]);
                if (num > 1023) {
                    num = '0x' + num.toString(16);
                }
                return Base.assign(s.toString(), num.toString());
            },
            load: _common_load,
            load8_s: _common_load,
            load8_u: _common_load,
            load16_s: _common_load,
            load16_u: _common_load,
            store: _common_store,
            store8: _common_store,
            store16: _common_store,
            store32: _common_store,
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
            get_global: function(instr, context, instructions) {
                var dst = _set_global(instr, context, instructions, 'int32_t');
                context.stack.push(dst);
                return Base.nop();
            },
            set_global: function(instr, context, instructions) {
                var dst = _set_global(instr, context, instructions, 'int32_t');
                var arg = context.stack.pop();
                return Base.assign(dst.toString(), arg ? arg.toString() : "?");
            },
            get_local: function(instr, context, instructions) {
                context.stack.push(_set_local(instr, context, instructions, 'int32_t', true));
                return Base.nop();
            },
            set_local: function(instr, context, instructions) {
                var dst = _set_local(instr, context, instructions, 'int32_t', false);
                var pos = _is_previous_call(instr, instructions);
                if (pos > -1) {
                    var call = instructions[pos];
                    call.code = Base.assign(dst.toString(), call.code);
                    return Base.nop();
                }
                var arg = context.stack.pop();
                return Base.assign(dst.toString(), arg ? arg.toString() : "?");
            },
            tee_local: function(instr, context, instructions) {
                var dst = _set_local(instr, context, instructions, 'int32_t', true);
                var pos = _is_previous_call(instr, instructions);
                if (pos > -1) {
                    var call = instructions[pos];
                    call.code = Base.assign(dst.toString(), call.code);
                    return Base.nop();
                }
                var arg = context.stack[context.stack.length - 1];
                return Base.assign(dst.toString(), arg.toString());
            },
            drop: function(instr, context, instructions) {
                _remove_const(instr, instructions, context.stack.pop());
                return Base.nop();
            },
            call: function(instr, context, instructions) {
                var args = [];
                for (var i = instructions.indexOf(instr) - 1; i >= 0; i--) {
                    var previous = instructions[i].parsed.mnem;
                    if (!previous.startsWith('get_') && previous != 'const') {
                        break;
                    }
                    args.unshift(context.stack.pop());
                }
                if (instr.parsed.opd[0].match(/^\d+$/)) {
                    return Base.call('fcn_' + instr.parsed.opd[0], args);
                }
                return Base.call(instr.parsed.opd[0], args);
            },
            return: function(instr, context, instructions) {
                var ret = null;
                if (context.stack.length > 0) {
                    if (context.stack.length > 1) {
                        Global.warning('[wasm] stack len is not zero: ' + context.stack.length);
                    }
                    context.returned = context.stack.pop();
                    ret = _remove_const(instr, instructions, context.returned);
                    if (!Extra.is.string(ret)) {
                        ret = context.returned.toString();
                    }
                }
                return Base.return(ret);
            },
            'if': function(instr, context, instructions) {
                _set_instruction_conditional(instr, context);
                return Base.nop();
            },
            br_if: function(instr, context, instructions) {
                _set_instruction_conditional(instr, context);
                return Base.nop();
            },
            'else': function(instr, context, instructions) {
                return Base.nop();
            },
            block: function(instr, context, instructions) {
                return Base.nop();
            },
            loop: function(instr, context, instructions) {
                return Base.nop();
            },
            end: function(instr, context, instructions) {
                if (instr.jump && instr.jump.lte(instr.location)) {
                    _set_instruction_conditional(instr, context);
                } else {
                    var curidx = instructions.indexOf(instr);
                    if (curidx == (instructions.length - 1)) {
                        var ret = null;
                        if (context.stack.length > 0) {
                            if (context.stack.length > 1) {
                                Global.warning('[wasm] stack len is not zero: ' + context.stack.length);
                            }
                            context.returned = context.stack.pop();
                            ret = _remove_const(instr, instructions, context.returned);
                            if (!Extra.is.string(ret)) {
                                ret = ret.toString();
                            }
                        }
                        return Base.return(ret);
                    }
                }

                return Base.nop();
            },
            br: function(instr, context, instructions) {
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
            asm = asm.trim().replace(/\s+/g, ' ').replace(/\//g, ' ');
            var type = asm.match(/[if]\d\d\./);
            if (type) {
                type = type[0];
                asm = asm.replace(/[if]\d\d\./, '');
            }
            asm = asm.split(' ');

            return {
                type: type || 'i32',
                mnem: asm.shift(),
                opd: asm
            };
        },
        context: function() {
            return {
                returned: null,
                global: {},
                input: {},
                local: {},
                stack: [],
                condstack: [],
                memory: false,
            };
        },
        globalvars: function(context) {
            var to_return = Extra.to.array(context.global).map(_to_argument);
            if (context.memory) {
                to_return.unshift("extern uint8_t " + _memory_name + "[]");
            }
            return to_return;
        },
        localvars: function(context) {
            var vars = [];
            for (var k in context.local) {
                var o = context.local[k];
                if (Extra.is.inObject(context.input, o) || Extra.is.inObject(context.global, o)) {
                    continue;
                }
                vars.push(o.toString('arg'));
            }
            return vars;
        },
        arguments: function(context) {
            return Extra.to.array(context.input).map(_to_argument);
        },
        returns: function(context) {
            if (context.returned) {
                return context.returned.type.replace(/const\s/, '');
            }
            return 'void';
        }
    };
    return _wasm_arch;
});