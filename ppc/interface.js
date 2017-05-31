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
    return function(utils) {
        this.utils = utils;
        this.prepare = function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        }
        this.preprocess = function(array) {
            for (var i = 0; i < assembly.length; i++) {
                array = assembly[i](array);
            }
            return array;
        }
        this.analyze = function(data) {
            data.ops = this.preprocess(data.ops);
            var fcn = new utils.conditional.Function(data.name);
            fcn.array = data.ops;
            //searching for FOR(;;){} flows
            for (var i = 0; i < fcn.size(); i++) {
                var e = fcn.get(i);
                if (e.type == 'call') {
                    var next = fcn.get(i + 2);
                    if (next.opcode && next.opcode.match(/r\d+\s\=\sr3;/)) {
                        var reg = next.opcode.match(/r\d+\s\=\s/);
                        next.opcode = null;
                        e.opcode = reg + e.opcode;
                    }
                    var regs = [];
                    var found = [];
                    for (var j = i - 10; j < i; j++) {
                        if (j < 0) continue;
                        var next = fcn.get(j);
                        if (next.opcode && next.opcode.match(/r[3-9]\s\=/)) {
                            next.comments.push(next.opcode);
                            var reg = next.opcode.match(/r[3-9]/)[0];
                            if (found.indexOf(reg) < 0) {
                                found.push(reg);
                                next.opcode = next.opcode.replace(/r[3-9]\s\=|;/g, '').trim();
                                regs.push([reg, next.opcode]);
                            } else {
                                next.opcode = next.opcode.replace(/r[3-9]\s\=|;/g, '').trim();
                                regs[found.indexOf(reg)] = [reg, next.opcode];
                            }
                            next.opcode = null;
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
                        for (var i = 0, j = 3; i < regs.length; i++) {
                            if (('r' + j) == regs[i][0]) {
                                j++;
                                e.opcode += regs[i][1] + ', ';
                            }
                        }
                        e.opcode = e.opcode.substr(0, e.opcode.length - 2) + ');';
                    }
                }
                var regex = e.opcode ? e.opcode.match(/r\d+\s=\s\d+;/) : null;
                if (regex && regex.length == 1) {
                    // found rXX = N;
                    var reginit = e.opcode.match(/r\d+/)[0];
                    var jmp = fcn.get(i + 1);
                    if (jmp.jump > jmp.offset && jmp.opcode && jmp.opcode.indexOf('goto') == 0) {
                        for (var j = i + 2; j < fcn.size(); j++) {
                            var next = fcn.get(j);
                            if (next.offset > jmp.jump) break;
                            if (next.offset == jmp.jump && fcn.get(j + 1).cond) {
                                var sum = fcn.get(j - 1);
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
                                    jmp.opcode = null;
                                    sum.opcode = null;
                                    next.label = null;
                                    e.opcode = null;
                                    utils.controlflow.for(fcn.array, i, j + 1, utils.conditional, reginit, regsum);
                                }
                            }
                        }
                    }
                }
            }
            //searching for bottom up control flows
            for (var i = fcn.size() - 1; i >= 0; i--) {
                var e = fcn.get(i);
                if (e.cond && e.jump < e.offset) {
                    utils.controlflow(fcn.array, i, utils.conditional);
                }
                /*else if (e.jump < e.offset && e.opcode && e.opcode.indexOf('goto') == 0) {
                    var start = utils.controlflow.find(fcn.array, e.offset, e.jump);
                    fcn.get(start).label = null;
                    e.opcode = null;
                    utils.controlflow.while(fcn.array, start, i, utils.conditional, {
                        a: 'true',
                        b: '',
                        cmp: 'INF'
                    });
                }*/
            }
            //searching for top down control flows
            for (var i = 0; i < fcn.size(); i++) {
                var e = fcn.get(i);
                if (e.cond) {
                    utils.controlflow(fcn.array, i, utils.conditional);
                }
            }
            return fcn;
        };
    };
})();