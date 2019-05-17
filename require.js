/* 
 * Copyright (c) 2017-2018, pancake <pancake@nopcode.org>, Giovanni Dante Grazioli <deroad@libero.it>
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

var include = function(x) {
    return ___internal_load(x);
};
var require = function(x) {
    try {
        if (arguments.callee.stack[x]) {
            console.log("Circular dependency found.", x);
            return null;
        }
        if (arguments.callee.loaded[x]) {
            return arguments.callee.loaded[x];
        }
        arguments.callee.stack[x] = true;
        var src = ___internal_require(x);
        arguments.callee.loaded[x] = (src)();
        arguments.callee.stack[x] = false;
        return arguments.callee.loaded[x];
    } catch (ee) {
        console.log('Exception from ' + x);
        console.log(ee.stack);
    }
};
require.loaded = {};
require.stack = {};

/**
 * https://github.com/svaarala/duktape/blob/master/doc/error-objects.rst
 * 
 * this is required to be the first thing to be setup
 * when there is an exception i want to have the whole
 * stack to be printed.
 */
Duktape.errCreate = function(err) {
    try {
        if (typeof err === 'object') {
            var exception = {
                message: '' + err.message,
                stack: '' + err.stack,
                lineNumber: '' + err.lineNumber,
            };
            return exception;
        }
    } catch (e) {
        console.log('Duktape.errCreate exception.');
        console.log(e.stack);
    }
    return err;
};