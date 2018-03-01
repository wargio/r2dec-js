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

    var _delayed_branch = function(instr, context, instructions) {
        // delayed branch, so the next instr is still executed.
        var start = instructions.indexOf(instr);
        var e = instructions[start];
        instructions[start] = instructions[start + 1];
        if (instructions[start]) {
            instructions[start + 1] = e;
            e = instructions[start + 1].loc;
            instructions[start + 1].loc = instructions[start].loc;
            instructions[start].loc = e;
        } else {
            //this should never happen, but let's add it anyway..
            instructions[start] = e;
        }
    };

    var op_bits4 = function(instr, op, bits, unsigned, swap) {
        var e = instr.parsed;
        var a = swap ? 3 : 2;
        var b = swap ? 2 : 3;
        if (e[2] == 'zero') {
            return e[1] + " = " + e[3] + ";";
        } else if (e[1] == e[a] && !bits) {
            return e[1] + " " + op + "= " + e[b] + ";";
        }
        return e[1] + " = " + (bits ? '(' + (unsigned ? 'uint' : 'int') + bits + '_t) ' : '') + e[a] + " " + op + " " + e[b] + ";";
    };

    var _move = function(instr, bits, unsigned) {
        var e = instr.parsed;
        if (e[1] == 'zero') {
            return null;
        }
        if (e[2] == 'zero') {
            return e[1] + " = " + (bits ? '(' + (unsigned ? 'uint' : 'int') + bits + '_t) ' : '') + "0;";
        }
        return e[1] + " = " + (bits ? '(' + (unsigned ? 'uint' : 'int') + bits + '_t) ' : '') + e[2] + ";";
    };

    var load_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[0] + ");";
        } else if (arg[0] == '0') {
            return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[1] + ");";
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (!isNaN(arg[0])) {
            if (arg[0] < 0)
                arg[0] = " - " + Math.abs(arg[0]);
            else
                arg[0] = " + " + arg[0];
            return e[1] + " = *(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ");";
        }
        return e[1] + " = *((" + s + "int" + bits + "_t*) " + arg[1] + ");";
    };

    var store_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[0] + ") = " + e[1] + ";";
        } else if (arg[0] == '0') {
            return "*((" + s + "int" + bits + "_t*) " + arg[1] + ") = " + e[1] + ";";
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (!isNaN(arg[0])) {
            if (arg[0] < 0)
                arg[0] = " - " + Math.abs(arg[0]);
            else
                arg[0] = " + " + arg[0];
            return "*(((" + s + "int" + bits + "_t*) " + arg[1] + ")" + arg[0] + ") = " + e[1] + ";";
        }
        return "*((" + s + "int" + bits + "_t*)" + arg[1] + ") = " + e[1] + ";";
    };

    var compare = function(instr, context, instructions, cmp, zero) {
        instr.conditional(instr.parsed[1], zero ? "0" : instr.parsed[2], cmp);
        /*
        _delayed_branch (instr, context, instructions);
        */
        return null;
    };


    return {
        instructions: {
            'nop': function(instr) {
                return null;
            },
            'b': function(instr) {
                return null;
            },
            'lui': function(instr) {
                if (instr.parsed[2] != 'zero') {
                    instr.parsed[2] += "0000";
                }
                return _move(instr);
            },
            'move': function(instr) {
                return _move(instr);
            },
            'neg': function(instr) {
                var e = instr;
                if (e[2] == 'zero') {
                    return e[1] + " = 0;";
                }
                return e[1] + " = -" + e[2] + ";";
            },
            'not': function(instr) {
                var e = instr.parsed;
                if (e[2] == 'zero') {
                    return e[1] + " = !0;";
                }
                return e[1] + " = !" + e[2] + ";";
            },
            'add': function(instr) {
                return op_bits4(instr, "+");
            },
            'addi': function(instr) {
                return op_bits4(instr, "+");
            },
            'addiu': function(instr) {
                return op_bits4(instr, "+");
            },
            'addu': function(instr) {
                return op_bits4(instr, "+");
            },
            'addis': function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr, "+");
            },
            'sub': function(instr) {
                return op_bits4(instr, "-", false, true);
            },
            'subc': function(instr) {
                return op_bits4(instr, "-", false, true);
            },
            'subf': function(instr) {
                return op_bits4(instr, "-", false, true);
            },
            'xor': function(instr) {
                return op_bits4(instr, "^");
            },
            'xori': function(instr) {
                return op_bits4(instr, "^");
            },
            'or': function(instr) {
                return op_bits4(instr, "|");
            },
            'ori': function(instr) {
                return op_bits4(instr, "|");
            },
            'oris': function(instr) {
                instr.parsed[3] += '0000';
                return op_bits4(instr, "|");
            },
            'and': function(instr) {
                return op_bits4(instr, "&");
            },
            'andi': function(instr) {
                return op_bits4(instr, "&");
            },
            'sll': function(instr) {
                return op_bits4(instr, "<<");
            },
            'sllv': function(instr) {
                return op_bits4(instr, "<<");
            },
            'sra': function(instr) {
                return op_bits4(instr, ">>");
            },
            'srl': function(instr) {
                return op_bits4(instr, ">>");
            },
            'srlv': function(instr) {
                return op_bits4(instr, ">>");
            },
            'slt': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    return e[1] + " = (" + e[2] + " < 0) ? 1 : 0;";
                }
                return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
            },
            'slti': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    return e[1] + " = (" + e[2] + " < 0) ? 1 : 0;";
                }
                return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
            },
            'sltu': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    return e[1] + " = (" + e[2] + " < 0) ? 1 : 0;";
                }
                return e[1] + " = (" + e[2] + " < " + e[3] + ") ? 1 : 0;";
            },
            lb: function(instr) {
                return load_bits(instr, 8, false);
            },
            lh: function(instr) {
                return load_bits(instr, 16, false);
            },
            lw: function(instr) {
                return load_bits(instr, 32, false);
            },
            sb: function(instr) {
                return store_bits(instr, 8, false);
            },
            sh: function(instr) {
                return store_bits(instr, 16, false);
            },
            sw: function(instr) {
                return store_bits(instr, 32, false);
            },
            lbu: function(instr) {
                return load_bits(instr, 8, true);
            },
            lhu: function(instr) {
                return load_bits(instr, 16, true);
            },
            lwu: function(instr) {
                return load_bits(instr, 32, true);
            },
            sbu: function(instr) {
                return store_bits(instr, 8, true);
            },
            shu: function(instr) {
                return store_bits(instr, 16, true);
            },
            swu: function(instr) {
                return store_bits(instr, 32, true);
            },
            'jr': function(instr, context, instructions) {
                if (instr.parsed.indexOf('ra') < 0) {
                    /*
                      _delayed_branch (instr, context, instructions);
                    */
                    return 'return;';
                }
                var reg = null;
                for (var i = instructions.length - 1; i >= 0; i--) {
                    var e = instructions[i].parsed;
                    if (!e) continue;
                    if (e.indexOf('v0') == 1 || e.indexOf('v1') == 1) {
                        reg = e[1];
                        break;
                    }
                };
                return "return" + (reg ? " " + reg : "") + ";";
            },
            'jalr': function(instr) {
                return '(*(void(*)()) ' + instr.parsed[1] + ') ();';
            },
            'bal': function(instr) {
                var fcn = instr.parsed[1].replace(/\./g, '_');
                if (fcn.indexOf('0x') == 0) {
                    fcn = fcn.replace(/0x/, 'fcn_');
                }
                return fcn + " ();";
            },
            'beqz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', true);
            },
            'bnez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', true);
            },
            'bltz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GE', true);
            },
            'blez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GT', true);
            },
            'bgtz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LE', true);
            },
            'bgez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LT', true);
            },
            'beq': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', false);
            },
            'bne': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', false);
            },
            invalid: function() {
                return null;
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                }
            }
        },
        returns: function(context) {
            return 'void';
        }
    };
})();