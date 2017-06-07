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
    var assembly = [];
    assembly.push(require("./return.js"));
    assembly.push(require('./loadimm.js'));
    assembly.push(require('./spr.js'));
    assembly.push(require('./load.js'));
    assembly.push(require('./cond.js'));
    assembly.push(require("./memory.js"));
    assembly.push(require('./math.js'));
    assembly.push(require("./asm.js"));

    var function_stack = function(fcn, utils) {
        var vars = [];
        var count = 0;
        // searching for *(((uint[64|32]_t*) r1) - N) = r1;
        if (fcn.get(0).opcode && fcn.get(0).opcode.match(/\*\(\(\(uint[36][24]_t\*\)\sr1\)\s[-+]\s\d+\)\s=\sr1/)) {
            var e = fcn.get(0);
            e.invalidate();
            for (var i = 1; i < fcn.size(); i++, count++) {
                e = fcn.get(i);
                if (count < 5 && e.opcode && (e.opcode.indexOf('mflr') > 0 ||
                        e.opcode.match(/\*\(\(\(u?int[36][24]_t\*\)\sr1\)\s[-+]\s\d+\)\s=\sr\d/))) {
                    if (e.opcode.indexOf('mflr') > 0 || e.opcode.indexOf(' = r0;') > 0) {
                        e.invalidate();
                    } else {
                        var type = e.opcode.match(/u?int[36][24]_t/)[0];
                        e.opcode = type + ' ' + e.opcode.match(/r\d\d/)[0] + ";";
                        var reg = e.opcode.match(/r\d\d/)[0];
                        vars.push(reg);
                    };
                    count = 0;
                } else if (e.opcode && (e.opcode.indexOf('mtlr') > 0 ||
                        e.opcode.indexOf('r0 = *(((') == 0 ||
                        e.opcode.match(/r1\s\+=\s[x\da-f]+;/) ||
                        e.opcode.match(/r\d\d\s=\s\*\(\(\(u?int[36][24]_t\*\)\sr1\)\s[-+]\s\d+\);/))) {
                    e.invalidate();
                } else if (e.opcode && e.opcode.match(/r\d+\s=\sr[3-9];/)) {
                    var regs = e.opcode.match(/r\d+/g);
                    var index = vars.indexOf(regs[0]);
                    if (index >= 0) {
                        vars.splice(index, 1);
                        fcn.setArg(regs[1]);
                    }
                }
            }
        }
    };

    var function_if_else = function(array, utils) {
        var labels = [];
        //searching for top down control flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e.cond && e.jump.ge(e.offset)) {
                var flow = utils.controlflow(array, i, utils.conditional);
                if (flow.type == 'ifgoto') {
                    labels.push(flow.goto);
                }
            }
        }
        return labels;
    }

    var function_for = function(array, utils) {
        //searching for FOR(;;){} flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            var regex = e.opcode ? e.opcode.match(/r\d+\s=\s\d+;/) : null;
            if (regex && regex.length == 1) {
                // found rXX = N;
                var reginit = e.opcode.match(/r\d+/)[0];
                var jmp = array[i + 1];
                if (jmp && jmp.offset.le(jmp.jump) && jmp.opcode && jmp.opcode.indexOf('goto') == 0) {
                    for (var j = i + 2; j < array.length; j++) {
                        var next = array[j];
                        if (next.offset.gt(jmp.jump)) break;
                        if (next.offset.eq(jmp.jump) && array[j + 1].cond) {
                            var sum = array[j - 1];
                            var regsum = null;
                            regex = sum.opcode.match(/r\d+\s\+=\s\d+;/);
                            if (regex && regex.length == 1) {
                                // found: rXX += K;
                                regsum = sum.opcode.match(/r\d+/)[0];
                                if (regsum == reginit) {
                                    regsum = sum.opcode.match(/r\d+\s\+=\s\d+/)[0];
                                } else {
                                    regsum = null;
                                }
                            } else if (sum.opcode.match(/r\d+\s=\sr\d+\s\+\s\d+;/).length == 1) {
                                // found: rXX = rYY + K;
                                regsum = sum.opcode.match(/r\d+/)[0];
                                if (regsum == reginit) {
                                    regsum = sum.opcode.match(/r\d+\s=\sr\d+\s\+\s\d+/)[0];
                                } else {
                                    regsum = null;
                                }
                            }
                            if (regsum) {
                                reginit = e.opcode.match(/r\d+\s=\s\d+/)[0];
                                jmp.invalidate();
                                sum.invalidate();
                                next.label = null;
                                e.invalidate();
                                utils.controlflow.for(array, i, j + 1, utils.conditional, reginit, regsum);
                            }
                        }
                    }
                }
            }
        }
    };

    var subroutines_return_args = function(array, utils) {
        //searching calls and for flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e.type == 'call' && !e.used && e.opcode.indexOf('r3 = ') < 0) {
                var next = null;
                e.used = true;
                for (var j = i + 1; j < i + 4; j++) {
                    next = array[j];
                    if (next) {
                        if (next.opcode && next.opcode.match(/r\d\d\s=\sr3;/)) {
                            e.opcode = 'r3 = ' + e.opcode;
                            break;
                        } else if (next.cond || (next.cmp && next.cmp.indexOf('r3') >= 0)) {
                            e.opcode = 'r3 = ' + e.opcode;
                            break;
                        }
                    }
                }
                var regs = [];
                var found = [];
                var check = [];
                for (var j = i - 1; j > i - 10; j--) {
                    if (j < 0) {
                        break;
                    }
                    next = array[j];
                    if ((next.opcode && next.opcode.indexOf('goto') == 0) || next.type == 'call') {
                        break;
                    }
                    if (next.opcode && next.opcode.match(/r[3-9]\s.?\=/)) {
                        var reg = next.opcode.match(/r[3-9]/)[0].trim();
                        if (found.indexOf(reg) < 0) {
                            //next.comments.push(next.opcode);
                            found.push(reg);
                            var arg = next.opcode.replace(/r[3-9]\s.?\=|;/g, '').trim();
                            if (next.opcode.match(/r[3-9]\s.\=/)) {
                                var op = next.opcode.match(/r[3-9]\s.\=/)[0].replace(/r[3-9]\s|\=/g, '').trim();
                                if (arg.charAt(0) == '-') {
                                    op = '-';
                                    arg = arg.substr(1, arg.length);
                                }
                                arg = reg + ' ' + op + ' ' + arg;
                            }
                            regs.push([reg, arg]);
                            next.invalidate();
                        }
                    }
                }
                if (regs.length > 0) {
                    e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                    regs.sort(function(a, b) {
                        return parseInt(a[0].charAt(1)) - parseInt(b[0].charAt(1));
                    });
                    if (regs[0][0] == 'r4') {
                        regs.splice(0, 0, ['r3', 'r3']);
                    }
                    if (regs[0][0] == 'r3') {
                        for (var k = 0, j = 3; k < regs.length; k++) {
                            if (('r' + j) == regs[k][0]) {
                                j++;
                                e.opcode += regs[k][1] + ', ';
                            }
                        }
                        e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                    }
                    e.opcode += ');';
                }
            }
        }
    };

    var function_loops = function(array, utils) {
        //searching for bottom up control flows
        for (var i = array.length - 1; i >= 0; i--) {
            var e = array[i];
            if (e && e.cond && e.offset.ge(e.jump)) {
                utils.controlflow(array, i, utils.conditional, -1);
            }
            /*else if (e.offset && e.offset.ge(e.jump) && e.opcode && e.opcode.indexOf('goto') == 0) {
                    var start = utils.controlflow.find(array, i, e.jump);
                    array[start].label = null;
                    e.invalidate();
                    utils.controlflow.while(array, start, i, utils.conditional, {
                        a: 'true',
                        b: '',
                        cmp: 'INF'
                    });
                }*/
        }
    };

    var recursive_anal = function(array, utils) {
        var labels = [];
        subroutines_return_args(array, utils);
        function_for(array, utils);
        labels = labels.concat(function_if_else(array, utils));
        function_loops(array, utils);
        for (var i = 0; i < array.length; i++) {
            if (!array[i].isAt) {
                labels = labels.concat(recursive_anal(array[i].array, utils));
            }
        }
        return labels;
    };

    var recursive_label = function(array, offset) {
        for (var i = 0; i < array.length; i++) {
            if (offset.ge(array[i].start) && offset.le(array[i].end)) {
                // console.log(i + ": ");
                // console.log(array[i]);
                recursive_label(array[i].array, offset);
                return;
            } else if (offset.eq(array[i].offset)) {
                // console.log(i + ": ");
                // console.log(array[i]);
                array[i].label = 'label_' + offset;
                return;
            } else if (offset.le(array[i].end) || offset.le(array[i].offset)) {
                break;
            }
        }
        console.log('failed to find: ' + offset);
    };

    return function() {
        this.utils = null;
        this.prepare = function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        };
        this.preprocess = function(array) {
            assembly.forEach(function(fcn) {
                array = fcn(array);
            });
            return array;
        };
        this.analyze = function(data) {
            var fcn = new this.utils.Function(data);
            function_stack(fcn, this.utils);
            var labels = recursive_anal(fcn.opcodes, this.utils);
            for (var i = 0; i < labels.length; i++) {
                //console.log(labels[i].toString(16));
                recursive_label(fcn.opcodes, labels[i]);
            }
            return fcn;
        };
    };
})();