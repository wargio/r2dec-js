/* 
 * Copyright (c) 2017, Giovanni Dante Grazioli <deroad@libero.it>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

module.exports = (function() {
    var get_cmp = function(cmp, inv) {
        var CMP = {
            INF: '',
            EQ: ' == ',
            NE: ' != ',
            LT: ' < ',
            LE: ' <= ',
            GT: ' > ',
            GE: ' >= '
        };
        var CMPinv = {
            INF: '',
            EQ: ' != ',
            NE: ' == ',
            LT: ' >= ',
            LE: ' > ',
            GT: ' <= ',
            GE: ' < '
        };
        return inv ? CMPinv[cmp] : CMP[cmp];
    }
    var print_content = function(p, ident, caller, array, type) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].label) {
                p(ident + '    ' + array[i].label + ':\n');
            }
            if (array[i].print) {
                array[i].print(p, ident + '    ', type);
            } else {
                for (var j = 0; j < array[i].comments.length; j++) {
                    p(ident + '    // ' + array[i].comments[j] + '\n');
                }
                if (array[i].opcode) {
                    if (array[i].opcode.indexOf('goto') == 0 && caller.indexOf('while') >= 0) {
                        p(ident + '    break;\n');
                    } else {
                        p(ident + '    ' + array[i].opcode + '\n');
                    }
                }/* else {
                    p(ident + '    // empty\n');
                }*/
            }
        }
    }
    var If = function(start, end, a, b, cmp) {
        if (!cmp || !a || !b || !get_cmp(cmp)) {
            throw new Error('Invalid input If (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'if';
        this.cmp = a.toString() + get_cmp(cmp) + b.toString();
        this.start = start;
        this.end = end;
        this.array = [];
        this.else = false;
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input If:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident, caller) {
            p(ident + 'if (' + this.cmp + ') {\n');
            print_content(p, ident, caller, this.array, this.type);
            if (this.else) {
                p(ident + '}');
            } else {
                p(ident + '}\n');
            }
        };
    };
    var Else = function(start, end, a, b, cmp) {
        this.cmp = null;
        if (a && b && cmp && get_cmp(cmp)) {
            this.cmp = a.toString() + get_cmp(cmp) + b.toString();
            this.type = 'elseif';
        }
        this.type = 'else';
        this.start = start;
        this.end = end;
        this.array = [];
        this.else = false;
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input Else:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident, caller) {
            if (this.cmp) {
                p(' else if (' + this.cmp + ') {\n');
            } else {
                p(' else {\n');
            }
            print_content(p, ident, caller, this.array, this.type);
            if (this.else) {
                p(ident + '}');
            } else {
                p(ident + '}\n');
            }
        };
    };
    var ElseBreak = function(start, end, a, b, cmp) {
        this.cmp = null;
        if (a && b && cmp && get_cmp(cmp)) {
            this.cmp = a.toString() + get_cmp(cmp) + b.toString();
            this.type = 'elseif';
        }
        this.type = 'else';
        this.start = start;
        this.end = end;
        this.array = [];
        this.else = false;
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input ElseBreak:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident, caller) {
            if (this.cmp) {
                p(' else if (' + this.cmp + ') {\n');
            } else {
                p(' else {\n');
            }
            p(ident + '    break');
            if (this.else) {
                p(ident + '}');
            } else {
                p(ident + '}\n');
            }
        };
    };
    var While = function(start, end, a, b, cmp) {
        if (!cmp || !a || !b || !get_cmp(cmp)) {
            throw new Error('Invalid input While (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'while';
        this.cmp = a.toString() + get_cmp(cmp) + b.toString();
        this.start = start;
        this.end = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input While:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident) {
            p(ident + 'while (' + this.cmp + ') {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '}\n');
        };
    };
    var IfContinue = function(start, end, a, b, cmp) {
        if (!cmp || !a || !b || !get_cmp(cmp)) {
            throw new Error('Invalid input IfContinue (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'ifcontinue';
        this.cmp = a.toString() + get_cmp(cmp) + b.toString();
        this.start = start;
        this.end = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input IfContinue:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident) {
            p(ident + 'if (' + this.cmp + ') {\n');
            p(ident + '    continue;\n');
            p(ident + '}\n');
        };
    };
    var IfBreak = function(start, end, a, b, cmp) {
        if (!cmp || !a || !b || !get_cmp(cmp)) {
            throw new Error('Invalid input IfBreak (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'ifbreak';
        this.cmp = a.toString() + get_cmp(cmp) + b.toString();
        this.start = start;
        this.end = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input IfBreak:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident) {
            p(ident + 'if (' + this.cmp + ') {\n');
            p(ident + '    break;\n');
            p(ident + '}\n');
        };
    };
    var DoWhile = function(start, end, a, b, cmp) {
        if (!cmp || !a || !b || !get_cmp(cmp)) {
            throw new Error('Invalid input DoWhile (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'dowhile';
        this.cmp = a.toString() + get_cmp(cmp) + b.toString();
        this.start = start;
        this.end = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input DoWhile:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident) {
            p(ident + 'do {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '} while (' + this.cmp + ');\n');
        };
    };
    var For = function(start, end, a, b, cmp, init, sum) {
        if (!cmp || !a || !b || !init || !sum || !get_cmp(cmp, true)) {
            throw new Error('Invalid input For (' + a + ', ' + b + ', ' + cmp + ')');
        }
        this.type = 'for';
        this.cmp = a.toString() + get_cmp(cmp, true) + b.toString();
        this.init = init;
        this.sum = sum;
        this.start = start;
        this.end = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input For:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p, ident) {
            p(ident + 'for (' + this.init + '; ' + this.cmp + '; ' + this.sum + ') {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '}\n');
        };
    };
    var _Function = function(name) {
        this.name = name;
        this.returntype = 'void';
        this.args = '';
        this.type = 'function';
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input Function:add null');
            }
            this.array.push(x);
        };
        this.size = function() {
            return this.array.length;
        };
        this.get = function(i) {
            if (typeof i == 'undefined' || i < 0) {
                i = this.array.length - 1;
            }
            return this.array[i];
        };
        this.print = function(p) {
            p(this.returntype + ' ' + this.name + '(' + this.args + ') {\n');
            print_content(p, '', '', this.array, this.type);
            p('}\n');
        };
    };
    return {
        Function: _Function,
        DoWhile: DoWhile,
        While: While,
        Else: Else,
        If: If,
        IfContinue: IfContinue,
        IfBreak: IfBreak,
        ElseBreak: ElseBreak,
        For: For
    };
})();