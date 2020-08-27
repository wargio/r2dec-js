/* 
 * Copyright (C) 2018 deroad, elicn
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
    const Cpp = require('libdec/db/cpp');
    const CCalls = require('libdec/db/c_calls');
    const Anno = require('libdec/annotation');
    const Extra = require('libdec/core/extra');
    const Variable = require('libdec/core/variable');
    const Long = require('libdec/long');
    const Condition = require('libdec/core/condition');

    /**
     * Wraps a string with parenthesis.
     * @param {string} s A string to wrap
     * @returns {string} `s` wrapped by parenthesis
     */
    var parenthesize = function(s) {
        return ['(', s, ')'].join('');
    };

    /**
     * Wraps a string with parenthesis only if it is complex.
     * @param {string} s A string to wrap
     * @returns {string} `s` wrapped by parenthesis if `s` is a complex string, and `s` otherwise
     */
    var autoParen = function(s) {
        return (s.indexOf(' ') > (-1) ? parenthesize(s) : s);
    };

    var autoString = function(v) {
        v = v || "";
        return Extra.is.string(v) ? Global.printer.auto(v) : v.toString();
    };

    var _generic_asm = function(asm) {
        this.asm = asm;

        this.toAnnotation = function(location) {
            return [
                Anno.keyword('__asm'),
                Anno.offset(' ("' + this.asm + '")', location)
            ];
        };

        this.toString = function() {
            return Global.printer.theme.callname('__asm') + ' (' + Global.printer.theme.text('"' + this.asm + '"') + ')';
        };
    };

    /**
     * Unary expression
     * @constructor
     * @inner
     */
    var _uexpr = function(operator, operand) {
        this.operator = operator;

        this.operands = [
            autoString(operand)
        ];

        this.toAnnotation = function(location) {
            return Anno.offset(this.toString(), location);
        };

        /** @returns {!string} */
        this.toString = function() {
            return [
                this.operator,
                this.operands[0]
            ].join('');
        };
    };

    /**
     * Unary expression with postfix notation
     * @constructor
     * @inner
     */
    var _uexpr_pf = function(operator, operand) {
        _uexpr.call(this, operator, [operand]);

        this.toAnnotation = function(location) {
            return Anno.auto(this.toString(), location);
        };

        /** @returns {!string} */
        this.toString = function() {
            return [
                this.operands[0],
                this.operator,
            ].join('');
        };
    };

    _uexpr_pf.prototype = Object.create(_uexpr.prototype);

    /**
     * Binary expression
     * @constructor
     * @inner
     */
    var _bexpr = function(operator, lhand, rhand) {
        this.operator = operator;

        this.operands = [
            autoString(lhand),
            autoString(rhand)
        ];

        this.toAnnotation = function(location) {
            return Anno.auto(this.toString(), location);
        };

        /** @returns {!string} */
        this.toString = function() {
            return [
                this.operands[0],
                this.operator,
                this.operands[1]
            ].join(' ');
        };
    };

    /**
     * Ternary expression
     * @constructor
     * @inner
     */
    var _texpr = function(operator1, operator2, operand1, operand2, operand3) {
        this.operators = [operator1, operator2];

        this.operands = [
            autoParen(autoString(operand1)),
            autoParen(autoString(operand2)),
            autoParen(autoString(operand3))
        ];

        this.toAnnotation = function(location) {
            return Anno.auto(this.toString(), location);
        };

        /** @returns {!string} */
        this.toString = function() {
            return [
                this.operands[0],
                this.operators[0],
                this.operands[1],
                this.operators[1],
                this.operands[2]
            ].join(' ');
        };
    };

    var _assign = function(lhand, rhand) {
        if (lhand == rhand) {
            return '';
        }

        if ((rhand instanceof _bexpr) && (autoString(lhand) == rhand.operands[0])) {
            return new _bexpr(rhand.operator + '=', lhand, rhand.operands[1]);
        }

        if (rhand instanceof Variable.functionPointer) {
            rhand = parenthesize(rhand);
        }

        return new _bexpr('=', lhand, rhand);
    };

    var _cast = function(source, type) {
        return new _uexpr(parenthesize(Global.printer.theme.types(type)) + ' ', source);
    };

    var _generic_call = function(function_name, args) {
        this.function_name = Extra.is.string(function_name) ? Cpp(Extra.replace.call(function_name)) : function_name;
        this.callargs = args || [];

        this.toAnnotation = function(location) {
            var a = [
                Anno.funcname(this.function_name, location),
                Anno.offset(' (', location)
            ];
            Array.prototype.push.apply(a, Anno.auto(this.callargs.join(', ') + ')', location));
            return a;
        };

        this.toString = function() {
            var fname = this.function_name;

            if (Extra.is.string(fname)) {
                fname = Global.printer.theme.callname(fname);
            }

            return [fname, parenthesize(this.callargs.join(', '))].join(' ');
        };
    };

    var _generic_method_call = function(object_this, function_name, args, method_sep, prefix, postfix) {
        this.object_this = Extra.is.string(object_this) ? Cpp(object_this) : object_this;
        this.function_name = Extra.is.string(function_name) ? Cpp(function_name) : function_name;
        this.callargs = args || [];
        this.method_sep = method_sep;
        this.prefix = prefix || "";
        this.postfix = postfix || "";

        this.toAnnotation = function(location) {
            var a = Anno.auto(this.prefix + this.object_this + this.method_sep, location);
            a.push(Anno.funcname(this.function_name.toString(), location));
            Array.prototype.push.apply(a, Anno.auto('(' + this.callargs.join(', ') + ') ' + this.postfix, location));
            return a;
        };

        this.toString = function() {
            var fname = this.function_name;

            if (Extra.is.string(fname)) {
                fname = Global.printer.theme.callname(fname);
            }

            return this.prefix + this.object_this + this.method_sep + [fname, parenthesize(this.callargs.join(', '))].join(' ') + this.postfix;
        };
    };

    var _generic_rotate = function(destination, source_a, rotation, bits, is_left) {
        this.call = 'rotate_' + (is_left ? 'left' : 'right') + bits;
        this.destination = destination;
        this.source_a = source_a;
        this.rotation = Extra.is.number(rotation) ? ("0x" + rotation.toString(16)) : rotation;

        this.toAnnotation = function(location) {
            var a = [
                Anno.offset(autoString(this.destination) + ' = ', location),
                Anno.funcname(this.call, location),
                Anno.offset(' (', location),
            ];
            var args = [autoString(this.source_a), autoString(this.rotation)].join(', ');
            Array.prototype.push.apply(a, Anno.auto(args, location));
            return a;
        };

        this.toString = function() {
            var args = [autoString(this.source_a), autoString(this.rotation)];

            return [autoString(this.destination), '=',
                Global.printer.theme.callname(this.call),
                parenthesize(args.join(', '))
            ].join(' ');
        };
    };

    var _generic_return = function(value) {
        this.value = value;

        this.toAnnotation = function(location) {
            if (!this.value) {
                return [Anno.keyword('return', location)];
            }
            var a = this.value.toAnnotation ? this.value.toAnnotation(location) : Anno.auto(this.value, location);
            if (!Array.isArray(a)) {
                a = [a];
            }
            return [
                Anno.keyword('return', location),
                Anno.offset(' ', location)
            ].concat(a);
        };

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

        this.toAnnotation = function(location) {
            var a = this.value.toAnnotation ? this.value.toAnnotation(location) : Anno.auto(this.value, location);
            if (!Array.isArray(a)) {
                a = [a];
            }
            return [
                Anno.keyword('goto', location),
                Anno.offset(' ', location)
            ].concat(a);
        };

        this.toString = function(options) {
            return [Global.printer.theme.flow('goto'), autoString(this.value)].join(' ');
        };
    };

    var _generic_flow = function(name) {
        this.name = name;

        this.toAnnotation = function(location) {
            return Anno.keyword(this.name, location);
        };

        this.toString = function(options) {
            return Global.printer.theme.flow(this.name);
        };
    };

    var _assign_object_field = function(destination, object, field, method_sep, is_from) {
        this.destination = destination;
        this.object = object;
        this.field = field;
        this.method_sep = method_sep;
        this.is_from = is_from;

        this.toAnnotation = function(location) {
            return Anno.auto(this.toString(), location);
        };

        this.toString = function(options) {
            if (this.is_from) {
                return [
                    this.object + this.method_sep + this.field,
                    '=',
                    this.destination
                ].join(' ');
            }
            return [
                this.destination,
                '=',
                this.object + this.method_sep + this.field
            ].join(' ');
        };
    };

    var _assign_array_at = function(destination, source, index, is_from) {
        this.destination = destination;
        this.source = source;
        this.index = index;
        this.is_from = is_from;

        this.toAnnotation = function(location) {
            return Anno.auto(this.toString(), location);
        };

        this.toString = function(options) {
            if (this.is_from) {
                return [
                    this.destination,
                    '=',
                    this.source,
                    '[' + this.index + ']'
                ].join(' ');
            }
            return [
                this.destination,
                '[' + this.index + ']',
                '=',
                this.source
            ].join(' ');
        };
    };

    var _generic_throw = function(value) {
        this.value = value;

        this.toAnnotation = function(location) {
            if (!this.value) {
                return [Anno.keyword('throw', location)];
            }
            return [
                Anno.keyword('throw', location),
                Anno.offset(' ', location)
            ].concat(Anno.auto(autoString(this.value), location));
        };

        this.toString = function(options) {
            var value = '';

            if (this.value) {
                value = ' ' + autoString(this.value);
            }

            return Global.printer.theme.flow('throw') + value;
        };
    };

    var _generic_objc_call = function(object_this, function_name, function_arguments) {
        this.object_this = object_this;
        this.function_name = function_name;
        this.callargs = function_arguments || [];

        this.toAnnotation = function(location) {
            return [
                Anno.offset('[', location),
                Anno.keyword(this.object_this, location),
                Anno.funcname(this.function_name, location)
            ].concat(Anno.auto(this.callargs.join(' ') + ']', location));
        };

        this.toString = function() {
            var fname = this.object_this;
            if (Extra.is.string(object_this)) {
                fname = Global.printer.theme.callname(object_this);
            }

            return "[" + [fname, this.function_name].concat(this.callargs).join(' ') + "]";
        };
    };

    return {
        /* COMMON */
        assign: _assign,
        cast: function(destination, source, type) {
            return _assign(destination, new _cast(source, type));
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
            var condition = new Condition.convert(source_a, source_b, cond, false);

            return _assign(destination, new _texpr('?', ':', condition.toString(), src_true, src_false));
        },
        conditional_math: function(destination, source_a, source_b, cond, math_operand_a, math_operand_b, src_false, operation) {
            var condition = new Condition.convert(source_a, source_b, cond, false);
            var src_true = new _bexpr(operation, math_operand_a, math_operand_b);

            return _assign(destination, new _texpr('?', ':', condition.toString(), src_true, src_false));
        },
        /* MATH */
        increase: function(destination, source) {
            if (source == '1') {
                return new _uexpr_pf('++', destination);
            }

            return _assign(destination, new _bexpr('+', destination, source));
        },
        decrease: function(destination, source) {
            if (source == '1') {
                return new _uexpr_pf('--', destination);
            }

            return _assign(destination, new _bexpr('-', destination, source));
        },
        add: function(destination, source_a, source_b) {
            if ((destination == source_a) && (source_b == '1')) {
                return new _uexpr_pf('++', destination);
            }

            return _assign(destination, new _bexpr('+', source_a, source_b));
        },
        and: function(destination, source_a, source_b) {
            if (source_b == '0') {
                return _assign(destination, '0');
            }

            return _assign(destination, new _bexpr('&', source_a, source_b));
        },
        divide: function(destination, source_a, source_b) {
            return _assign(destination, new _bexpr('/', source_a, source_b));
        },
        module: function(destination, source_a, source_b) {
            return _assign(destination, new _bexpr('%', source_a, source_b));
        },
        multiply: function(destination, source_a, source_b) {
            return _assign(destination, new _bexpr('*', source_a, source_b));
        },
        negate: function(destination, source) {
            return _assign(destination, new _uexpr('-', source));
        },
        not: function(destination, source) {
            return _assign(destination, new _uexpr('~', source));
        },
        subtract: function(destination, source_a, source_b) {
            if ((destination == source_a) && (source_b == '0')) {
                return null;
            } else if (destination == source_a && source_b == '1') {
                return new _uexpr_pf('--', destination);
            }

            return _assign(destination, new _bexpr('-', source_a, source_b));
        },
        or: function(destination, source_a, source_b) {
            if (source_b == '0') {
                return _assign(destination, source_a);
            }

            return _assign(destination, new _bexpr('|', source_a, source_b));
        },
        xor: function(destination, source_a, source_b) {
            if (source_a == source_b) {
                return _assign(destination, '0');
            }

            return _assign(destination, new _bexpr('^', source_a, source_b));
        },
        shift_left: function(destination, source_a, source_b) {
            return _assign(destination, new _bexpr('<<', source_a, source_b));
        },
        shift_right: function(destination, source_a, source_b) {
            return _assign(destination, new _bexpr('>>', source_a, source_b));
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

            return _assign(returns, new _generic_call('SWAP' + bits, [value]));
        },
        bit_mask: function(destination, source_a, source_b) {
            Global.context.addDependency(new CCalls.bit_mask.fcn());

            return _assign(destination, new _generic_call('BIT_MASK', [source_a, source_b]));
        },
        /* MEMORY */
        read_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? Variable.local(register.toString(), Extra.to.type(bits, is_signed)) : register;
            var ptr = (Extra.is.number(pointer) || Long.isLong(pointer)) ? Variable.pointer('0x' + pointer.toString(16), Extra.to.type(bits, is_signed)) : pointer;
            if (Extra.is.string(ptr)) {
                ptr = Variable.pointer(pointer, Extra.to.type(bits, is_signed));
            }
            return _assign(value, ptr);
        },
        write_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? Variable.local(register.toString(), Extra.to.type(bits, is_signed)) : register;
            var ptr = (Extra.is.number(pointer) || Long.isLong(pointer)) ? Variable.pointer('0x' + pointer.toString(16), Extra.to.type(bits, is_signed)) : pointer;
            if (Extra.is.string(ptr)) {
                ptr = Variable.pointer(pointer, Extra.to.type(bits, is_signed));
            }
            return _assign(ptr, value);
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
        /* Object based langs */
        method_call: function(object_this, method_separator, function_name, function_arguments, prefix, postfix) {
            return new _generic_method_call(object_this, function_name, function_arguments, method_separator, prefix, postfix);
        },
        objc_call: function(object_this, function_name, function_arguments) {
            return new _generic_objc_call(object_this, function_name, function_arguments);
        },
        /* Object based langs */
        assign_to_object_field: function(destination, object, method_separator, field) {
            return new _assign_object_field(destination, object, field, method_separator, false);
        },
        assign_from_object_field: function(destination, object, method_separator, field) {
            return new _assign_object_field(destination, object, field, method_separator, true);
        },
        assign_to_array: function(destination, source, index) {
            return new _assign_array_at(destination, source, index, false);
        },
        assign_from_array: function(destination, source, index) {
            return new _assign_array_at(destination, source, index, true);
        },
        throw: function(value) {
            return new _generic_throw(value);
        },
        /* UNKNOWN */
        unknown: function(asm) {
            return new _generic_asm(asm);
        }
    };
});