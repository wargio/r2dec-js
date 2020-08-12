/* 
 * Copyright (C) 2018 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() { // lgtm [js/useless-expression]
    const r2pipe = require('libdec/r2pipe');
    const _JSON = require('libdec/json64');
    const Long = require('libdec/long');
    var __line_cnt = 0;

    function r2_sanitize(value, expected) {
        return value.length == 0 ? expected : value;
    }

    function r2dec_sanitize(enable, evar, oldstatus, newstatus) {
        if (enable) {
            r2cmd('e ' + evar + ' = ' + newstatus);
        } else {
            r2cmd('e ' + evar + ' = ' + oldstatus);
        }
    }

    function merge_arrays(input) {
        input = input.split('\n').map(function(x) {
            return x.length > 2 ? x.trim().substr(1, x.length).substr(0, x.length - 2) : '';
        });
        var array = '[' + input.filter(Boolean).join(',') + ']';
        return array;
    }

    function merge_arrays_json(input) {
        return _JSON.parse(merge_arrays(input));
    }

    function offset_long(vars) {
        var p = function(x) {
            if (x.ref && typeof x.ref.offset == 'string') {
                x.ref.offset = Long.fromString(x.ref.offset, false, 10);
            }
            return x;
        };
        if (!vars) {
            return vars;
        }
        vars.bp = vars.bp.map(p);
        vars.reg = vars.reg.map(p);
        vars.sp = vars.sp.map(p);
        return vars;
    }

    var padding = '                   ';
    var usages = {
        "--help": "this help message",
        "--all-functions": "decompile all functions",
        "--assembly": "shows pseudo next to the assembly",
        "--blocks": "shows only scopes blocks",
        "--casts": "shows all casts in the pseudo code",
        "--colors": "enables syntax colors",
        "--debug": "do not catch exceptions",
        "--issue": "generates the json used for the test suite",
        "--offsets": "shows pseudo next to the assembly offset",
        "--paddr": "all xrefs uses physical addresses instead of virtual addresses",
        "--xrefs": "shows also instruction xrefs in the pseudo code",
        "--highlight-current": "highlights the current address.",
        "--as-comment": "the decompiled code is returned to r2 as comment (via CCu)",
        "--as-code-line": "the decompiled code is returned to r2 as 'file:line code' (via CL)",
        "--as-json": "the decompiled code lines are returned as JSON",
        "--annotation": "the decompiled code lines are returned with the annotation format"
    };

    function has_option(args, name) {
        return (args.indexOf(name) >= 0);
    }

    function has_invalid_args(args) {
        for (var i = 0; i < args.length; i++) {
            if (args[i] != '' && !usages[args[i]]) {
                console.log('Invalid argument \'' + args[i] + '\'\n');
                return true;
            }
        }
        return false;
    }

    function usage() {
        console.log("r2dec [options]");
        for (var key in usages) {
            var cmd = key + padding.substr(key.length, padding.length);
            console.log("       " + cmd + " | " + usages[key]);
        }
    }

    function print_issue() {
        var xrefs = r2_sanitize(r2pipe.string('isj'), '[]');
        var strings = r2_sanitize(r2pipe.string('Csj'), '[]');
        var functions = r2_sanitize(r2pipe.string('aflj'), '[]');
        var classes = r2_sanitize(r2pipe.string('icj'), '[]');
        var data = r2_sanitize(r2pipe.string('agj'), '[]');
        var farguments = r2_sanitize(r2pipe.string('afvj', true), '{"sp":[],"bp":[],"reg":[]}');
        var arch = r2_sanitize(r2pipe.string('e asm.arch'), '');
        var archbits = r2_sanitize(r2pipe.string('e asm.bits'), '32');
        var database = r2_sanitize(r2pipe.custom('afcfj @@@i', /^\[\]\n/g, merge_arrays), '[]');
        console.log('{"name":"issue_' + (new Date()).getTime() +
            '","arch":"' + arch +
            '","archbits":' + archbits +
            ',"agj":' + data +
            ',"isj":' + xrefs +
            ',"Csj":' + strings +
            ',"icj":' + classes +
            ',"afvj":' + farguments +
            ',"afcfj":' + database +
            ',"aflj":' + functions + '}');
    }
    var r2util = {
        check_args: function(args) {
            if (has_invalid_args(args)) {
                args.push('--help');
            }
            if (has_option(args, '--help')) {
                usage();
                return true;
            }
            if (has_option(args, '--issue')) {
                print_issue();
                return true;
            }
            return false;
        },
        evarsTestSuite: function(data) {
            this.arch = data.arch;
            this.archbits = data.bits;
            this.honor = {
                assembly: true,
                blocks: false,
                casts: true,
                offsets: false,
                paddr: false,
                pseudo: false,
                xrefs: false,
            };
            this.extra = {
                allfuncs: false,
                ascodeline: false,
                ascomment: false,
                debug: true,
                file: 'testsuite',
                highlights: false,
                offset: Long.ZERO,
                slow: true,
                theme: 'default',
                annotation: false,
            };
        },
        dataTestSuite: function(x) {
            var o = _JSON.parse(x);
            if (!o.arch) {
                throw new Error('missing architecture in JSON.');
            }
            var bits = o.archbits;
            if (bits) {
                // if bits is in the issue then it has been decoded as a Long object.
                // to override this is required to be converted to just an integer.
                bits = bits.low;
            }
            return {
                arch: o.arch,
                bits: bits || 32,
                graph: o.agj || [],
                xrefs: {
                    symbols: o.isj || [],
                    strings: o.Csj || o.izj || [],
                    functions: o.aflj || [],
                    classes: o.icj || [],
                    arguments: offset_long(o.afvj) || {
                        "sp": [],
                        "bp": [],
                        "reg": []
                    }
                },
                argdb: o.afcfj
            };
        },
        evars: function(args) {
            this.arch = r2pipe.string('e asm.arch');
            this.archbits = r2pipe.int('e asm.bits', 32);
            this.honor = {
                casts: r2pipe.bool('e r2dec.casts') || has_option(args, '--casts'),
                assembly: r2pipe.bool('e r2dec.asm') || has_option(args, '--assembly'),
                blocks: r2pipe.bool('e r2dec.blocks') || has_option(args, '--blocks'),
                xrefs: r2pipe.bool('e r2dec.xrefs') || has_option(args, '--xrefs'),
                paddr: r2pipe.bool('e r2dec.paddr') || has_option(args, '--paddr'),
                offsets: has_option(args, '--offsets'),
                color: r2pipe.int('e scr.color', 0) > 0 || has_option(args, '--colors')
            };
            this.sanitize = {
                ucase: r2pipe.bool('e asm.ucase'),
                pseudo: r2pipe.bool('e asm.pseudo'),
                capitalize: r2pipe.bool('e asm.capitalize'),
                html: r2pipe.bool('e scr.html'),
                syntax: r2pipe.string('e asm.syntax'),
            };
            this.extra = {
                allfunctions: has_option(args, '--all-functions'),
                ascodeline: has_option(args, '--as-code-line'),
                ascomment: has_option(args, '--as-comment'),
                debug: r2pipe.bool('e r2dec.debug') || has_option(args, '--debug'),
                file: r2pipe.string('i~^file[1:0]'),
                highlights: r2pipe.bool('e r2dec.highlight') || has_option(args, '--highlight-current'),
                json: has_option(args, '--as-json'),
                offset: r2pipe.long('s'),
                slow: r2pipe.bool('e r2dec.slow'),
                theme: r2pipe.string('e r2dec.theme'),
                annotation: has_option(args, '--annotation'),
            };
            this.add_comment = function(comment, offset) {
                if (!comment || comment.length < 1) {
                    return;
                }
                r2cmd('CC- @ 0x' + offset.toString(16));
                r2cmd('CCu base64:' + Duktape.enc('base64', comment) + ' @ 0x' + offset.toString(16));
            };
            this.add_code_line = function(comment, offset) {
                if (comment.trim().length < 1) {
                    return;
                }
                var line = __line_cnt++;
                r2cmd('"CL 0x' + offset.toString(16) + ' r2dec.c:' + line + ' ' + comment.replace(/\n/g, '; ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + ';"');
            };

            if (this.extra.ascomment || this.extra.ascodeline) {
                this.honor.assembly = false;
                this.honor.blocks = false;
                this.honor.offsets = false;
                this.extra.json = false;
                this.honor.color = false;
                this.extra.highlights = false;
                this.extra.annotation = false;
            }

            if (this.extra.allfunctions) {
                this.extra.ascomment = false;
                this.extra.ascodeline = false;
                this.honor.assembly = false;
                this.honor.blocks = false;
                this.honor.offsets = false;
                this.extra.json = false;
                this.extra.highlights = false;
                this.extra.annotation = false;
            }

            if (this.extra.annotation) {
                this.extra.ascodeline = false;
                this.extra.ascomment = false;
                this.extra.highlights = false;
                this.extra.html = false;
                this.extra.json = false;
                this.honor.assembly = false;
                this.honor.blocks = false;
                this.honor.color = false;
                this.honor.offsets = false;
            }

            if (this.sanitize.html || !this.honor.color) {
                this.extra.highlights = false;
            }
        },
        data: function() {
            var isfast = !r2pipe.bool('e r2dec.slow');
            this.arch = r2pipe.string('e asm.arch');
            this.bits = r2pipe.int('e asm.bits', 32);
            this.xrefs = {
                symbols: (isfast ? [] : r2pipe.json64('isj', [])),
                strings: (isfast ? [] : r2pipe.json64('Csj', [])),
                functions: (isfast ? [] : r2pipe.json64('aflj', [])),
                classes: r2pipe.json64('icj', []),
                arguments: offset_long(r2pipe.json64('afvj', {
                    "sp": [],
                    "bp": [],
                    "reg": []
                }))
            };
            this.graph = r2pipe.json64('agj', []);
            this.argdb = r2pipe.custom('afcfj @@@i', /^\[\]\n/g, merge_arrays_json);
        },
        sanitize: function(enable, evars) {
            var s = evars.sanitize;
            r2dec_sanitize(enable, 'asm.ucase', s.ucase, 'false');
            r2dec_sanitize(enable, 'asm.pseudo', s.pseudo, 'false');
            r2dec_sanitize(enable, 'asm.capitalize', s.capitalize, 'false');
            r2dec_sanitize(enable, 'scr.html', s.html, 'false');
            if (evars.arch == 'x86') {
                r2dec_sanitize(enable, 'asm.syntax', s.syntax, 'intel');
            }
        },
        debug: function(evars, exception) {
            r2util.sanitize(false, evars);
            if (evars.extra.debug) {
                return 'Exception: ' + exception.stack;
            } else {
                return '\n\nr2dec has crashed (info: ' + r2pipe.string('i~^file[1:0]') + ' @ ' + r2pipe.string('s') + ').\n' +
                    'Please report the bug at https://github.com/radareorg/r2dec-js/issues\n' +
                    'Use the option \'--issue\' or the command \'pddi\' to generate \n' +
                    'the needed data for the issue.';
            }
        }
    };
    return r2util;
});