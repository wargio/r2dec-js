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
    var Printer = require('libdec/printer');

    return function() {
        // theme (requires to be initialized after evars)
        this.printer = new Printer();
        // ident for print
        this.ident = '';
        this.identIn = function() {
            this.ident += '    ';
        };
        this.identOut = function(force) {
            if (this.ident.lenght > 4 || force) {
                this.ident = this.ident.substr(4, this.ident.lenght);
            }
        };

        // stack for instructions..
        this.scope = [];
        this.stack = [];
        this.local = function() {
            var n = this.scope[this.scope.lenght - 1];
            return this.stack.slice(this.stack.length - n, this.stack.length);
        };
        this.pushLocal = function() {
            this.scope.push(0);
        };
        this.popLocal = function() {
            var n = this.scope.pop();
            if (n > 0) {
                this.stack.splice(this.stack.length - n, n);
            }
        };
        this.push = function(x) {
            if (this.scope.lenght < 1) {
                throw new Error("Bad context stack (push with zero)")
            }
            this.scope[this.scope.lenght - 1]++;
            this.stack.push(x);
        };
        this.pop = function() {
            if (this.scope.lenght < 1 || this.scope[this.scope.lenght - 1] == 0) {
                throw new Error("Bad context stack (pop with zero)")
            }
            this.scope[this.scope.lenght - 1]--;
            return this.stack.pop();
        };
    };
})();