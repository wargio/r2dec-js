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
    const Extra = require('libdec/core/extra');

    var __debug = false;

    var _print_locals = function(locals, spaced) {
        if (Global.evars.honor.blocks) {
            return;
        }
        var a = Global.printer.auto;
        for (var i = 0; i < locals.length; i++) {
            var local = Extra.is.string(locals[i]) ? a(locals[i]) : locals[i].toString(true);
            console.log(Global.context.identfy() + local + ';');
        }
        if (spaced && locals.length > 0) {
            console.log(Global.context.identfy());
        }
    };

    var _print_block_data = function(block) {
        if (Global.evars.honor.blocks) {
            var t = Global.printer.theme;
            var ident = Global.context.identfy();
            var addr = block.address.toString(16);
            console.log(ident + t.comment('/* address 0x' + addr + ' */'));
        }
    };

    return {
        brace: function(address) {
            this.address = address;
            this.toString = function() {
                return '}' + (__debug ? Global.printer.theme.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                Global.context.identOut();
                console.log(Global.context.identfy() + this.toString());
            };
        },
        routine: function(address, extra) {
            this.address = address;
            this.extra = extra;
            this.toString = function() {
                var e = this.extra;
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                return t.types(e.returns) + ' ' + t.callname(Extra.replace.call(e.name)) + ' (' + e.args.map(function(x) {
                    return Extra.is.string(x) ? a(x) : a.toString();
                }).join(', ') + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                var e = this.extra;
                var t = Global.printer.theme;
                _print_locals(e.globals, true);
                var asmname = '; (fcn) ' + e.name + ' ()';
                var ident = Global.context.identfy(asmname.length, t.comment(asmname));
                console.log(ident + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(e.locals);
            };
        },
        if: function(address, condition, locals) {
            this.address = address;
            this.condition = condition;
            this.locals = locals || [];
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('if') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                console.log(Global.context.identfy() + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals);
            };
        },
        else: function(address, locals) {
            this.isElse = true;
            this.address = address;
            this.locals = locals || [];
            this.toString = function() {
                var t = Global.printer.theme;
                return '} ' + t.flow('else') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                Global.context.identOut();
                console.log(Global.context.identfy() + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals);
            };
        },
        do: function(address, locals) {
            this.address = address;
            this.locals = locals || [];
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('do') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                console.log(Global.context.identfy() + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals);
            };
        },
        while: function(address, condition, locals) {
            this.address = address;
            this.condition = condition;
            this.locals = locals || [];
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('while') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                console.log(Global.context.identfy() + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals);
            };
        },
        whileEnd: function(address, condition) {
            this.address = address;
            this.condition = condition;
            this.toString = function() {
                var t = Global.printer.theme;
                return '} ' + t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                Global.context.identOut();
                console.log(Global.context.identfy() + this.toString());
            };
        },
        whileInline: function(address, condition) {
            this.address = address;
            this.condition = condition;
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                _print_block_data(this);
                console.log(Global.context.identfy() + this.toString());
            };
        }
    };
})();