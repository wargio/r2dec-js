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

    var _align32 = function(x) {
        var zeros = '00000000';
        var c = x.toString(16);
        return '0x' + zeros.substr(c.length, zeros.length) + c;
    };

    var _align64 = function(x) {
        var zeros = '0000000000000000';
        var c = x.toString(16);
        return '0x' + zeros.substr(c.length, zeros.length) + c;
    };

    return function(data, arch) {
        this.code = null;
        this.valid = true;
        this.parsed = arch.parse(data.opcode);
        this.jump = data.jump;
        this.pointer = (data.ptr && Long.ZERO.lt(data.ptr)) ? data.ptr : null;
        this.location = data.offset;
        this.assembly = data.disasm;
        this.simplified = data.opcode;
        this.string = null;
        this.cond = null;
        this.xrefs = data.xrefs ? data.xrefs.slice() : [];
        this.comments = data.comment ? [new TextDecoder().decode(Duktape.dec('base64', data.comment))] : [];
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
            var h = context.printer.html;
            var t = context.printer.theme;
            var a = context.printer.auto;
            console.log(h(context.ident) + this.code + ';');
        };
    }
})();