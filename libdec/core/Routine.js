/* 
 * Copyright (C) 2017 deroad
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
    var cfg = require('../config');
    var Flow = require('./Flow');
    var Scope = require('./Scope');

    /*
     * Expects name and instructions as input.
     */
    var Routine = function(name, instructions) {
        this.instructions = instructions;
        this.args = [];
        this.returnType = 'void';
        this.name = name;
        this.scope = [];

        this.print = function(p) {
            p(this.returnType + ' ' + this.name + ' (' + this.args.join(', ') + ') {');
            for (var i = 0; i < this.scope.length; i++) {
                this.scope[i].print(p, cfg.ident);
            }
            p('}');
        };
    };
    return Routine;
})();