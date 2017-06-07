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
        array.forEach(function(o) {
            if (o.opcode && o.opcode.indexOf('goto') == 0 && caller && caller.indexOf('while') >= 0) {
                p(ident + '    break;\n');
            } else {
                o.print(p, ident + '    ', type);
            }
        });
    }
    var If = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input If (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'if';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'if (' + this.cmp + ') {\n');
            print_content(p, ident, caller, this.array, this.type);
            if (this.else) {
                p(ident + '}');
            } else {
                p(ident + '}\n');
            }
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var Else = function(start, end, cond) {
        this.cmp = null;
        if (cond && cond.a && cond.b && cond.cmp && get_cmp(cond.cmp)) {
            this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
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
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var ElseBreak = function(start, end, cond) {
        this.cmp = null;
        if (cond && cond.a && cond.b && cond.cmp && get_cmp(cond.cmp)) {
            this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
            this.type = 'elsebreak';
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
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
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var While = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input While (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'while';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'while (' + this.cmp + ') {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '}\n\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var IfContinue = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input IfContinue (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'ifcontinue';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'if (' + this.cmp + ') {\n');
            p(ident + '    continue;\n');
            p(ident + '}\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var IfBreak = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input IfBreak (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'ifbreak';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'if (' + this.cmp + ') {\n');
            p(ident + '    break;\n');
            p(ident + '}\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var IfGoto = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input IfGoto (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'ifgoto';
        // TODO: check if for ppc this was wrong too (probably was).
        this.cmp = cond.a.toString() + get_cmp(cond.cmp, true) + cond.b.toString();
        this.start = start;
        this.end = start;
        this.goto = end;
        this.array = [];
        this.add = function(x) {
            if (!x) {
                throw new Error('Invalid input IfGoto:add null');
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'if (' + this.cmp + ') {\n');
            p(ident + '    goto label_' + this.goto.toString(16) + ';\n');
            p(ident + '}\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var DoWhile = function(start, end, cond) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !get_cmp(cond.cmp)) {
            throw new Error('Invalid input DoWhile (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'dowhile';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'do {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '} while (' + this.cmp + ');\n\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    var For = function(start, end, cond, init, sum) {
        if (!cond || !cond.cmp || !cond.a || !cond.b || !init || !sum || !get_cmp(cond.cmp, true)) {
            throw new Error('Invalid input For (' + (cond ? (cond.a + ', ' + cond.b + ', ' + cond.cmp) : 'cond:null') + ')');
        }
        this.type = 'for';
        this.cmp = cond.a.toString() + get_cmp(cond.cmp, true) + cond.b.toString();
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
            //p(ident + '// start: ' + this.start.toString(16) + '\n');
            p(ident + 'for (' + this.init + '; ' + this.cmp + '; ' + this.sum + ') {\n');
            print_content(p, ident, '', this.array, this.type);
            p(ident + '}\n\n');
            //p(ident + '//   end: ' + this.end.toString(16) + '\n');
        };
    };
    return {
        DoWhile: DoWhile,
        While: While,
        Else: Else,
        If: If,
        IfContinue: IfContinue,
        IfBreak: IfBreak,
        IfGoto: IfGoto,
        ElseBreak: ElseBreak,
        For: For
    };
})();