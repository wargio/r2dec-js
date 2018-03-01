/* 
 * Copyright (C) 2017-2018 deroad
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
    var Long = require('long');
    /* 
     * Gets an opcode block provided by agj
     * op = data[n].blocks[k].ops[i];
     */
    var Instruction = function(op, scope) {
        this.scope = scope;
        this.loc = op.offset;
        this.jump = op.jump;
        this.ptr = op.ptr ? op.ptr : null;
        this.ref = (op.refptr || (this.ptr && Long.ZERO.lt(op.ptr))) ? true : false;
        this.label = -1;
        this.opcode = op.disasm ? op.disasm : (op.opcode ? op.opcode : 'invalid');
        this.comments = op.comment ? [(Buffer.from(op.comment, 'base64').toString())] : [];
        this.pseudo = this.opcode; //null;
        this.parsed = null;
        this.valid = true;
        this.string = null;
        this.cond = null;
        this.xrefs = op.xrefs ? op.xrefs.slice() : [];
        this.print = function(p, ident, options) {
            if (this.comments.length > 0) {
                if (this.comments.length == 1) {
                    if (options.color) {
                        p(ident + options.color.comment('/* ' + this.comments[0] + ' */'));
                    } else {
                        p(ident + '/* ' + this.comments[0] + ' */');
                    }
                } else {
                    if (options.color) {
                        p(ident + options.color.comment('/* '));
                        for (var j = 0; j < this.comments.length; j++) {
                            p(ident + options.color.comment(' * ' + this.comments[j]));
                        }
                        p(ident + options.color.comment(' */'));
                    } else {
                        p(ident + '/* ');
                        for (var j = 0; j < this.comments.length; j++) {
                            p(ident + ' * ' + this.comments[j]);
                        }
                        p(ident + ' */');
                    }
                }
            }
            if (this.pseudo && this.valid) {
                p(ident + this.pseudo.toString(options) + ';');
            }
        };
        this.conditional = function(a, b, type) {
            if (type) {
                this.cond = {
                    a: a,
                    b: b,
                    type: type
                }
            }
        };
    };

    return Instruction;
})();