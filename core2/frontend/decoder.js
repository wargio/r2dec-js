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
    var Stmt = require('core2/analysis/ir/statements');
    var Simplify = require('core2/analysis/ir/simplify');

    /** available architectures */
    var _archs = {
        'x86': require('core2/frontend/arch/x86')
    };

    /** @constructor */
    var _decoder = function(iIj) {
        var a = _archs[iIj.arch];

        this.arch = new a(iIj.bits, iIj.bintype, iIj.endian);

        /** Processes assembly listing into a list of generic expressions */
        this.transform_ir = function(aoj) {
            var ir = [];

            aoj.forEach(function(item) {
                var decoded = this.arch.r2decode(item);
                var handler = this.arch.instructions[decoded.mnemonic] || this.arch.invalid;

                console.log(item.opcode);
                handler(decoded).forEach(function(expr) {
                    // TODO: 'Stmt' does not really belong here
                    var stmt = Stmt.make_statement(decoded.address, expr);

                    Simplify.run(stmt);
                    console.log('|  ' + stmt.toString());

                    ir.push(stmt);
                });
            }, this);

            return ir;
        };
    };

    return {
        decoder: _decoder,
        archs: _archs
    };
})();