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
    var _print_locals = function(locals) {
        for (var i = 0; i < locals.length; i++) {
            console.log(Global.context.identfy() + locals[i].print() + ';');
        }
    };

    return {
        brace: function(address) {
        	this.isTail = true;
            this.address = address;
            this.print = function() {
                Global.context.identOut();
                console.log(Global.context.identfy() + '}');
            }
        },
        routine: function(address, extra) {
        	this.isHead = true;
            this.address = address;
            this.extra = extra;
            this.print = function() {
                var e = this.extra;
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                var asmname = '; ' + e.name + ' ()';
                console.log(Global.context.identfy(asmname.length, t.comment(asmname)) + t.types(e.returns), t.callname(e.name), '(' + e.args.join(', ') + ') {');
                Global.context.identIn();
                _print_locals(e.locals);
            }
        },
        if: function(address, condition, locals) {
        	this.isHead = true;
            this.address = address;
            this.condition = condition;
            this.locals = locals;
            this.print = function() {
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                console.log(Global.context.identfy() + t.flow('if') + ' (' + this.condition.print() + ') {');
                Global.context.identIn();
                _print_locals(locals);
            }
        },
        else: function(address, locals) {
        	this.isHead = true;
            this.address = address;
            this.locals = locals;
            this.print = function() {
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                console.log(Global.context.identfy() + '} ' + t.flow('else') + ' {');
                Global.context.identIn();
                _print_locals(locals);
            }
        },
        do: function(address, locals) {
        	this.isHead = true;
            this.address = address;
            this.locals = locals;
            this.print = function() {
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                console.log(Global.context.identfy() + t.flow('do') + ' {');
                Global.context.identIn();
                _print_locals(locals);
            }
        },
        while: function(address, condition, locals) {
        	this.isHead = true;
            this.address = address;
            this.condition = condition;
            this.locals = locals;
            this.print = function() {
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                console.log(Global.context.identfy() + t.flow('while') + ' (' + this.condition.print() + ') {');
                Global.context.identIn();
                _print_locals(locals);
            }
        },
        whileEnd: function(address, condition) {
        	this.isTail = true;
            this.address = address;
            this.condition = condition;
            this.print = function() {
                Global.context.identOut();
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                console.log(Global.context.identfy() + '} ' + t.flow('while') + ' (' + this.condition.print() + ');');
            }
        }
    }
})();