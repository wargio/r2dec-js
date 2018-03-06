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
    var cfg = require('../config');
    var Flow = require('./Flow');
    var Scope = require('./Scope');

    var _print_deps = function(p, instructions, options) {
        var color = options.color;
        var macros = [];
        var codes = [];
        if (options.casts) {
            macros.push('#include <stdint.h>');
        }
        for (var i = 0; i < instructions.length; i++) {
            if (!instructions[i].pseudo || !instructions[i].pseudo.deps) {
                continue;
            }
            for (var j = 0; j < instructions[i].pseudo.deps.macros.length; j++) {
                if (macros.indexOf(instructions[i].pseudo.deps.macros[j]) < 0) {
                    macros.push(instructions[i].pseudo.deps.macros[j]);
                }
            }
            for (var j = 0; j < instructions[i].pseudo.deps.code.length; j++) {
                if (codes.indexOf(instructions[i].pseudo.deps.code[j]) < 0) {
                    codes.push(instructions[i].pseudo.deps.code[j]);
                }
            }
        }
        for (var i = 0; i < macros.length; i++) {
            if (color) {
                p(color.text(macros[i]));
            } else {
                p(macros[i]);
            }
        }
        if (macros.length) {
            p('');
        }
        for (var i = 0; i < codes.length; i++) {
            /* TODO: missing colors.. :| */
            p(codes[i].toString(options) + '\n');
        }
    };

    var _fix_routine_name = function(name) {
        if (!name) {
            return 'unknown_fcn';
        }
        if (name.indexOf('fcn.') == 0 || name.indexOf('loc.') == 0) {
            return name.replace(/[\.:]/g, '_').replace(/__+/g, '_');
        }
        return name.replace(cfg.anal.replace, '').replace(/\.|:/g, '_').replace(/__+/g, '_').replace(/^_/, '').replace(/_[0-9a-f]+$/, '');
    }

    /*
     * Expects name and instructions as input.
     */
    var Routine = function(name, instructions) {
        this.instructions = instructions;
        this.args = [];
        this.returnType = 'void';
        this.name = _fix_routine_name(name);

        this.print = function(p, options) {
            _print_deps(p, this.instructions, options);
            var current = this.instructions[0].scope;
            var scopes = [current];
            var ident = cfg.ident;
            if (options.color) {
                p(options.color.types(this.returnType) + ' ' + options.color.callname(this.name) + ' (' + this.args.join(', ') + ') {');
            } else {
                p(this.returnType + ' ' + this.name + ' (' + this.args.join(', ') + ') {');
            }
            for (var i = 0; i < this.instructions.length; i++) {
                var instr = this.instructions[i];
                if (current != instr.scope) {
                    if (current.level < instr.scope.level) {
                        scopes.push(current);
                        instr.scope.printHeader(p, ident, options);
                        ident += cfg.ident;
                        current = instr.scope;
                    } else if (current.level > instr.scope.level) {
                        while (current != instr.scope && scopes.length > 1) {
                            if (ident.length > cfg.ident.length) {
                                ident = ident.substr(0, ident.length - cfg.ident.length);
                            }
                            current.printTrailer(p, ident, options);
                            current = scopes.pop();
                        }
                    } else {
                        var tmpident = ident.substr(0, ident.length - cfg.ident.length);
                        current.printTrailer(p, tmpident, options);
                        current = instr.scope;
                        current.printHeader(p, tmpident, options);
                    }
                }
                if (instr.label > -1) {
                    options.ident = ident;
                    if (options.color) {
                        p( /*ident.substr(0, ident.length - cfg.ident.length) + */ options.color.labels('label_' + instr.label) + ':');
                    } else {
                        p( /*ident.substr(0, ident.length - cfg.ident.length) + */ 'label_' + instr.label + ':');
                    }
                }
                instr.print(p, ident, options);
            }
            while (ident.length > 1 && current) {
                if (ident.length > cfg.ident.length) {
                    ident = ident.substr(0, ident.length - cfg.ident.length);
                }
                current.printTrailer(p, ident, options);
                current = scopes.pop();
            }
            p('}');
        };
    };
    return Routine;
})();