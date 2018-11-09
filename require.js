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
        if (arguments.callee.loaded[x]) {
            return arguments.callee.loaded[x];
        }
        var module = {
            exports: null
        };
        var src = ___internal_require(x);
        eval(src);
        arguments.callee.src[x] = src.split('\n');
        arguments.callee.loaded[x] = module.exports;
        return module.exports;
    } catch (ee) {
        console.log('Exception from ' + x);
        console.log(ee.stack);
    }
};
require.loaded = {};
require.src = {};

(function() {
    var _find_function_name = function(line, src) {
        for (var i = line; i >= 0; i--) {
            var result = src[i].match(/([_\w]+)\s{0,100}=\s{0,100}function\s{0,100}\(|function\s+([_\w]+)\s{0,100}\(|([_\w]+)\s{0,100}:\s{0,100}function\s{0,100}\(/);
            if (result) {
                return result[3] || result[2] || result[1];
            }
        }
        return '[unknown]';
    };

    var _find_line_number = function(srcline) {
        var result = srcline.match(/\([_\w]+:(\d+)/);
        if (result) {
            try {
                return parseInt(result[1]) - 1;
            } catch (e) {}
        }
        return -1;
    };

    var _find_file_from_line = function(variable, line) {
        if (!variable) {
            return null;
        }
        var regex = new RegExp('\\b' + variable + '\\b');
        for (var filename in require.src) {
            var srcx = require.src[filename][line];
            if (srcx && srcx.trim().indexOf('* ') != 0 && srcx.match(regex)) {
                var funcname = _find_function_name(line, require.src[filename]);
                return {
                    filename: filename,
                    funcname: funcname
                };
            }
        }
        return null;
    };

    var _replace_stack_data = function(variable, stack) {
        if (variable) {
            variable = variable[1];
            stack = stack.split('\n');
            // skipping last line due evaluation.
            for (var i = 0; i < stack.length - 1; i++) {
                if (!stack[i].match(/^\s+at\s/) || (stack[i].indexOf('input:') <= 0 && stack[i].indexOf('eval:') <= 0)) {
                    continue;
                }
                var line = _find_line_number(stack[i]);
                var data = _find_file_from_line(variable, line);
                if (data) {
                    stack[i] = stack[i].replace(/\binput\b:/, data.filename + ':');
                    stack[i] = stack[i].replace(/\[anon\] /, data.funcname + ' ');
                    variable = data.funcname;
                } else {
                    stack[i] = stack[i].replace(/\[anon\] /, '[unknown] ');
                    break;
                }
            }

            stack = stack.join('\n');
            return stack.replace(/at r2dec_main \(eval:/, 'at r2dec_main (r2dec-duk:');
        }
        return stack;
    };

    var _extract_variable = function(exception) {
        var variable = exception.message.match(/'([-_\w]+)'/);
        if (!variable) {
            var lines = exception.stack.split('\n');
            var magic = ':' + exception.lineNumber + ')';
            for (var i = lines.length - 1; i >= 0; i--) {
                if (lines[i].indexOf(magic) > 0) {
                    variable = lines[i - 1].match(/at\s([\w_]+)\s/);
                    break;
                }
            }
        }
        return variable;
    };

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
                    lineNumber: '' + err.lineNumber
                };
                exception.stack = _replace_stack_data(_extract_variable(exception), exception.stack);
                return exception;
            }
        } catch (e) {
            console.log('Duktape.errCreate exception.');
            console.log(e.stack);
        }
        return err;
    };

})();