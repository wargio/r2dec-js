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
    var Scope = require('./Scope');
    var Instruction = require('./Instruction');
    var cfg = require('../config');
    /* 
     * Gets an instruction block provided by agj
     * b = data[n].blocks[k];
     */
    var Block = function (b) {
        this.loc = b.offset;
        this.jump = b.jump ? b.jump : null;
        this.fail = b.fail ? b.fail : null;
        this.instr = b.ops.map(function (i) {
            return new Instruction(i);
        });
        this.scope = null;

        this.print = function (p, ident) {
            var scopetmp = this.scope ? this.scope.gen() : null;
            if (scopetmp) {
                p(ident + scopetmp.header);
            }
            for (var i = 0; i < this.instr.length; i++) {
                if (this.instr[i].comments.length > 0) {
                    if (this.instr[i].comments.length == 1) {
                        p(ident + cfg.ident + '/* ' + this.instr[i].comments[0] + ' */');
                    } else {
                        p(ident + cfg.ident + '/* ');
                        for (var j = 0; j < this.instr[i].comments.length; j++) {
                            p(ident + cfg.ident + ' * ' + this.instr[i].comments[j]);
                        }
                        p(ident + cfg.ident + ' */');
                    }
                }
                if (this.instr[i].pseudo) {
                    p(ident + cfg.ident + this.instr[i].pseudo);
                }
            }
            if (scopetmp) {
                p(ident + scopetmp.trailer);
            }
        };
    };

    return Block;
})();
