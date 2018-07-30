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
            console.log(h(context.ident) + locals[i].print() + ';');
        }
    };

    return {
        brace: function(address) {
        	this.isTail = true;
            this.address = address;
            this.print = function() {
                context.identOut();
                console.log(context.printer.html(context.ident) + '}');
            }
        },
        routine: function(address, extra) {
        	this.isHead = true;
            this.address = address;
            this.extra = extra;
            this.print = function() {
                var e = this.extra;
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + t.types(e.returns), t.callname(e.name), '(' + e.args.join(', ') + ') {');
                context.identIn();
                _print_locals(e.locals);
            }
        },
        if: function(address, condition, locals) {
        	this.isHead = true;
            this.address = address;
            this.condition = condition;
            this.locals = locals;
            this.print = function() {
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + t.flow('if') + ' (' + this.condition.print() + ') {');
                context.identIn();
                _print_locals(locals);
            }
        },
        else: function(address, locals) {
        	this.isHead = true;
            this.address = address;
            this.locals = locals;
            this.print = function() {
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + '} ' + t.flow('else') + ' {');
                context.identIn();
                _print_locals(locals);
            }
        },
        do: function(address, locals) {
        	this.isHead = true;
            this.address = address;
            this.locals = locals;
            this.print = function() {
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + t.flow('do') + ' {');
                context.identIn();
                _print_locals(locals);
            }
        },
        while: function(address, condition, locals) {
        	this.isHead = true;
            this.address = address;
            this.condition = condition;
            this.locals = locals;
            this.print = function() {
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + t.flow('while') + ' (' + this.condition.print() + ') {');
                context.identIn();
                _print_locals(locals);
            }
        },
        whileEnd: function(address, condition) {
        	this.isTail = true;
            this.address = address;
            this.condition = condition;
            this.print = function() {
                context.identOut();
                var h = context.printer.html;
                var t = context.printer.theme;
                var a = context.printer.auto;
                console.log(h(context.ident) + '} ' + t.flow('while') + ' (' + this.condition.print() + ');');
            }
        }
    }
})();