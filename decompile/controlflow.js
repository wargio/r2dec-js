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
    var find = function(array, current, search) {
        if (search.gt(array[current].offset)) {
            for (var i = current; i < array.length; i++) {
                if (search.eq(array[i].offset) || (!array[i].isAt && search.lte(array[i].end) && array[i].start.gte(search))) return i;
            };
        } else {
            for (var i = 0; i < current; i++) {
                if ((array[i].offset && search.eq(array[i].offset)) || (!array[i].isAt && search.lte(array[i].end) && array[i].start.gte(search))) return i;
            };
        }
        return -1;
    };
    var controlflow = function(array, start, conditional) {
        var flow = null;
        var e = array[start];
        var last = array[start - 1];
        if (e.jump.gt(e.offset)) {
            var end = find(array, start, e.jump);
            var cond = e.cond;
            if (end < 0) {
                end = start;
                // do not add e.jump - 4 since it's added in a different way.
                flow = new conditional.IfGoto(e.offset, e.jump, e.cond);
            } else if (last && last.type && last.type.indexOf('if') == 0) {
                flow = new conditional.Else(e.offset, e.jump.sub(e.size), e.cond);
                last.else = true;
            } else {
                flow = new conditional.If(e.offset, e.jump.sub(e.size), e.cond);
            }
            e.cond = null;
            var removed = array.splice(start, end - start, flow);
            for (var i = 0; i < removed.length; ++i) {
                e = removed[i];
                //if (e && e.cond) {
                //    e = controlflow(removed, i, conditional);
                //}
                flow.add(e);
            }
            if (flow.size() == 0) {
                if (flow.type == 'if') {
                    flow = new conditional.IfBreak(e.offset, e.jump.sub(e.size), cond);
                    array.splice(start, 1, flow);
                } else if (flow.type == 'else') {
                    flow = new conditional.ElseBreak(e.offset, e.jump.sub(e.size), cond);
                    array.splice(start, 1, flow);
                }
            }
        } else if (e.jump.lt(e.offset)) {
            var end = start;
            var cond = e.cond;
            start = find(array, start, e.jump);
            if (start < 0) {
                start = end;
                // do not add e.jump - 4 since it's added in a different way.
                flow = new conditional.IfGoto(e.offset, e.jump, e.cond);
            } else {
                flow = new conditional.DoWhile(array[start].offset, array[end].offset, e.cond);
            }
            e.cond = null;
            var removed = array.splice(start, end - start, flow);
            for (var i = 0; i < removed.length; ++i) {
                e = removed[i];
                //if (e && e.cond) {
                //    e = controlflow(removed, i, conditional);
                //}
                flow.add(e);
            }
            if (false && flow.size() == 0) {
                flow = new conditional.IfContinue(array[start].offset, array[end].offset, cond);
                array.splice(start, 1, flow);
            }
        } else {
            flow = new conditional.While(start, start, 'true', '', 'INF');
            array.splice(start, 0, flow);
        }
        return flow;
    };
    controlflow.find = find;
    controlflow.for = function(array, start, end, conditional, init, sum) {
        var e = array[end];
        var flow = new conditional.For(array[start].offset, e.offset, e.cond, init, sum);
        if (e.jump < e.offset) {
            e.cond = null;
            var removed = array.splice(start, end - start, flow);
            for (var i = 0; i < removed.length; ++i) {
                e = removed[i];
                //if (e && e.cond) {
                //    e = controlflow(removed, i, conditional);
                //}
                flow.add(e);
            }
        }
        return flow;
    };
    controlflow.while = function(array, start, end, conditional, cond) {
        var e = array[end];
        var flow = new conditional.While(start, end, cond);
        if (e.jump < e.offset) {
            var removed = array.splice(start, end - start, flow);
            for (var i = 0; i < removed.length; ++i) {
                e = removed[i];
                if (e && e.cond) {
                    e = controlflow(removed, i, conditional);
                }
                flow.add(e);
            }
        }
        return flow;
    };
    return controlflow;
})();