/* 
 * Copyright (c) 2017, pancake <pancake@nopcode.org>
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

const libdec = require('./libdec/libdec.js');
const r2pipe = require('r2pipe');
const util = require('util');

if (!r2pipe.hasOwnProperty('jsonParse')) {
    throw new Error("Update your r2pipe version to use r2dec from radare2");
}

r2pipe.jsonParse = libdec.JSON.parse;

if (process.argv.length > 2) {
    r2pipe.open(process.argv[2], main);
} else {
    r2pipe.open(main);
}

function main(err, r2) {
    asyncMain(err, r2).catch(function(v) {
        console.log(v);
    }).then(function(v) {
        console.log(v);
    });
}

function printer(msg) {
    if (msg) {
        console.log(msg.replace(/\n/, ''));
    }
}

async function asyncMain(err, r2) {
    const cmd = util.promisify(r2.cmd).bind(r2);
    const cmdj = util.promisify(r2.cmdj).bind(r2);
    const r2quit = util.promisify(r2.quit).bind(r2);
    if (err) {
        throw err;
    }

    let arch = (await cmd('e asm.arch')).trim();
    let bits = (await cmd('e asm.bits')).trim();
    if (arch === 'x86') {
        arch = 'x86intel';
    }


    await cmdj('af');
    const xrefs = await cmdj('isj');
    const strings = await cmdj('izj');
    const data = await cmdj('agj');

    const architecture = libdec.archs[arch];

    let routine = libdec.analyzer.make(data);

    libdec.analyzer.strings(routine, strings);
    libdec.analyzer.analyze(routine, architecture);
    libdec.analyzer.xrefs(routine, xrefs);

    routine.print(console.log);
    /*
     // analyze entrypoint function
     await cmd('af');
     const xrefs = await cmdj('isj');
     const strings = await cmdj('izj');
     const pdfj = await cmdj('pdfj');
     const decompiler = new r2dec(arch);
     decompiler.addMetadata(xrefs);
     decompiler.addMetadata(strings);
     decompiler.work(pdfj).print(printer);
     await r2quit();
     */
    await r2quit();
}