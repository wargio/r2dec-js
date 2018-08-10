/* 
 * Copyright (C) 2018 deroad
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

    var _align = function(x) {
        var zeros64 = '0000000000000000';
        var zeros32 = '00000000';
        var c = x.toString(16);
        if (c.length > zeros32.length) {
            return '0x' + zeros64.substr(c.length, zeros64.length) + c;
        }
        return '0x' + zeros32.substr(c.length, zeros32.length) + c;
    };

    var _printable = function(instr) {
        return instr.valid && instr.code && instr.code.toString().length > 0;
    }

    var _asm_view = function(instr) {
        if (Global.evars.honor.assembly) {
            var t = Global.printer.theme;
            var b = Global.printer.auto;
            var addr = _align(instr.location)
            var s = 1 + addr.length + instr.simplified.length;
            console.log(Global.context.identfy(s, t.integers(addr) + ' ' + b(instr.simplified)) + (_printable(instr) ? (instr.code + ';') : ''));
        } else if (_printable(instr)) {
            console.log(Global.context.identfy() + instr.code + ';');
        }
    };

    return function(data, arch) {
        this.code = null;
        this.valid = true;
        this.jump = data.jump;
        this.pointer = (data.ptr && Long.ZERO.lt(data.ptr)) ? data.ptr : null;
        this.location = data.offset;
        this.assembly = data.disasm;
        this.simplified = data.opcode;
        this.parsed = arch.parse(this.assembly, this.simplified);
        this.string = null;
        this.callee = null;
        this.label = null;
        this.cond = null;
        this.xrefs = data.xrefs ? data.xrefs.slice() : [];
        this.comments = data.comment ? [new TextDecoder().decode(Duktape.dec('base64', data.comment))] : [];
        if (Global.evars.honor.xrefs) {
            for (var i = 0; i < this.xrefs.length; i++) {
                var e = 'XREF ' + this.xrefs[i].type + ": 0x" + this.xrefs[i].addr.toString(16);
                this.comments.push(e)
            }
        }
        this.conditional = function(a, b, type) {
            if (type) {
                this.cond = {
                    a: a,
                    b: b,
                    type: type
                }
            }
        };
        this.setBadJump = function() {
            this.jump = null;
        };
        this.print = function() {
            var t = Global.printer.theme;
            var a = Global.printer.auto;
            var empty = Global.context.identfy()
            if (this.comments.length == 1) {
                console.log(empty + t.comment('/* ' + this.comments[0] + ' */'));
            } else if (this.comments.length > 1) {
                console.log(empty + t.comment('/* ' + this.comments[0]));
                for (var i = 1; i < this.comments.length; i++) {
                    console.log(empty + t.comment(' * ' + this.comments[i]));
                }
                console.log(empty + t.comment(' */'));
            }
            if (this.label) {
                console.log(Global.context.identfy(null, null, true) + this.label + ':');
            }
            _asm_view(this);
        };
    }
})();