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

module.exports = (function () {
    var Flow = require('./Flow');
    var Scope = require('./Scope');

    /*
     * Expects name and blocks as input.
     */
    var Routine = function (name, blocks) {
        this.blocks = blocks;
        this.scope = new Scope();
        this.args = [];
        this.flow = Flow(this.blocks);

        this.scope.header = 'void ' + name + ' (#) {';
        this.scope.key = /#/g;

        this.print = function (p) {
            this.scope.value = this.args.join(', ');
            var s = this.scope.gen();
            p(s.header);
            var c = this.flow;
            while (c) {
                c.data.print(p, '');
                p('    #####################################################################################à');
                c = c.next;
            }
            p(s.trailer);
        };
    };
    return Routine;
})();