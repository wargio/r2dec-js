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

module.exports = (function () {

    var _branches = {
        'jne': 'EQ',
        'je': 'NE',
        'ja': 'LE',
        'jb': 'GE',
        'jbe': 'GT',
        'jg': 'LE',
        'jge': 'LT',
        'jle': 'GT',
        'jl': 'GE',
        'js': 'LT'
    };

    var _signed_types = {
        'byte': 'int8_t ',
        'word': 'int16_t',
        'dword': 'int32_t',
        'qword': 'int64_t'
    };

    var _unsigned_types = {
        'byte': 'uint8_t ',
        'word': 'uint16_t',
        'dword': 'uint32_t',
        'qword': 'uint64_t'
    };

    var _memory_jump = function (e, xref) {
        if (_unsigned_types[e[1]]) {
            if (xref) {
                return "*((" + _unsigned_types[e[1]] + "*) " + xref + ")";
            }
            if (e[2].indexOf("[reloc.") == 0) {
                return null;
            }
            return "*((" + _unsigned_types[e[1]] + "*) " + e[2].replace(/\[|\]/g, "") + ")";
        }
        return null;
    };

    var _memory_load = function (e) {
        if (_signed_types[e[1]]) {
            return "*((" + _signed_types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ") = " + e[3] + ";";
        } else if (_signed_types[e[2]]) {
            return e[1] + " = *((" + _signed_types[e[2]] + "*) " + e[3].replace(/\[|\]/g, '') + ");";
        }
        return null;
    };

    var _common_math = function (e, op, bits) {
        if (e.length == 2) {
            if (e[1].match(/r\wx/)) {
                return "rax " + op + "= " + (bits ? '(uint' + bits + '_t) ' : '') + e[1] + ";";
            } else if (e[1].match(/r\wx/)) {
                return "edx:eax " + op + "= " + (bits ? '(uint' + bits + '_t) ' : '') + e[1] + ";";
            }
            return "dx:ax " + op + "= " + (bits ? '(uint' + bits + '_t) ' : '') + e[1] + ";";
        } else if (_signed_types[e[1]]) {
            return "*((" + _signed_types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ") " + op + "= " + e[3] + ";";
        } else if (_signed_types[e[2]]) {
            return e[1] + " " + op + "= *((" + _signed_types[e[2]] + "*) " + e[3].replace(/\[|\]/g, '') + ");";
        }
        return e[1] + " " + op + "= " + (bits ? '(uint' + bits + '_t) ' : '') + e[2] + ";";
    };

    var _common_move = function (instr) {
        var e = instr.parsed;
        if (e.length == 3) {
            if (instr.string) {
                return e[1] + " = " + instr.string + ";";
            }
            return e[1] + " = " + e[2] + ";";
        }
        var m = _memory_load(e);
        if (m) {
            return m;
        } else if (instr.string) {
            return e[1] + " = " + instr.string + ";";
        }
        return e[1] + " = " + e[2] + ";";
    };

    var _extend_sign = function (target, source, bits) {
        return target + " = " + '(int' + bits + '_t) ' + source + ";";
    };

    return {
        instr: {
            add: function (instr) {
                return _common_math(instr.parsed, '+');
            },
            and: function (instr) {
                return _common_math(instr.parsed, '&');
            },
            cbw: function () {
                return _extend_sign('ax', 'al', 16);
            },
            cwde: function () {
                return _extend_sign('eax', 'ax', 32);
            },
            cdqe: function () {
                return _extend_sign('rax', 'eax', 64);
            },
            div: function (instr) {
                return _common_math(instr.parsed, '/');
            },
            idiv: function (instr) {
                return _common_math(instr.parsed, '/');
            },
            imul: function (instr) {
                return _common_math(instr.parsed, '*');
            },
            lea: function (instr) {
                var e = instr.parsed;
                if (instr.string) {
                    return e[1] + " = " + instr.string + ";";
                }
                return e[1] + " = " + e[2].replace(/\[|\]/g, '') + ";";
            },
            leave: function (instr) {
                return null;
            },
            mod: function (instr) {
                return _common_math(instr.parsed, '%');
            },
            mov: _common_move,
            movabs: _common_move,
            movzx: _common_move,
            mul: function (instr) {
                return _common_math(instr.parsed, '*');
            },
            neg: function (instr) {
                var e = instr.parsed;
                if (e[2].charAt(0) == '-') {
                    return e[1] + " = " + e[2].substr(1, e[2].length) + ";";
                }
                return e[1] + " = -" + e[2] + ";";
            },
            nop: function () {
                return '';
            },
            not: function (instr) {
                var e = instr.parsed;
                return e[1] + " = !" + e[2] + ";";
            },
            or: function (instr) {
                return _common_math(instr.parsed, '|');
            },
            sal: function (instr) {
                return _common_math(instr.parsed, '<<');
            },
            shl: function (instr) {
                return _common_math(instr.parsed, '<<');
            },
            sar: function (instr) {
                return _common_math(instr.parsed, '>>');
            },
            shr: function (instr) {
                return _common_math(instr.parsed, '>>');
            },
            sub: function (instr) {
                return _common_math(instr.parsed, '-');
            },
            xor: function (instr) {
                return _common_math(instr.parsed, '^');
            },
            call: function (instr) {
                var res = _memory_jump(instr.parsed, instr.string);
                if (res) {
                    return "((void (*)(void)) " + res + ") ();";
                } else if (instr.string) {
                    return instr.string + " ();";
                } else if (instr.parsed[2] && instr.parsed[2].indexOf("[reloc.") == 0) {
                    return instr.parsed[2].replace(/\[reloc\.|\]/g, '') + " ();";
                } else {
                    var fcn = instr.parsed[1].replace(/\./g, '_');
                    if (fcn.indexOf('0x') == 0) {
                        fcn = fcn.replace(/0x/, 'fcn_');
                    }
                    return fcn + " ();";
                }
            },
            ret: function (instr, block) {
                var start = block.instr.indexOf(instr);
                if (start >= 0) {
                    for (var i = start - 1; i >= start - 4; i--) {
                        var e = block.instr[i].parsed;
                        if (e.length < 2) {
                            continue;
                        }
                        var regex = e[1].match(/[er]?ax/);
                        if (regex && block.instr[start - 1].parsed[0] == 'leave') {
                            return "return " + regex[0] + ";";
                        }
                    }
                }
                return "return;";
            },
            jmp: function (instr, block) {
                if (instr.parsed.length == 2) {
                    return "goto " + instr.parsed[1] + ";";
                } else if (instr.parsed.length == 3) {
                    if (instr.parsed[2].indexOf("[reloc.") == 0) {
                        return instr.parsed[2].replace(/\[reloc\.|\]/g, '') + " ();";
                    }
                }
                var x = instr.parsed.slice();
                x[0] = 'goto';
                return x.join(' ') + ";";
            },
            hlt: function () {
                return "_hlt();";
            },
            invalid: function () {
                return null;
            }
        },
        asm: function (opcode) {
            return opcode.join(' ');
        },
        parse: function (asm) {
            if (!asm) {
                return [];
            }
            var mem = '';
            if (asm.match(/\[.+\]/)) {
                mem = asm.match(/\[.+\]/)[0];
            }
            var ret = asm.replace(/\[.+\]/g, '{#}').replace(/,/g, ' ');
            ret = ret.replace(/\s+/g, ' ').trim().split(' ');
            return ret.map(function (a) {
                return a == '{#}' ? mem : a;
            });
        }
    };
})();
