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

    const Extra = require('libdec/core/extra');
    const Variable = require('libdec/core/variable');
    const Condition = require('libdec/core/condition');

    /**
     * Wraps a string with parenthesis.
     * @param {string} s A string to wrap
     * @param {boolean} always Whether to wrap only complex strings or always
     * @returns {string} `s` wrapped by parenthesis
     */
    var autoParen = function(s, always) {
        return (always || (s.indexOf(' ') > (-1)) ? ['(', s, ')'].join('') : s);
    };

    var autoString = function(v) {
        return Extra.is.string(v) ? Global.printer.auto(v) : v.toString();
    };

    var _generic_asm = function(asm) {
        this.asm = asm;

        this.toString = function() {
            return Global.printer.theme.callname('__asm') + ' (' + autoString(this.asm) + ')';
        };
    };

    var _generic_assignment = function(destination, source) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;

        this.toString = function() {
            if (this.destination == this.source) {
                return '';
            }

            var source = autoString(this.source);

            if (source instanceof Variable.functionPointer) {
                source = autoParen(source, true);
            }

            return [autoString(this.destination), '=', source].join(' ');
        };
    };

    var _assign_with_operator = function(destination, source, operator) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;
        this.operator = operator;

        this.toString = function() {
            return [autoString(this.destination), '=',
                this.operator + autoString(this.source)
            ].join(' ');
        };
    };

    var _cast_register = function(destination, source, cast) {
        this.destination = Extra.is.number(destination) ? ('' + destination) : destination;
        this.source = Extra.is.number(source) ? ('' + source) : source;
        this.cast = cast;

        this.toString = function() {
            return [autoString(this.destination), '=',
                autoParen(Global.printer.theme.types(this.cast), true),
                autoString(this.source)
            ].join(' ');
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
            var destination = autoString(this.destination);
            var source_a = autoString(this.source_a);
            var source_b = autoString(this.source_b);

            if (this.destination == this.source_a) {
                return [destination, this.operation + '=', source_b].join(' ');
            }

            return [destination, '=', source_a, this.operation, source_b].join(' ');
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

            return [fcn, autoParen(this.arguments.join(', '), true)].join(' ');
        };
    };

    var _generic_rotate = function(destination, source_a, rotation, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.destination = destination;
        this.source_a = source_a;
        this.rotation = rotation;

        this.toString = function() {
            var args = [autoString(this.source_a), autoString(this.rotation)];

            return [autoString(this.destination), '=',
                Global.printer.theme.callname(this.call),
                autoParen(args.join(', '), true)
            ].join(' ');
        };
    };

    var _generic_return = function(value) {
        this.value = value;

        this.toString = function(options) {
            var value = '';

            if (this.value) {
                value = ' ' + autoString(this.value);
            }

            return Global.printer.theme.flow('return') + value;
        };
    };

    var _generic_goto = function(label_or_address) {
        this.value = label_or_address;

        this.toString = function(options) {
            return [Global.printer.theme.flow('goto'), autoString(this.value)].join(' ');
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
            return [autoString(this.destination), '=', autoParen(this.condition),
                '?', autoParen(autoString(this.src_true)),
                ':', autoParen(autoString(this.src_false))
            ].join(' ');
        };
    };

    var _inline_conditional_math = function(destination, source_a, source_b, cond, math_operand_a, math_operand_b, src_false, operation) {
        this.condition = new Condition.convert(source_a, source_b, cond, false);
        this.destination = destination;
        this.math_operand_a = math_operand_a;
        this.math_operand_b = math_operand_b;
        this.src_false = src_false;
        this.operation = operation;

        this.toString = function() {
            var exp_true = [autoString(this.math_operand_a), this.operation, autoString(this.math_operand_b)].join(' ');
            
            return [autoString(this.destination), '=', autoParen(this.condition),
                '?', autoParen(exp_true, true),
                ':', autoParen( autoString(this.src_false))
            ].join(' ');
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
        conditional_math: function(destination, source_a, source_b, cond, math_operand_a, math_operand_b, src_false, operation) {
            return new _inline_conditional_math(destination, source_a, source_b, cond, math_operand_a, math_operand_b, src_false, operation);
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
            if (destination == source_a && source_b == '0') {
                return null;
            } else if (destination == source_a && source_b == '1') {
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
        macro: function(macro, macro_rule) {
            Global.context.addMacro(macro_rule);

            return new function(macro) {
                this.macro = macro;

                this.toString = function() {
                    return Global.printer.theme.macro(this.macro);
                };
            }(macro);
        },
        special: function(data) {
            return new function(data) {
                this.data = data;

                this.toString = function() {
                    return Global.printer.auto(this.data);
                };
            }(data);
        },
        /* UNKNOWN */
        unknown: function(asm) {
            return new _generic_asm(asm);
        }
    };
    return _base;
})();