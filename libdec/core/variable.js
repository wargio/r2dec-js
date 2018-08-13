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
    var Extra = require('libdec/core/extra');
    var Condition = require('libdec/core/condition');

    var _internal_label_cnt = 0;
    var _internal_variable_cnt = 0;

    return {
        uniqueName: function(variable_name) {
            var n = _internal_variable_cnt++;
            return variable_name ? variable_name + n : "value_" + n;
        },
        newLabel: function(address) {
            var n = _internal_label_cnt++;
            return new function(n) {
                this.name = 'label_' + n;
                this.address = address;
                this.toString = function() {
                    return Global.printer.theme.labels(this.name);
                };
            }(n);
        },
        functionPointer: function(variable_name, bits, arguments_type) {
            return new function(name, type, args) {
                this.name = name;
                this.type = type;
                this.args = Extra.is.array(args) ? args.map(function(x) {
                    return x.toType()
                }).join(', ') : args;
                this.toType = function() {
                    var a = Extra.is.array(this.args) ? args.map(function(x) {
                        return x.toType()
                    }).join(', ') : this.args;
                    return t.types(this.type) + ' (*)(' + a + ')';
                };
                this.toString = function() {
                    var t = Global.printer.theme;
                    var a = Global.printer.auto;
                    return t.types(this.type) + ' (*' + a(this.name) + ')(' + this.args + ')';
                }
            }(variable_name, Extra.to.type(bits || 0), arguments_type || '');
        },
        pointer: function(variable_name, ctype_or_bits, is_signed) {
            var ctype = Extra.is.number(ctype_or_bits) ? Extra.to.type(ctype_or_bits, signed) : ctype_or_bits;
            return new function(name, type) {
                this.name = name;
                this.type = type;
                this.toType = function() {
                    return t.types(this.type) + '*';
                };
                this.toString = function(define) {
                    var t = Global.printer.theme;
                    var a = Global.printer.auto;
                    if (define) {
                        return t.types(this.type) + '* ' + this.name;
                    }
                    var c = '*(';
                    if (Global.evars.honor.casts) {
                        c += '(' + t.types(this.type) + '*) ';
                    }
                    return c + a(this.name) + ')';
                }
            }(variable_name, ctype);
        },
        local: function(variable_name, ctype_or_bits, signed) {
            var ctype = Extra.is.number(ctype_or_bits) ? Extra.to.type(ctype_or_bits, signed) : ctype_or_bits;
            return new function(name, type) {
                this.name = name;
                this.type = type;
                this.toType = function() {
                    return t.types(this.type);
                };
                this.toString = function(define) {
                    var a = Global.printer.auto;
                    if (define) {
                        var t = Global.printer.theme;
                        return t.types(this.type) + ' ' + a(this.name);
                    }
                    return a(this.name);
                }
            }(variable_name, ctype);
        },
        string: function(string_content) {
            return new function(content) {
                this.content = content;
                this.toType = function() {
                    return t.types('char') + '*';
                };
                this.toString = function(define) {
                    var t = Global.printer.theme;
                    if (define) {
                        return null;
                    }
                    return t.text(this.content);
                }
            }(string_content);
        },
        macro: function(string_content) {
            return new function(content) {
                this.content = content;
                this.toType = function() {
                    return '';
                };
                this.toString = function(define) {
                    var t = Global.printer.theme;
                    if (define) {
                        return null;
                    }
                    return t.macro(this.content);
                }
            }(string_content);
        }
    };
})();