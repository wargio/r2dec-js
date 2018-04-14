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
    var cfg = require('libdec/config');
    var Flow = require('libdec/core/Flow');
    var Scope = require('libdec/core/Scope');
    var Printable = require('libdec/printable');

    var _print_deps = function(p, instructions, options, spacesize) {
        var color = options.color;
        var macros = [];
        var codesname = [];
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
                if (codesname.indexOf(instructions[i].pseudo.deps.code[j].toString()) < 0) {
                    codes.push(instructions[i].pseudo.deps.code[j]);
                    codesname.push(instructions[i].pseudo.deps.code[j].toString())
                }
            }
        }
        var printable = new Printable();
        if (macros.length > 0) {
            for (var i = 0; i < macros.length; i++) {
                printable.appendSpacedPipe(spacesize);
                printable.appendMacro(macros[i]);
                printable.appendEndline();
            }
            printable.appendSpacedPipe(spacesize);
        }
        printable.print(p, options);
        printable.clean();
        for (var i = 0; i < codes.length; i++) {
            if (i > 0) {
                printable.appendEndline();
            }
            printable.appendPrintable(codes[i].printable(spacesize));
        }
        printable.print(p, options);
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

    var _max_pad = function(instructions, name) {
        var max = name.length;
        for (var i = 0; i < instructions.length; i++) {
            if (instructions[i].assembly.length > max) {
                max = instructions[i].assembly.length;
            }
        }
        var addrlen = instructions[0].loc.toString(16).length;
        /* 4 spaces + 0x + addr + 2 spaces */
        max += 8 + (addrlen <= 8 ? 8 : addrlen)
        return max + 1;
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
            var current  = new Scope();
            var scopes = [current];
            var ident = cfg.ident;
            var paddingsize = options.assembly ? _max_pad(instructions, this.name.trim()) : 0;
            var line = new Printable();
            if (options.assembly) {
                var legenda2 = '    ; assembly';
                var legenda1 = '/* r2dec pseudo C output */'
                line.appendComment(legenda2);
                line.appendSpacedPipe(paddingsize - legenda2.length);
                line.appendComment(legenda1);
                line.print(p, options);
                line.clean();
            }
            _print_deps(p, this.instructions, options, paddingsize);
            if (options.assembly) {
                var aname = '(fcn) ' + this.name + ':';
                line.appendCallname(aname);
                line.appendSpacedPipe(paddingsize - aname.length);
            }
            line.appendTypes(this.returnType);
            line.append(' ');
            line.appendCallname(_fix_routine_name(this.name));
            line.append(' (');
            line.appendColorize(this.args.join(', '));
            line.append(') {');
            line.print(p, options);
            for (var i = 0; i < this.instructions.length; i++) {
                line.clean();
                var instr = this.instructions[i];
                if (current != instr.scope) {
                    if (current.level < instr.scope.level) {
                        scopes.push(current);
                        instr.scope.printableHeader(line, paddingsize, ident);
                        ident += cfg.ident;
                        current = instr.scope;
                    } else if (current.level > instr.scope.level) {
                        while (current != instr.scope && scopes.length > 1) {
                            if (ident.length > cfg.ident.length) {
                                ident = ident.substr(0, ident.length - cfg.ident.length);
                            }
                            current.printableTrailer(line, paddingsize, ident);
                            current = scopes.pop();
                        }
                    } else {
                        var tmpident = ident.substr(0, ident.length - cfg.ident.length);
                        current.printableTrailer(line, paddingsize, tmpident);
                        current = instr.scope;
                        instr.scope.printableHeader(line, paddingsize, tmpident);
                    }
                }
                if (instr.label > -1) {
                    line.appendSpacedPipe(paddingsize);
                    line.appendLabels('label_' + instr.label);
                    line.append(':');
                    line.appendEndline();
                }
                instr.printable(line, paddingsize, ident, options);
                line.print(p, options);
            }
            line.clean();
            while (ident.length > 1 && current) {
                if (ident.length > cfg.ident.length) {
                    ident = ident.substr(0, ident.length - cfg.ident.length);
                }
                current.printableTrailer(line, paddingsize, ident);
                current = scopes.pop();
            }
            line.appendSpacedPipe(paddingsize);
            line.append('}');
            line.print(p, options);
        };
    };
    return Routine;
})();