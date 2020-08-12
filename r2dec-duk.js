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

/**
 * Global data accessible from everywhere.
 * @type {Object}
 */
var Global = {
    context: null,
    evars: null,
    printer: null,
    argdb: null,
    warning: require('libdec/warning')
};


/**
 * Imports.
 */
var libdec = require('libdec/libdec');
var r2util = require('libdec/r2util');
var r2pipe = require('libdec/r2pipe');

function decompile_offset(architecture, fcnname) {
    var data = new r2util.data();
    Global.argdb = data.argdb;
    // af seems to break renaming.
    /* asm.pseudo breaks things.. */
    if (data.graph && data.graph.length > 0) {
        var p = new libdec.core.session(data, architecture);
        var arch_context = architecture.context(data);
        libdec.core.analysis.pre(p, architecture, arch_context);
        libdec.core.decompile(p, architecture, arch_context);
        libdec.core.analysis.post(p, architecture, arch_context);
        libdec.core.print(p);
    } else if (Global.evars.extra.allfunctions) {
        Global.context.printLog('Error: Please analyze the ' + fcnname + ' first.', true);
    } else {
        Global.context.printLog('Error: no data available.\nPlease analyze the function/binary first.', true);
    }
}

/**
 * r2dec main function.
 * @param  {Array} args - r2dec arguments to be used to configure the output.
 */
function r2dec_main(args) { // lgtm [js/unused-local-variable] 
    var Printer = require('libdec/printer');
    var lines = null;
    var errors = [];
    var log = [];
    try {
        Global.evars = new r2util.evars(args);
        r2util.sanitize(true, Global.evars);
        if (r2util.check_args(args)) {
            r2util.sanitize(false, Global.evars);
            return;
        }

        // theme (requires to be initialized after evars)
        Global.printer = new Printer();

        var architecture = libdec.archs[Global.evars.arch];

        if (architecture) {
            Global.context = new libdec.context();
            if (Global.evars.extra.allfunctions) {
                var current = r2pipe.string('s');
                var functions = r2pipe.json64('aflj');
                functions.forEach(function(x) {
                    if (x.name.startsWith('sym.imp.') || x.name.startsWith('loc.imp.')) {
                        return;
                    }
                    r2pipe.string('s 0x' + x.offset.toString(16));
                    Global.context.printLine("");
                    Global.context.printLine(Global.printer.theme.comment('/* name: ' + x.name + ' @ 0x' + x.offset.toString(16) + ' */'));
                    decompile_offset(architecture, x.name);
                });
                r2pipe.string('s ' + current);
                var o = Global.context;
                Global.context = new libdec.context();
                Global.context.macros = o.macros;
                Global.context.dependencies = o.dependencies;
                Global.context.printLine(Global.printer.theme.comment('/* r2dec pseudo code output */'));
                Global.context.printLine(Global.printer.theme.comment('/* ' + Global.evars.extra.file + ' */'));
                if (['java', 'dalvik'].indexOf(Global.evars.arch) < 0) {
                    Global.context.printMacros(true);
                    Global.context.printDependencies(true);
                }
                o.lines = Global.context.lines.concat(o.lines);
                Global.context = o;
            } else {
                decompile_offset(architecture);
            }
            errors = errors.concat(Global.context.errors);
            log = log.concat(Global.context.log);
            lines = Global.context.lines;
        } else {
            errors.push(Global.evars.arch + ' is not currently supported.\n' +
                'Please open an enhancement issue at https://github.com/radareorg/r2dec-js/issues\n' +
                libdec.supported());
        }
        r2util.sanitize(false, Global.evars);
    } catch (e) {
        errors.push(r2util.debug(Global.evars, e));
    }

    var printer = Global.printer;
    if (!printer) {
        printer = new Printer();
    }
    printer.flushOutput(lines, errors, log, Global.evars.extra);
}