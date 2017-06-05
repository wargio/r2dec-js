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
    assembly.push(require("./load.js"));
    assembly.push(require("./cond.js"));
    assembly.push(require("./math.js"));
    assembly.push(require("./asm.js"));

    var function_stack = function(fcn, utils) {
        var vars = [];
        var count = 0;
        var stack = false;
        if (fcn.get(0).opcode == '*--esp = rbp;') {
            var e = fcn.get(0);
            //e.comments.push(e.opcode);
            e.opcode = null;
            for (var i = 1; i < fcn.size(); i++, count++) {
                e = fcn.get(i);
                if (!e.opcode) {
                    continue;
                }
                if (e.opcode == 'rbp = rsp;') {
                    //e.comments.push(e.opcode);
                    e.opcode = null;
                } else if (e.opcode == 'rbp = *esp++;') {
                    //e.comments.push(e.opcode);
                    e.opcode = null;
                } else if (e.opcode.indexOf('rsp -= ') == 0 && !stack) {
                    //e.comments.push(e.opcode);
                    stack = true;
                    e.opcode = null;
                }
            }
            for (var i = fcn.size() - 1; i >= 0; i--) {
                var e = fcn.get(i);
                if (!e.opcode) {
                    continue;
                }
                if (e.opcode.indexOf('rsp += ') == 0 && !stack) {
                    //e.comments.push(e.opcode);
                    break;
                }
            }
        }
    };

    var function_if_else = function(array, utils) {
        var labels = [];
        //searching for top down control flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e.cond && e.jump >= e.offset) {
                var flow = utils.controlflow(array, i, utils.conditional);
                if (flow.type == 'ifgoto') {
                    labels.push(flow.goto);
                }
            }
        }
        return labels;
    }

    var recursive_anal = function(array, utils) {
        var labels = [];
        //subroutines_return_args(array, utils);
        //function_for(array, utils);
        labels = labels.concat(function_if_else(array, utils));
        //function_loops(array, utils);
        for (var i = 0; i < array.length; i++) {
            if (array[i].print) {
                labels = labels.concat(recursive_anal(array[i].array, utils));
            }
        }
        return labels;
    };

    var recursive_label = function(array, offset) {
        for (var i = 0; i < array.length; i++) {
            if (offset >= array[i].start && offset <= array[i].end) {
                // console.log(i + ": ");
                // console.log(array[i]);
                recursive_label(array[i].array, offset);
                return;
            } else if (array[i].offset == offset) {
                // console.log(i + ": ");
                // console.log(array[i]);
                array[i].label = 'label_' + offset.toString(16);
                return;
            } else if (array[i].end > offset || array[i].offset > offset) {
                break;
            }
        }
        console.log('failed to find: ' + offset.toString(16))
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
            data.ops = this.preprocess(data.ops);
            var fcn = new utils.conditional.Function(data.name);
            fcn.array = data.ops;
            function_stack(fcn, utils);
            var labels = recursive_anal(fcn.array, utils);
            for (var i = 0; i < labels.length; i++) {
                //console.log(labels[i].toString(16));
                recursive_label(fcn.array, labels[i]);
            }
            return fcn;
        };
    };
})();