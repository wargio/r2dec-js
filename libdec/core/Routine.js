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

    var _padding = '                                                                                                    ';

    var _print_deps = function(p, instructions, options, asm_pad) {
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
                p(asm_pad + color.text(macros[i]));
            } else {
                p(asm_pad + macros[i]);
            }
        }
        if (macros.length) {
            p(asm_pad);
        }
        for (var i = 0; i < codes.length; i++) {
            /* TODO: missing colors.. :| */
            p(asm_pad + codes[i].toString(options).replace(/\n/g, '\n' + asm_pad) + '\n' + asm_pad);
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

    var _resize_pad = function(instructions) {
        var max = 0;
        for (var i = 0; i < instructions.length; i++) {
            if (instructions[i].assembly.length > max) {
                max = instructions[i].assembly.length;
            }
        }
        var addrlen = instructions[0].loc.toString(16).length;
        /* 4 spaces + 0x + addr + 2 spaces */
        max += 8 + (addrlen <= 8 ? 8 : addrlen)
        return _padding.substr(0, max) + ' | ';
    };

    /*
     * Expects name and instructions as input.
     */
    var Routine = function(name, instructions) {
        this.instructions = instructions;
        this.args = [];
        this.returnType = 'void';
        this.name = name;

        this.print = function(p, options) {
            var current = this.instructions[0].scope;
            var scopes = [current];
            var ident = cfg.ident;
            var asm_pad = options.assembly ? _resize_pad(this.instructions) : '';
            if (options.assembly) {
                var legenda2 = '    ; assembly';
                var legenda1 = '/* r2dec pseudo C output */'
                if (options.color) {
                    p(options.color.comment(legenda2) + asm_pad.substr(legenda2.length, asm_pad.length) + options.color.comment(legenda1))
                } else {
                    p(legenda2 + asm_pad.substr(legenda2.length, asm_pad.length) + legenda1)
                }
            }
            _print_deps(p, this.instructions, options, asm_pad);
            if (options.color) {
                var pre = '';
                if (options.assembly) {
                    var aname = '(fcn) ' + this.name + ':';
                    pre = options.color.callname(aname) + asm_pad.substr(aname.length, asm_pad.length);
                }
                p(pre + options.color.types(this.returnType) + ' ' + options.color.callname(_fix_routine_name(this.name)) + ' (' + this.args.join(', ') + ') {');
            } else {
                var pre = '';
                if (options.assembly) {
                    var aname = '(fcn) ' + this.name;
                    pre = aname + asm_pad.substr(aname.length, asm_pad.length);
                }
                p(pre + this.returnType + ' ' + _fix_routine_name(this.name) + ' (' + this.args.join(', ') + ') {');
            }
            for (var i = 0; i < this.instructions.length; i++) {
                var instr = this.instructions[i];
                if (current != instr.scope) {
                    if (current.level < instr.scope.level) {
                        scopes.push(current);
                        instr.scope.printHeader(p, asm_pad + ident, options);
                        ident += cfg.ident;
                        current = instr.scope;
                    } else if (current.level > instr.scope.level) {
                        while (current != instr.scope && scopes.length > 1) {
                            if (ident.length > cfg.ident.length) {
                                ident = ident.substr(0, ident.length - cfg.ident.length);
                            }
                            current.printTrailer(p, asm_pad + ident, options);
                            current = scopes.pop();
                        }
                    } else {
                        var tmpident = ident.substr(0, ident.length - cfg.ident.length);
                        current.printTrailer(p, asm_pad + tmpident, options);
                        current = instr.scope;
                        current.printHeader(p, asm_pad + tmpident, options);
                    }
                }
                if (instr.label > -1) {
                    options.ident = asm_pad + ident;
                    if (options.color) {
                        p(asm_pad + /*ident.substr(0, ident.length - cfg.ident.length) + */ options.color.labels('label_' + instr.label) + ':');
                    } else {
                        p(asm_pad + /*ident.substr(0, ident.length - cfg.ident.length) + */ 'label_' + instr.label + ':');
                    }
                }
                instr.print(p, ident, options, asm_pad);
            }
            while (ident.length > 1 && current) {
                if (ident.length > cfg.ident.length) {
                    ident = ident.substr(0, ident.length - cfg.ident.length);
                }
                current.printTrailer(p, asm_pad + ident, options);
                current = scopes.pop();
            }
            p(asm_pad + '}');
        };
    };
    return Routine;
})();