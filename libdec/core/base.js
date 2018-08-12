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
    const Cpp = require('libdec/db/cpp');
    const CCalls = require('libdec/db/c_calls');

    const Macro = require('libdec/core/macro');
    const Extra = require('libdec/core/extra');
    const Variable = require('libdec/core/variable');
    const Condition = require('libdec/core/condition');

    var _generic_asm = function(asm) {
        this.asm = asm;
        this.toString = function() {
            var t = Global.printer.theme;
            var a = Global.printer.auto;
            return t.callname('__asm') + ' (' + a(this.asm) + ')';
        }
    };

    var _generic_assignment = function(destination, source) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;
        this.toString = function() {
            if (this.destination == this.source) {
                return '';
            }
            var a = Global.printer.auto;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination;
            var source = Extra.is.string(this.source) ? a(this.source) : this.source;
            return destination + ' = ' + source;
        };
    };

    var _assign_with_operator = function(destination, source, operator) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;
        this.operator = operator;
        this.toString = function() {
            var a = Global.printer.auto;
            var t = Global.printer.theme;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination;
            var source = Extra.is.string(this.source) ? a(this.source) : this.source;
            return destination + ' = ' + this.operator + source;
        };
    };

    var _cast_register = function(destination, source, cast) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;
        this.cast = cast;
        this.toString = function() {
            var a = Global.printer.auto;
            var t = Global.printer.theme;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination;
            var source = Extra.is.string(this.source) ? a(this.source) : this.source;
            return destination + ' = (' + t.types(this.cast) + ') ' + source;
        };
    };

    var _generic_inc_dec = function(destination, operation) {
        this.destination = destination;
        this.operation = operation;
        this.toString = function() {
            return this.destination + this.operation;
        };
    };

    var _generic_math = function(destination, source_a, source_b, operation) {
        this.destination = destination;
        this.source_a = source_a;
        this.source_b = source_b;
        this.operation = operation;
        this.toString = function() {
            var a = Global.printer.auto;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination;
            var source_a = Extra.is.string(this.source_a) ? a(this.source_a) : this.source_a;
            var source_b = Extra.is.string(this.source_b) ? a(this.source_b) : this.source_b;
            if (this.destination == this.source_a) {
                return destination + ' ' + this.operation + '= ' + source_b;
            }
            return destination + ' = ' + source_a + ' ' + this.operation + ' ' + source_b;
        };
    };

    var _generic_call = function(function_name, arguments) {
        this.function_name = Extra.is.string(function_name) ? Cpp(Extra.replace.call(function_name)) : function_name;
        this.arguments = arguments || [];
        this.toString = function() {
            var fcn = this.function_name;
            if (Extra.is.string(fcn)) {
                fcn = Global.printer.theme.callname(fcn);
            }
            return fcn + ' (' + this.arguments.join(', ') + ')';
        };
    };

    var _generic_rotate = function(destination, source_a, rotation, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.destination = destination;
        this.source_a = source_a;
        this.rotation = rotation;
        this.toString = function() {
            var t = Global.printer.theme;
            var a = Global.printer.auto;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination;
            var source_a = Extra.is.string(this.source_a) ? a(this.source_a) : this.source_a;
            var rotation = Extra.is.string(this.rotation) ? a(this.rotation) : this.rotation;
            return destination + ' = ' + t.callname(this.call) + ' (' + source_a + ', ' + rotation + ')';
        };
    }

    var _generic_return = function(value) {
        this.value = value;
        this.toString = function(options) {
            var r = Global.printer.theme.flow('return');
            if (this.value) {
                r += ' ' + (Extra.is.string(this.value) ? Global.printer.auto(this.value) : this.value);
            }
            return r;
        };
    };

    var _generic_goto = function(label_or_address) {
        this.value = label_or_address;
        this.toString = function(options) {
            var r = Global.printer.theme.flow('goto') + Global.printer.html(' ');
            if (Extra.is.string(this.value)) {
                r += Global.printer.auto(this.value);
            } else {
                r += this.value;
            }
            return r;
        };
    };

    var _generic_flow = function(name) {
        this.name = name;
        this.toString = function(options) {
            return Global.printer.theme.flow(this.name);
        };
    };

    var _inline_conditional_assign = function(destination, source_a, source_b, cond, src_true, src_false) {
        this.condition = new Condition.convert(source_a, source_b, cond, false);
        this.destination = destination;
        this.src_true = src_true;
        this.src_false = src_false;
        this.toString = function() {
            var a = Global.printer.auto;
            var destination = Extra.is.string(this.destination) ? a(this.destination) : this.destination.toString();
            var src_true = Extra.is.string(this.src_true) ? a(this.src_true) : this.src_true.toString();
            var src_false = Extra.is.string(this.src_false) ? a(this.src_false) : this.src_false.toString();

            var s = destination + ' = ' + this.condition + ' ? ';
            if (src_true.indexOf(' ') >= 0) {
                s += '(' + src_true + ') : ';
            } else {
                s += src_true + ' : ';
            }
            if (src_false.indexOf(' ') >= 0) {
                s += '(' + src_false + ')';
            } else {
                s += src_false;
            }
            return s;
        };
    };

    var _base = {
        /* COMMON */
        assign: function(destination, source) {
            return new _generic_assignment(destination, source);
        },
        cast: function(destination, source, cast) {
            return new _cast_register(destination, source, cast);
        },
        nop: function(asm) {
            return null;
        },
        /* JUMPS */
        goto: function(label_or_address) {
            return new _generic_goto(label_or_address);
        },
        call: function(function_name, function_arguments) {
            return new _generic_call(function_name, function_arguments);
        },
        return: function(value) {
            return new _generic_return(value);
        },
        break: function(value) {
            return new _generic_flow('break');
        },
        continue: function(value) {
            return new _generic_flow('continue');
        },
        /* BRANCHES */
        conditional_assign: function(destination, source_a, source_b, cond, src_true, src_false) {
            return new _inline_conditional_assign(destination, source_a, source_b, cond, src_true, src_false);
        },
        /* MATH */
        increase: function(destination, source) {
            if (source == '1') {
                return new _generic_inc_dec(destination, '++');
            }
            return new _generic_math(destination, destination, source, '+');
        },
        decrease: function(destination, source) {
            if (source == '1') {
                return new _generic_inc_dec(destination, '--');
            }
            return new _generic_math(destination, destination, source, '-');
        },
        add: function(destination, source_a, source_b) {
            if (destination == source_a && source_b == '1') {
                return new _generic_inc_dec(destination, '++');
            }
            return new _generic_math(destination, source_a, source_b, '+');
        },
        and: function(destination, source_a, source_b) {
            if (source_b == '0') {
                return new _generic_assignment(destination, '0');
            }
            return new _generic_math(destination, source_a, source_b, '&');
        },
        divide: function(destination, source_a, source_b) {
            return new _generic_math(destination, source_a, source_b, '/');
        },
        module: function(destination, source_a, source_b) {
            return new _generic_math(destination, source_a, source_b, '%');
        },
        multiply: function(destination, source_a, source_b) {
            return new _generic_math(destination, source_a, source_b, '*');
        },
        negate: function(destination, source) {
            return new _assign_with_operator(destination, source, '-');
        },
        not: function(destination, source) {
            return new _assign_with_operator(destination, source, '~');
        },
        subtract: function(destination, source_a, source_b) {
            if (destination == source_a && source_b == '1') {
                return new _generic_inc_dec(destination, '--');
            }
            return new _generic_math(destination, source_a, source_b, '-');
        },
        or: function(destination, source_a, source_b) {
            if (source_b == '0') {
                return new _generic_assignment(destination, source_a);
            }
            return new _generic_math(destination, source_a, source_b, '|');
        },
        xor: function(destination, source_a, source_b) {
            if (source_a == source_b) {
                return new _generic_assignment(destination, '0');
            }
            return new _generic_math(destination, source_a, source_b, '^');
        },
        shift_left: function(destination, source_a, source_b) {
            return new _generic_math(destination, source_a, source_b, '<<');
        },
        shift_right: function(destination, source_a, source_b) {
            return new _generic_math(destination, source_a, source_b, '>>');
        },
        rotate_left: function(destination, source_a, source_b, bits) {
            Global.context.addDependency(new CCalls.rotate_left.fcn(bits));
            return new _generic_rotate(destination, source_a, source_b, bits, true);
        },
        rotate_right: function(destination, source_a, source_b, bits) {
            Global.context.addDependency(new CCalls.rotate_right.fcn(bits));
            return new _generic_rotate(destination, source_a, source_b, bits, false);
        },
        swap_endian: function(value, returns, bits) {
            Global.context.addDependency(new CCalls.swap_endian.fcn(bits));
            return new _generic_assignment(returns, new _generic_call('SWAP' + bits, [value]));
        },
        bit_mask: function(destination, source_a, source_b) {
            Global.context.addDependency(new CCalls.bit_mask.fcn());
            return new _generic_assignment(destination, new _generic_call('BIT_MASK', [source_a, source_b]));
        },
        /* MEMORY */
        read_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? Variable.local(register.toString(), Extra.to.type(bits, is_signed)) : register;
            var ptr = (Extra.is.string(pointer) || Extra.is.number(pointer)) ? Variable.pointer(pointer.toString(), Extra.to.type(bits, is_signed)) : pointer;
            return new _generic_assignment(value, ptr);
        },
        write_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? Variable.local(register.toString(), Extra.to.type(bits, is_signed)) : register;
            var ptr = (Extra.is.string(pointer) || Extra.is.number(pointer)) ? Variable.pointer(pointer.toString(), Extra.to.type(bits, is_signed)) : pointer;
            return new _generic_assignment(ptr, value);
        },
        /* SPECIAL */
        composed: function(instructions) {
            return new function(composed) {
                this.composed = composed;
            }(instructions);
        },
        /* UNKNOWN */
        unknown: function(asm) {
            return new _generic_asm(asm);
        }
    };
    return _base;
})();