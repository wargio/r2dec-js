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
    var ControlFlows = null;
    var Metadata = null;
    var assembly = [];
    assembly.push(require("./stack.js"));
    assembly.push(require("./return.js"));
    assembly.push(require("./cond.js"));
    assembly.push(require("./math.js"));
    assembly.push(require("./asm.js"));

    var function_stack = function(fcn) {
        var vars = [];
        var count = 0;
        var stack = false;
        var e = fcn.get(0);
        if (e.opcode && e.opcode.indexOf('*--esp = r') == 0) {
            //e.comments.push(e.opcode);
            e.invalidate();
            for (var i = 1; i < fcn.size(); i++, count++) {
                e = fcn.get(i);
                if (!e.opcode) {
                    continue;
                }
                if (e.opcode.indexOf('*--esp = r') == 0) {
                    e.invalidate();
                } else if (e.opcode == 'rbp = rsp;') {
                    //e.comments.push(e.opcode);
                    e.invalidate();
                } else if (e.opcode.indexOf(' = *esp++;') > 0) {
                    //e.comments.push(e.opcode);
                    e.invalidate();
                } else if (e.opcode.indexOf('rsp -= ') == 0 && !stack) {
                    //e.comments.push(e.opcode);
                    stack = true;
                    e.invalidate();
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

    var function_if_else = function(array) {
        var labels = [];
        //searching for top down control flows
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e && e.cond && e.jump.gte(e.offset)) {
                var flow = ControlFlows(array, i);
                if (flow.type.indexOf('_GOTO') > 0) {
                    labels.push(flow.get(0).jump);
                }
            }
        }
        return labels;
    }

    var subroutines_return_args = function(array) {
        //searching for calls
        //        for (var i = 0; i < array.length; i++) {
        array.forEach(function(e, i) {
            if (e.type == 'call' && !e.used) {
                var args = [];
                // searching for return addr
                for (var j = i + 1; j < array.length && j < i + 6; j++) {
                    var n = array[j];
                    if (!n.opcode && n.isAt && !n.cond) {
                        continue;
                    } else if (!n.isAt) {
                        n = n.cmp;
                    } else if (n.cond) {
                        n = n.cond.a;
                        if (n.match(/[er]?ax[\);\s]?/)) {
                            // if /[er]?ax/ found then [er]?ax = fcn();
                            var reg = n.match(/[er]?ax/)[0];
                            e.opcode = reg + " = " + e.opcode;
                            break;
                        } else {
                            n = array[j].cond.b;
                        }
                    } else {
                        n = n.opcode;
                    }
                    if (n.match(/[er]?ax[\);\s]?/)) {
                        // if /[er]?ax/ found then [er]?ax = fcn();
                        var reg = n.match(/[er]?ax/)[0];
                        e.opcode = reg + " = " + e.opcode;
                        break;
                    }
                };
                // searching for args: edi, esi, edx, ecx, r8, r9, r10, r11
                for (var j = i - 1; j >= 0 && j >= i - 10; j--) {
                    var o = array[j].opcode;
                    if (!o) {
                        continue;
                    }
                    //searching for rdx, edx, edi, etc..
                    var regex = o.match(/[er][dscd][ix]\s=\s/);
                    if (regex) {
                        regex = regex[0].replace(/\s=\s/, '');
                        if (args.indexOf(regex) >= 0) {
                            break;
                        }
                        args.push(regex);
                    }
                    //searching for r9, r10d, r11b, etc..
                    regex = o.match(/r[189][01]?[bdw]?\s=\s/);
                    if (regex) {
                        regex = regex[0].replace(/\s=\s/, '');
                        if (args.indexOf(regex) >= 0) {
                            break;
                        }
                        args.push(regex);
                    }
                }
                if (args.length == 0) {
                    var push = [];
                    for (var j = i - 1; j >= 0 && j >= i - 10; j--) {
                        var o = array[j].opcode;
                        if (!o) {
                            continue;
                        }
                        //searching for push (the nearest to the function is first arg)...
                        // f(a, b, c)
                        //push c
                        //push b
                        //push a
                        //call f
                        if (o.indexOf('*--esp = ') == 0) {
                            //array[j].comments.push(o);
                            push.push(o.replace(/\*--esp\s=\s|;/g, ''));
                            array[j].invalidate();
                        }
                    }
                    if (push.length > 0) {
                        e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                        for (var k = 0; k < push.length; k++) {
                            e.opcode += push[k] + ', ';
                        }
                        e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                        e.opcode += ');';
                    }
                } else if (args.length > 0) {
                    var sorted = [/di/, /si/, /dx/, /cx/, /r8/, /r9/, /r10/, /r11/];
                    var found = [];
                    sorted.forEach(function(argcmp) {
                        var failed = true;
                        args.forEach(function(argv) {
                            var regex = argv.match(argcmp);
                            if (regex) {
                                found.push(argv);
                            }
                        });
                    });
                    e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                    if (found.length > 0) {
                        for (var k = 0; k < found.length; k++) {
                            e.opcode += found[k] + ', ';
                        }
                        e.opcode = e.opcode.substr(0, e.opcode.length - 2);
                    }
                    e.opcode += ');';
                }
            }
        });
    };

    var function_for = function(array) {};

    var subroutines_return_args = function(array) {};

    var function_loops = function(array) {
        var labels = [];
        //searching for bottom up control flows
        for (var i = array.length - 1; i >= 0; i--) {
            var e = array[i];
            if (e && e.cond) {
                var flow = ControlFlows(array, i);
                if (flow.type.indexOf('_GOTO') > 0) {
                    labels.push(flow.get(0).jump);
                }
            }
        }
        return labels;
    };

    var recursive_anal = function(array) {
        var labels = [];
        subroutines_return_args(array);
        function_for(array);
        labels = labels.concat(function_if_else(array));
        labels = labels.concat(function_loops(array));
        for (var i = 0; i < array.length; i++) {
            if (array[i].isControlFlow()) {
                labels = labels.concat(recursive_anal(array[i].instructions));
            }
        }
        return labels;
    };

    var recursive_label = function(array, offset) {
        for (var i = 0; i < array.length; i++) {
            var e = array[i];
            if (e.isAt(offset)) {
                if (e.isInstruction()) {
                    e.setLabel(true);
                } else {
                    recursive_label(e.instructions, offset);
                }
                return;
            }
        }
        console.log('failed to find: ' + offset.toString(16));
    };


    var Interface = function() {
        this.prepare = function(asm) {
            if (!asm) {
                return [];
            }
            var mem = '';
            if (asm.match(/\[.+\]/)) {
                mem = asm.match(/\[.+\]/)[0];
            }
            var ret = asm.replace(/\[.+\]/g, '#').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
            for (var i = 0; i < ret.length; i++) {
                if (ret[i] == '#')
                    ret[i] = mem;
            };
            return ret;
        };
        this.preprocess = function(array) {
            assembly.forEach(function(fcn) {
                array = fcn(array);
            });
            return array;
        };
        this.analyze = function(data) {
            var fcn = new Metadata.Function(data);
            function_stack(fcn);
            var labels = recursive_anal(fcn.opcodes);
            for (var i = 0; i < labels.length; i++) {
                //console.log(labels[i].toString(16));
                recursive_label(fcn.opcodes, labels[i]);
            }
            return fcn;
        };
    };
    Interface.setControlFlows = function(cf) {
        ControlFlows = cf;
    };
    Interface.setMetadata = function(md) {
        Metadata = md;
    };
    return Interface;
})();