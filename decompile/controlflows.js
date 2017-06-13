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
    var Conditional = require("./conditional.js");
    var _is_infinite_loop = function(offset, jump) {
        return offset.eq(jump);
    }

    var _is_infinite_if_else = function(offset, jump) {
        return offset.lt(jump);
    }

    var _is_infinite_do_while = function(offset, jump) {
        return offset.gt(jump);
    }

    var ControlFlows = function(instructions, index) {
        var flow = null;
        var op = instructions[index];
        var cond = op.cond;
        var at = op.jump.eq(op.offset) ? index : ControlFlows.search(instructions, op.jump);
        if (at < 0) {
            if (instructions[index].type == 'IF') {
                flow = ControlFlows.Else(op.offset, op.offset, cond);
            } else {
                flow = ControlFlows.If(op.offset, op.offset, cond);
            }
            flow.type += '_GOTO';
            var removed = instructions.splice(index, 1, flow);
            op.setGoto();
            op.setConditional();
            flow.addElements(removed);
        } else if (_is_infinite_loop(op.offset, op.jump)) {
            op.setConditional('true', '', 'INF');
            flow = ControlFlows.If(op.offset, op.offset, op.cond);
            var removed = instructions.splice(index, 1, flow);
            op.setConditional();
            flow.addElements(removed);
        } else if (_is_infinite_if_else(op.offset, op.jump)) {
            var last = instructions[index];
            op.setConditional();
            if (instructions[index].type == 'IF') {
                flow = ControlFlows.Else(op.offset, op.jump, cond);
            } else {
                flow = ControlFlows.If(op.offset, op.jump, cond);
            }
            var removed = instructions.splice(index, at - index, flow);
            flow.addElements(removed);
        } else if (_is_infinite_do_while(op.offset, op.jump)) {
            var last = instructions[index];
            op.setConditional();
            flow = ControlFlows.DoWhile(op.offset, op.jump, cond);
            var removed = instructions.splice(at, index - at, flow);
            flow.addElements(removed);
        }
        return flow;
    };

    ControlFlows.search = function(array, offset) {
        if (offset && offset.gte(array[0].offset)) {
            for (var i = 0; i < array.length; i++) {
                if (array[i].isAt(offset)) return i;
            };
        }
        return -1;
    };
    ControlFlows.special = function(instructions, start, end, flow) {
        var removed = instructions.splice(start, end - start, flow);
        flow.addElements(removed);
        return flow;
    };
    ControlFlows.If = function(start, end, cond) {
        var conditional = new Conditional('IF', start, end, cond, false);
        conditional.setHeader('if (#) {');
        return conditional;
    };
    ControlFlows.Else = function(start, end, cond) {
        var conditional = new Conditional('ELSE', start, end, cond, false);
        if (cond) {
            conditional.setHeader('else if (#) {');
        } else {
            conditional.setHeader('else {');
        }
        return conditional;
    };
    ControlFlows.DoWhile = function(start, end, cond) {
        var conditional = new Conditional('DO_WHILE', start, end, cond, true);
        conditional.setHeader('do {');
        conditional.setTrailer('} while(#);');
        return conditional;
    };
    ControlFlows.While = function(start, end, cond) {
        var conditional = new Conditional('WHILE', start, end, cond, false);
        conditional.setHeader('while(#) {');
        return conditional;
    };
    ControlFlows.For = function(start, end, cond, begin, increase) {
        var conditional = new Conditional('FOR', start, end, cond, false);
        if (!begin) {
            begin = '';
        }
        if (!increase) {
            increase = '';
        } else {
            increase = ' ' + increase;
        }
        conditional.setHeader('for(' + begin + '; #;' + increase + ') {');
        return conditional;
    };
    return ControlFlows;
})();