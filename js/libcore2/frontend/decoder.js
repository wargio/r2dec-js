/** 
 * Copyright (C) 2018-2019 elicn
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

(function() {
    const Cntr = require('js/libcore2/analysis/ir/container');
    const Stmt = require('js/libcore2/analysis/ir/statements');
    const Simplify = require('js/libcore2/analysis/ir/simplify');

    /** available architectures */
    var archs = {
        'arm': require('js/libcore2/frontend/arch/arm/arm'),
        'x86': require('js/libcore2/frontend/arch/x86/x86')
    };

    /**
     * Decoder utility object, used to turn assembly instructions retrieved from
     * r2 into expressions and statements.
     * @param {Object} iIj Parsed output of 'iIj' r2 command
     * @constructor
     */
    function Decoder(iIj) {
        var arch = archs[iIj.arch];

        this.arch = new arch(iIj);
    }

    Decoder.archs = archs;

    /**
     * Process instruction data in the form of 'aoj' r2 command output into a list of
     * generic statements.
     * @param {Object} aoj Parsed output of 'aoj' r2 command
     * @returns {Cntr.Container} Container object including all generated Statements
     */
    Decoder.prototype.transform_ir = function(aoj) {
        var start = undefined;      // block starting address
        var all_statements = [];    // generated ir statements

        aoj.forEach(function(item) {
            var decoded = this.arch.r2decode(item);
            var handler = this.arch.instructions[decoded.mnemonic] || this.arch.invalid;

            // turn r2 decoded instruction into a list of ir expressions and statements
            var expressions = handler(decoded);

            // to simplify further ir handling, expressions are wrapped as statements
            var statements = expressions.map(function(expr) {
                return Stmt.make_statement(decoded.address, expr);
            });

            // simplify statements in-place
            statements.forEach(Simplify.reduce_stmt);

            Array.prototype.push.apply(all_statements, statements);
            start = start || decoded.address;
        }, this);

        // put all statements in a container and return it
        return new Cntr.Container(start, all_statements);
    };

    Decoder.prototype.analyzer = function() {
        return this.arch.analyzer;
    };

    return Decoder;
});