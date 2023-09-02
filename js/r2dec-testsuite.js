// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import libdec from './libdec/libdec.js';
import Printer from './libdec/printer.js';
import TestSuite from './libdec/testsuite.js';

function main() {
    try {
        const test = new TestSuite();
        var Shared = Global();
        Shared.evars = test.evars;
        Shared.argdb = test.data.argdb;
        Shared.printer = new Printer();
        Shared.context = new libdec.context();
        var architecture = libdec.archs[Shared.evars.arch];
        // af seems to break renaming.
        /* asm.pseudo breaks things.. */
        if (test.data.graph && test.data.graph.length > 0) {
            var p = new libdec.core.session(test.data, architecture, Shared.evars);
            var arch_context = architecture.context(test.data);
            libdec.core.analysis.pre(p, architecture, arch_context);
            libdec.core.decompile(p, architecture, arch_context);
            libdec.core.analysis.post(p, architecture, arch_context);
            libdec.core.print(p);
            Shared.printer.flushOutput(Shared.context.lines, Shared.context.errors, Shared.context.log, Shared.evars.extra);
        } else {
            console.log('Error: no data available.\nPlease analyze the function/binary first.');
        }
    } catch (e) {
        const error = 'Exception: ' + e.message + ' (' + e.name + ')\n' + e.stack;
        const filename = unit.file.split('/').slice(-1)[0];
        console.log('File:', filename);
        console.log(error);
    }
}

main();