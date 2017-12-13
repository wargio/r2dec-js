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
    /* 
     * Gets an opcode block provided by agj
     * op = data[n].blocks[k].ops[i];
     */
    var Instruction = function (op) {
        this.ref = op.refptr;
        this.ptr = op.ptr ? op.ptr : null;
        this.opcode = op.opcode ? op.opcode : 'invalid';
        this.comments = op.comment ? [(Buffer.from(op.comment, 'base64').toString())] : [];
        this.pseudo = op.opcode;//null;
        this.parsed = null;
        this.string = null;
        this.xrefs = op.xrefs ? op.xrefs.slice() : [];
    };

    return Instruction;
})();
