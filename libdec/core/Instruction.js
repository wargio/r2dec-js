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
    var Long = require('libdec/long');
    var base64 = require('./libdec/base64');
    var _colorize = function(input, color) {
        if (!color) return input;
        return color.colorize(input);
    }

    var _align32 = function(x) {
        var zeros = '00000000';
        var c = x.toString(16);
        return '0x' + zeros.substr(c.length, zeros.length) + c;
    };
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
        this.assembly = op.opcode ? op.opcode : 'invalid';
        this.comments = op.comment ? [base64.atob(op.comment)] : [];
        this.pseudo = this.opcode; //null;
        this.parsed = null;
        this.valid = true;
        this.string = null;
        this.cond = null;
        this.xrefs = op.xrefs ? op.xrefs.slice() : [];
        this.print = function(p, ident, options, asmpadding) {
            if (this.comments && this.comments.length > 0) {
                if (this.comments.length == 1) {
                    if (options.color) {
                        p(asmpadding + ident + options.color.comment('/* ' + this.comments[0] + ' */'));
                    } else {
                        p(asmpadding + ident + '/* ' + this.comments[0] + ' */');
                    }
                } else {
                    if (options.color) {
                        p(asmpadding + ident + options.color.comment('/* '));
                        for (var j = 0; j < this.comments.length; j++) {
                            p(asmpadding + ident + options.color.comment(' * ' + this.comments[j]));
                        }
                        p(asmpadding + ident + options.color.comment(' */'));
                    } else {
                        p(asmpadding + ident + '/* ');
                        for (var j = 0; j < this.comments.length; j++) {
                            p(asmpadding + ident + ' * ' + this.comments[j]);
                        }
                        p(asmpadding + ident + ' */');
                    }
                }
            }
            if (this.pseudo && this.valid) {
                var asm = '';
                if (options.assembly) {
                    var c = '    ' + _align32(this.loc) + '  ' + this.assembly;
                    asm = _colorize(c, options.color) + asmpadding.substr(c.length, asmpadding.length);
                }
                p(asm + ident + this.pseudo.toString(options) + ';');
            } else if (options.assembly) {
                var c = '    ' + _align32(this.loc) + '  ' + this.assembly;
                var asm = _colorize(c, options.color) + asmpadding.substr(c.length, asmpadding.length);
                p(asm);
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
        this.invalidate_jump = function() {
            this.jump = null;
        }
    };

    return Instruction;
})();