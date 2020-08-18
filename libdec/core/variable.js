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
    const Long = require('libdec/long');
    const Extra = require('libdec/core/extra');
    const Objects = require('libdec/core/objects');
    const Anno = require('libdec/annotation');

    var _internal_label_cnt = 0;
    var _internal_variable_cnt = 0;

    // ---------- inner functions ----------

    var parenthesize = function(s) {
        return ['(', s, ')'].join('');
    };

    var autoParen = function(s) {
        return (s.indexOf(' ') > (-1) ? parenthesize(s) : s);
    };

    // ---------- inner objects ----------

    var _label = function(name, address) {
        this.name = name;
        this.address = address;

        this.toString = function() {
            return Global.printer.theme.labels(this.name);
        };

        this.toAnnotation = function(location) {
            return Anno.offset(this.name, location);
        };
    };

    var _func_ptr = function(name, type, args) {
        this.name = name;
        this.type = type;
        this.args = args.map(function(x) {
            return x.toType ? x.toType() : ('uint' + Global.evars.archbits + '_t');
        });

        this.toType = function() {
            return Global.printer.theme.types(this.type) + ' (*)(' + this.args.join(', ') + ')';
        };

        this.toString = function() {
            return Global.printer.theme.types(this.type) + ' (*' + Global.printer.auto(this.name) + ')(' + this.args.join(', ') + ')';
        };

        this.toAnnotation = function(location) {
            var a = [
                Anno.offset('*(', location),
                Anno.funcname(this.name),
                Anno.offset(')(', location),
            ];
            this.args.forEach(function(x) {
                if (typeof(x) === 'string') {
                    a.push(Anno.localvar(x, location));
                } else {
                    a.push(x.toAnnotation(location));
                }
            });
            a.push(Anno.offset(')', location));
            return a;
        };
    };

    var _ptr = function(name, type, pointer) {
        this.name = name;
        this.type = type;
        this.pointer = pointer;

        this.toType = function() {
            return Global.printer.theme.types(this.type) + '*';
        };

        this.toString = function(define) {
            if (define) {
                var suffix = '';
                if (this.pointer) {
                    suffix = ' = ' + Global.printer.auto(this.pointer);
                }
                return Global.printer.theme.types(this.type) + '* ' + this.name + suffix;
            }

            var c = '*(';
            if (Global.evars.honor.casts) {
                c += '(' + Global.printer.theme.types(this.type) + '*) ';
            }

            return c + Global.printer.auto(autoParen(this.name)) + ')';
        };

        this.toAnnotation = function(location) {
            var c = '*(' + autoParen(this.name) + ')';
            return Anno.offset(c, location);
        };
    };

    var _local = function(name, type) {
        this.name = name;
        this.type = type;

        this.toType = function() {
            return Global.printer.theme.types(this.type);
        };

        this.toString = function(define) {
            if (define) {
                return Global.printer.theme.types(this.type) + ' ' + Global.printer.auto(this.name);
            }

            return Global.printer.auto(this.name);
        };

        this.toAnnotation = function(location) {
            return Anno.localvar(this.content, location);
        };
    };

    var _string = function(content) {
        this.content = content;
        if (!this.content.startsWith('"') && !this.content.startsWith("'")) {
            this.content = '"' + this.content;
        }
        if (!this.content.endsWith('"') && !this.content.endsWith("'")) {
            this.content += '"';
        }
        this.content = this.content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');

        this.toType = function() {
            return Global.printer.theme.types('char') + '*';
        };

        this.toString = function(define) {
            return define ? null : Global.printer.theme.text(this.content);
        };

        this.toAnnotation = function(location) {
            return Anno.offset(this.content, location);
        };
    };

    var _number = function(content) {
        this.content = Long.isLong(content) ? ('0x' + content.toString(16)) : content;

        this.toType = function() {
            return '';
        };

        this.toString = function(define) {
            return define ? null : Global.printer.theme.integers(this.content);
        };

        this.toAnnotation = function(location) {
            return Anno.constvar(this.content, location);
        };
    };

    var _macro = function(content) {
        this.content = content;

        this.toType = function() {
            return '';
        };

        this.toString = function(define) {
            return define ? null : Global.printer.theme.macro(this.content);
        };

        this.toAnnotation = function(location) {
            return Anno.localvar(this.content, location);
        };
    };

    // ------------------------------

    return {
        uniqueName: function(variable_name) {
            var n = _internal_variable_cnt++;

            return [variable_name ? variable_name : "value", n].join('_');
        },
        newLabel: function(address) {
            var n = _internal_label_cnt++;

            return new _label(['label', n].join('_'), address);
        },
        functionPointer: function(variable_name, bits, arguments_type) {
            return new _func_ptr(variable_name, Extra.to.type(bits || 0), arguments_type || []);
        },
        globalPointer: function(variable_name, ctype_or_bits, is_signed, pointer) {
            var ctype = Extra.is.number(ctype_or_bits) ? Extra.to.type(ctype_or_bits, is_signed) : ctype_or_bits;

            return new _ptr(variable_name, ctype, pointer);
        },
        pointer: function(variable_name, ctype_or_bits, is_signed) {
            var ctype = Extra.is.number(ctype_or_bits) ? Extra.to.type(ctype_or_bits, is_signed) : ctype_or_bits;

            return new _ptr(variable_name, ctype);
        },
        local: function(variable_name, ctype_or_bits, is_signed) {
            var ctype = Extra.is.number(ctype_or_bits) ? Extra.to.type(ctype_or_bits, is_signed) : ctype_or_bits;
            return new _local(variable_name, ctype);
        },
        string: function(string_content) {
            return new _string(string_content);
        },
        number: function(number) {
            return new _number(number);
        },
        macro: function(string_content) {
            return new _macro(string_content);
        },
        object: function(type, args) {
            return Objects.object(type, args, false);
        },
        newobject: function(type, args) {
            return Objects.object(type, args, true);
        },
        newarray: function(type, size, init) {
            return Objects.array(type, size, true, null, init);
        },
    };
});