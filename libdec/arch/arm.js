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

module.exports = (function() {

    var _common_math = function(e, op) {
        if (e[1] == 'ip' || e[1] == 'sp' || e[1] == 'fp') {
            return null;
        }
        if (e[1] == e[2]) {
            return e[1] + ' ' + op + '= ' + e[3] + ';';
        }
        return e[1] + ' = ' + e[2] + ' ' + op + ' ' + e[3] + ';';
    };

    var _load = function(instr) {
        if (instr.parsed.length == 3) {
            return instr.parsed[1] + ' = ' + (instr.string ? instr.string : instr.parsed[2]) + ';';
        }
        return instr.pseudo;
    };

    var _conditional = function(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        return null;
    };

    return {
        instructions: {
            add: function(instr) {
                return _common_math(instr.parsed, '+');
            },
            b: function() {},
            bne: function(instr, context) {
                return _conditional(instr, context, 'EQ');
            },
            beq: function(instr, context) {
                return _conditional(instr, context, 'NE');
            },
            bgt: function(instr, context) {
                return _conditional(instr, context, 'LE');
            },
            bge: function(instr, context) {
                return _conditional(instr, context, 'LT');
            },
            blt: function(instr, context) {
                return _conditional(instr, context, 'GE');
            },
            ble: function(instr, context) {
                return _conditional(instr, context, 'GT');
            },
            bl: function(instr) {
                return instr.parsed[1] + ' ();';
            },
            cmp: function(instr, context) {
                context.cond.a = instr.parsed[1];
                context.cond.b = instr.parsed[2];
                return null;
            },
            ldr: _load,
            ldm: function(instr) {
                for (var i = 1; i < instr.parsed.length; i++) {
                    if (instr.parsed[i] == 'pc') {
                        return 'return;';
                    }
                }
                instr.comments.push(instr.opcode);
                return null;
            },
            mov: function(instr) {
                var dst = instr.parsed[1];
                if (dst == 'ip' || dst == 'sp' || dst == 'fp') {
                    return null;
                }
                return dst + ' = ' + instr.parsed[2];
            },
            push: function() {},
            sub: function(instr) {
                return _common_math(instr.parsed, '-');
            },
            invalid: function() {
                return null;
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var ret = asm.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
            ret = ret.replace(/\{|\}/g, ' ').replace(/\s+/g, ' ');
            return ret.trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                },
                leave: false,
                vars: []
            }
        }
    };
})();