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
    assembly.push(require('./load.js'));
    assembly.push(require('./cond.js'));
    assembly.push(require('./math.js'));
    assembly.push(require("./asm.js"));

    var function_stack = function(fcn, utils) {
        var vars = [];
        // searching for *(((uint[64|32|16|8]_t*) sp) - N) = regs;
        for (var i = 1; i < fcn.size(); i++) {
            var e = fcn.get(i);
            if (!e.opcode) {
                continue;
            }
            //should be better to have a limit..
            if (e.opcode.match(/a[0-3]\s=\s/)) {
                var regs = e.opcode.match(/a\d/);
                var index = vars.indexOf(regs[0]);
                if (index < 0) {
                    vars.push(regs[0]);
                }
            } else if (e.opcode.indexOf('sp') >= 0) {
                //e.comments.push(e.opcode);
                if (e.opcode.indexOf(' sp)') > 0 && e.opcode.indexOf('s') > 0 && e.opcode.match(/s[0-7]/)) {
                    var type = e.opcode.match(/u?int[1368][624]?_t/)[0];
                    e.opcode = type + ' ' + e.opcode.match(/s[0-7]/)[0] + ";";
                } else if (e.opcode.indexOf('sp') == 0) {
                    e.invalidate();
                }
            }
        }
        if (vars.length > 0) {
            vars.sort();
            if (vars[0] == 'a0') {
                for (var i = 0; i < vars.length; i++) {
                    fcn.setArg(vars[i]);
                }
            }
        }
        // searching for regs = *(((uint[64|32|16|8]_t*) sp) - N);
        for (var i = fcn.size() - 1; i >= 0; i--) {
            var e = fcn.get(i);
            if (!e.opcode || e.opcode.indexOf("return") == 0) {
                continue;
            }
            if (e.opcode.indexOf(' sp)') < 0 && !e.opcode.match(/[frs][ap0-7]\s=\s/)) {
                break;
            }
            //e.comments.push(e.opcode);
            e.invalidate();
        }
    };

    var function_if_else = function(array, utils) {
        var labels = [];
        //searching for top down control flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e.cond && e.offset.lt(e.jump)) {
                var flow = utils.controlflow(array, i, utils.conditional);
                if (flow.type == 'ifgoto') {
                    labels.push(flow.goto);
                }
            }
        }
        return labels;
    }

    var function_for = function(array, utils) {};

    var subroutines_return_args = function(array, utils) {};

    var function_loops = function(array, utils) {
        //searching for bottom up control flows
        for (var i = array.length - 1; i >= 0; i--) {
            var e = array[i];
            if (e && e.cond && e.offset.gte(e.jump)) {
                utils.controlflow(array, i, utils.conditional, -1);
            }
            /*else if (e.jump.lt(e.offset) && e.opcode && e.opcode.indexOf('goto') == 0) {
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
            if (array[i].start && offset.gte(array[i].start) && offset.lte(array[i].end)) {
                recursive_label(array[i].array, offset);
                return;
            } else if (array[i].isAt && offset.eq(array[i].offset)) {
                array[i].label = 'label_' + offset;
                return;
            } else if ((array[i].end && offset.lte(array[i].end)) || (array[i].offset && offset.lte(array[i].offset))) {
                break;
            }
        }
        console.log('failed to find: ' + offset);
    };

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