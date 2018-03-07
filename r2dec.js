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

const libdec = require('./libdec/libdec.js');
const colorme = require('./libdec/colorme.js');
const r2pipe = require('r2pipe');
const util = require('util');

const padding = '            ';

const usages = {
    "--help": "this help message",
    "--colors": "enables syntax colors",
    "--hide-casts": "hides all casts in the pseudo code",
    "--issue": "generates the json used for the test suite",
    "--debug": "do not catch exceptions",
}

if (!r2pipe.hasOwnProperty('jsonParse')) {
    throw new Error("Update your r2pipe version to use r2dec from radare2");
}

r2pipe.jsonParse = libdec.JSON.parse;

r2pipe.open(main);

function main(err, r2) {
    asyncMain(err, r2, process.argv.slice(2)).catch(function(v) {
        console.log(v);
        suicide();
    }).then(function(v) {
        console.log(v);
        suicide();
    });
}

function suicide() {
    process.kill(process.pid);
}

function has_option(args, name) {
    return (args.indexOf(name) >= 0);
}

function has_invalid_args(args) {
    for (var i = 0; i < args.length; i++) {
        if (!usages[args[i]]) {
            console.log('Invalid argument \'' + args[i] + '\'\n');
            return true;
        }
    }
    return false;
}

function usage() {
    console.log("#!pipe r2dec [options]");
    for (var key in usages) {
        var cmd = key + padding.substr(key.length, padding.length);
        console.log("       %s | %s", cmd, usages[key]);
    }
}

async function asyncMain(err, r2, args) {
    if (has_invalid_args(args)) {
        args.push('--help');
    }
    if (has_option(args, '--help')) {
        usage();
        suicide();
    }
    if (err) {
        throw err;
    }

    try {
        const cmd = util.promisify(r2.cmd).bind(r2);
        const cmdj = util.promisify(r2.cmdj).bind(r2);
        const r2quit = util.promisify(r2.quit).bind(r2);

        let arch = (await cmd('e asm.arch')).trim();
        let bits = (await cmd('e asm.bits')).trim();
        const honorpseudo = (await cmd('e asm.pseudo')).trim() == 'true';
        const honorcolor = parseInt((await cmd('e scr.color')).trim()) > 0;

        // r2dec options
        var options = {
            color: (honorcolor || has_option(args, '--colors')) ? colorme : null,
            casts: !has_option(args, '--hide-casts'),
            ident: null
        };

        const architecture = libdec.archs[arch];

        if (architecture) {
            await cmd('af');
            /* asm.pseudo breaks things.. */
            if (honorpseudo) {
                await cmd('e asm.pseudo = false');
            }

            if (has_option(args, '--issue')) {
                const xrefs = (await cmd('isj')).trim();
                const strings = (await cmd('izj')).trim();
                const data = (await cmd('agj')).trim();
                console.log('{"name":"issue_' + (new Date()).getTime() + '","arch":"' + arch + '","agj":' + data + ',"isj":' + xrefs + ',"izj":' + strings + '}');
            } else {
                const xrefs = await cmdj('isj');
                const strings = await cmdj('izj');
                const data = await cmdj('agj');
                let routine = libdec.analyzer.make(data);

                libdec.analyzer.strings(routine, strings);
                libdec.analyzer.analyze(routine, architecture);
                libdec.analyzer.xrefs(routine, xrefs);
                routine.print(console.log, options);
            }

            if (honorpseudo) {
                await cmd('e asm.pseudo = true');
            }
        } else {
            console.log(arch + ' is not currently supported.\n' +
                'Please open an enhancement issue at https://github.com/wargio/r2dec-js/issues');
            libdec.supported();
        }
    } catch (e) {
        if (has_option(args, '--debug')) {
            throw e;
        } else {
            console.log(
                '\n\nr2dec has crashed.\n' +
                'Please report the bug at https://github.com/wargio/r2dec-js/issues\n' +
                'Use the option \'--issue\' to generate the needed data for the issue.'
            );
        }
    }

    // kill itself.
    suicide();
    // r2quit is broken
    //await r2quit();
}