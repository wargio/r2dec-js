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
            return variable_name ? variable_name + n : "value" + n;
        },
        newLabel: function() {
            var n = _internal_label_cnt++;
            return { id: n, name: 'label_' + n };
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
                    return t.types(this.type) + ' (*) (' + a + ')';
                };
                this.toString = function() {
                    var t = Global.printer.theme;
                    return t.types(this.type) + ' (*' + this.name + ' ) (' + this.args + ')';
                }
            }(variable_name, Extra.to.type(bits || 0), arguments_type || '');
        },
        pointer: function(variable_name, type) {
            return new function(name, type) {
                this.name = name;
                this.type = type;
                this.toType = function() {
                    return t.types(this.type) + '*';
                };
                this.toString = function(define) {
                    var t = Global.printer.theme;
                    if (define) {
                        return t.types(this.type) + '* ' + this.name;
                    }
                    var c = '*(';
                    if (Global.evars.honor.casts) {
                        c += '(' + t.types(this.type) + '*) ';
                    }
                    return c + this.name + ')';
                }
            }(variable_name, type);
        },
        local: function(variable_name, type, signed) {
            return new function(name, type) {
                this.name = name;
                this.type = type;
                this.toType = function() {
                    return t.types(this.type);
                };
                this.toString = function(define) {
                    if (define) {
                        var t = Global.printer.theme;
                        return t.types(this.type) + ' ' + this.name;
                    }
                    return this.name;
                }
            }(variable_name, type);
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
        }
    };
})();