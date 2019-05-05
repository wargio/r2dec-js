/** 
 * Copyright (C) 2018 elicn
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
    const Stmt = require('core2/analysis/ir/statements');
    const Simplify = require('core2/analysis/ir/simplify');

    /** available architectures */
    var _archs = {
        'x86': require('core2/frontend/arch/x86')
    };

    /**
     * Decoder utility object, used to turn assembly instructions retrieved from
     * r2 into expressions and statements.
     * @param {Object} iIj Parsed output of 'iIj' r2 command
     * @constructor
     */
    function Decoder(iIj) {
        var a = _archs[iIj.arch];

        this.arch = new a(iIj.bits, iIj.bintype, iIj.endian);
    }

    /**
     * Check if a certain architecture is supported.
     * @param {string} name Architecture name
     * @returns {boolean}
     */
    Decoder.has = function(name) {
        return name in _archs;
    };

    /**
     * Process instruction data in the form of 'aoj' r2 command output into a list of
     * generic statements.
     * @param {Object} aoj Parsed output of 'aoj' r2 command
     * @returns {Stmt.Container} Container object including all generated Statements
     */
    Decoder.prototype.transform_ir = function(aoj) {
        var stmts = [];

        aoj.forEach(function(item) {
            var decoded = this.arch.r2decode(item);
            var handler = this.arch.instructions[decoded.mnemonic] || this.arch.invalid;

            // DEBUG
            // console.log(item.opcode);

            handler(decoded).forEach(function(expr) {
                var stmt = Stmt.make_statement(decoded.address, expr);

                Simplify.reduce_stmt(stmt);

                // DEBUG
                // console.log('| ', stmt.toString());

                stmts.push(stmt);
            });
        }, this);

        return new Stmt.Container(stmts[0].address, stmts);
    };

    return Decoder;
})();