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
    const Variable = require('libdec/core/variable');
    const Extra = require('libdec/core/extra');
    const CCalls = require('libdec/db/c_calls');

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
            if (this.source_a == this.source_b) {
                return destination + ' ' + this.operation + '= ' + source_b;
            }
            return destination + ' = ' + source_a + ' ' + this.operation + ' ' + source_b;
        };
    };

    var _generic_call = function(function_name, arguments) {
        this.function_name = Extra.is.string(function_name) ? Extra.replace.call(function_name) : function_name;
        this.arguments = arguments || [];
        this.toString = function() {
            var fcn = this.function_name;
            if (Extra.is.string(fcn)) {
                fcn = Global.printer.theme.callname(fcn);
            }
            return fcn + ' (' + this.arguments.join(', ') + ')';
        };
    };

    var _genric_return = function(value) {
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
            r += Global.printer.auto(this.value);
            return r;
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
            return new _genric_return(value);
        },
        /* BRANCHES */

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
                return new _assignment(destination, '0');
            }
            return new _generic_math(destination, source_a, source_b, '&');
        },
        subtract: function(destination, source_a, source_b) {
            if (destination == source_a && source_b == '1') {
                return new _generic_inc_dec(destination, '--');
            }
            return new _generic_math(destination, source_a, source_b, '-');
        },
        xor: function(destination, source_a, source_b) {
            if (source_a == source_b) {
                return new _assignment(destination, '0');
            }
            return new _generic_math(destination, source_a, source_b, '^');
        },
        /*
        rotate_left: function(destination, source_a, source_b, bits) {
            return new _generic_rotate(destination, source_a, source_b, bits, true),
                new _dependency(_call_c.rotate_left.macros, [new _call_c.rotate_left.fcn(bits)])
            );
        },
        rotate_right: function(destination, source_a, source_b, bits) {
            return new _pseudocode(new _generic_rotate(destination, source_a, source_b, bits, false),
                new _dependency(_call_c.rotate_right.macros, [new _call_c.rotate_right.fcn(bits)])
            );
        },
        bit_mask: function(destination, source_a, source_b) {
            return new _pseudocode(new _common_bitmask(destination, source_a, source_b),
                new _dependency(_call_c.bit_mask.macros, [])
            );
        },
        */
        /* MEMORY */
        read_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? register : Variable.variable(register, Extra.to.type(bits, is_signed));
            var pointer = (Extra.is.string(pointer) || Extra.is.number(pointer)) ? pointer : Variable.memory(pointer, Extra.to.type(bits, is_signed));
            return new _generic_assignment(value, pointer);
        },
        write_memory: function(pointer, register, bits, is_signed) {
            var value = (Extra.is.string(register) || Extra.is.number(register)) ? register : Variable.variable(register, Extra.to.type(bits, is_signed));
            var pointer = (Extra.is.string(pointer) || Extra.is.number(pointer)) ? pointer : Variable.memory(pointer, Extra.to.type(bits, is_signed));
            return new _generic_assignment(pointer, value);
        },
        /* UNKNOWN */
        unknown: function(asm) {
            return new _generic_asm(asm);
        }
    };
    return _base;
})();