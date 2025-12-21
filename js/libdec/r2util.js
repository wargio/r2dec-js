// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import r2pipe from './r2pipe.js';
import JSONex from './JSONex.js';
import libdec from './libdec.js';
import Long from './long.js';

export default (function() {
	var __line_cnt = 0;

    function r2_arch() {
        var arch = r2pipe.string('e asm.arch');
        if (arch === 'r2ghidra') {
            arch = r2pipe.string('e asm.cpu');
            const colon = arch.indexOf(':');
            if (colon !== -1) {
                arch = arch.substring(0, colon);
            }
        }
        return r2_sanitize(arch);
    }

    function aflj() {
        const functions = r2pipe.json('aflj', []);
        console.log(functions);
        if (functions.length > 0 && functions[0].addr) {
            return functions.map((x) => {
                    x.offset = x.addr?? x.offset;
                    return x;
                });
        }
        return functions;
    }

    function r2_sanitize(value, expected) {
        return value.length == 0 ? expected : value;
    }

    function r2dec_sanitize(enable, evar, oldstatus, newstatus) {
        if (enable) {
            radare2.command('e ' + evar + '=' + newstatus);
        } else {
            radare2.command('e ' + evar + '=' + oldstatus);
        }
    }

    function merge_arrays(input) {
        return input.trim().split('\n').filter(function(x) {
        	x = x.trim();
        	if (x.charAt(0) == '[') {
        		x = x.substr(1, x.length - 2);
        	}
        	return x.length > 2;
        }).map(function(x) {
        	x = x.trim();
        	if (x.charAt(0) == '[') {
        		x = x.substr(1, x.length - 2);
        	}
            return JSONex.parse(x);
        });
    }

    function merge_arrays_stringify(input) {
        return JSONex.stringify(merge_arrays(input));
    }

    function compare_offsets(a, b) {
        return a.ref.offset.compare(b.ref.offset);
    }

    function compare_reg(a, b) {
        return (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));
    }

    function offset_long(vars) {
        var p = function(x) {
            if (x.ref && typeof x.ref.offset == 'string') {
                x.ref.offset = Long.from(x.ref.offset, false, 10);
            }
            return x;
        };
        if (!vars) {
            return vars;
        }
        vars.bp = (vars.bp || []).map(p);
        vars.bp.sort(compare_offsets);
        vars.reg = (vars.reg || []).map(p);
        vars.reg.sort(compare_reg);
        vars.sp = (vars.sp || []).map(p);
        vars.sp.sort(compare_offsets);
        return vars;
    }

	var padding = '                   ';
	var usages = {
        "--help": "this help message",
        "--architectures": "lists the supported architectures",
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
        "--annotation": "the decompiled code lines are returned with the annotation format",
        "--optimize": "apply optimizer passes to reduce clutter (use --optimize[=N])"
	};

	function has_option(args, name) {
		return (args.indexOf(name) >= 0);
	}

	function has_invalid_args(args) {
		for (var i = 0; i < args.length; i++) {
            if (args[i] === '--optimize' && (i + 1) < args.length && /^\d+$/.test(args[i + 1])) {
                i++;
                continue;
            }
            if (args[i].startsWith('--optimize=') && /^--optimize=\d+$/.test(args[i])) {
                continue;
            }
			if (args[i] != '' && !usages[args[i]]) {
				console.log('Invalid argument \'' + args[i] + '\'\n');
				return true;
			}
		}
		return false;
	}

    const DEFAULT_OPTIMIZE_PASSES = 6;
    const MAX_OPTIMIZE_PASSES = 256;

    function clamp_optimize_passes(value) {
        var n = parseInt(value, 10);
        if (!Number.isFinite(n)) {
            return 0;
        }
        if (n < 0) {
            return 0;
        }
        if (n > MAX_OPTIMIZE_PASSES) {
            return MAX_OPTIMIZE_PASSES;
        }
        return n;
    }

    function parse_optimize_from_evar() {
        var raw = r2pipe.string('e r2dec.optimize');
        if (raw === 'true' || raw === '1') {
            return DEFAULT_OPTIMIZE_PASSES;
        }
        if (raw === 'false' || raw === '0' || raw === '') {
            return 0;
        }
        return clamp_optimize_passes(raw);
    }

    function parse_optimize_from_args(args) {
        for (var i = 0; i < args.length; i++) {
            if (args[i] === '--optimize') {
                if ((i + 1) < args.length && /^\d+$/.test(args[i + 1])) {
                    return clamp_optimize_passes(args[i + 1]);
                }
                return DEFAULT_OPTIMIZE_PASSES;
            }
            if (args[i].startsWith('--optimize=')) {
                var m = args[i].match(/^--optimize=(\d+)$/);
                if (!m) {
                    return DEFAULT_OPTIMIZE_PASSES;
                }
                return clamp_optimize_passes(m[1]);
            }
        }
        return null;
    }

	function usage() {
		console.log("r2dec [options]");
		for (var key in usages) {
			var cmd = key + padding.substr(key.length, padding.length);
			console.log("       " + cmd + " | " + usages[key]);
		}
	}

	function print_issue() {
		var version = radare2 ? radare2.version : "";
		var xrefs = r2_sanitize(r2pipe.string('isj'), '[]');
		var strings = r2_sanitize(r2pipe.string('Csj'), '[]');
		var functions = r2_sanitize(r2pipe.string('aflj'), '[]');
		var classes = r2_sanitize(r2pipe.string('icj'), '[]');
		var data = r2_sanitize(r2pipe.string('agj'), '[]');
		var farguments = r2_sanitize(r2pipe.string('afvj', true), '{"sp":[],"bp":[],"reg":[]}');
		var arch = r2_sanitize(r2pipe.string('e asm.arch'), '');
		var archbits = r2_sanitize(r2pipe.string('e asm.bits'), '32');
		var database = r2_sanitize(r2pipe.custom('afsj @@i', merge_arrays_stringify), '[]');
		console.log('{"name":"issue_' + (new Date()).getTime() +
			'","version":"' + version +
			'","arch":"' + arch +
			'","archbits":' + archbits +
			',"graph":' + data +
			',"isj":' + xrefs +
			',"Csj":' + strings +
			',"icj":' + classes +
			',"afvj":' + farguments +
			',"afcfj":' + database +
			',"aflj":' + functions + '}');
	}

	function print_archs() {
		var archs = Object.keys(libdec.archs);
		archs.sort();
		console.log('Supported architectures: ' + archs.join(', '));
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
			if (has_option(args, '--architectures')) {
				print_archs();
				return true;
			}
			return false;
		},
		evars: function(args) {
			let o = {};
			o.version = radare2 ? radare2.version : "";
			o.arch = r2pipe.string('e asm.arch');
			o.archbits = r2pipe.int('e asm.bits', 32);
			o.honor = {
                casts: r2pipe.bool('e r2dec.casts') || has_option(args, '--casts'),
                assembly: r2pipe.bool('e r2dec.asm') || has_option(args, '--assembly'),
                blocks: r2pipe.bool('e r2dec.blocks') || has_option(args, '--blocks'),
                vars: r2pipe.bool('e r2dec.vars'),
                xrefs: r2pipe.bool('e r2dec.xrefs') || has_option(args, '--xrefs'),
                paddr: r2pipe.bool('e r2dec.paddr') || has_option(args, '--paddr'),
                offsets: has_option(args, '--offsets'),
                color: r2pipe.int('e scr.color', 0) > 0 || has_option(args, '--colors')
			};
			o.sanitize = {
                ucase: r2pipe.bool('e asm.ucase'),
                pseudo: r2pipe.bool('e asm.pseudo'),
                capitalize: r2pipe.bool('e asm.capitalize'),
                html: r2pipe.bool('e scr.html'),
                syntax: r2pipe.string('e asm.syntax'),
			};
			o.extra = {
			allfunctions: has_option(args, '--all-functions'),
			ascodeline: has_option(args, '--as-code-line'),
			ascomment: has_option(args, '--as-comment'),
			debug: r2pipe.bool('e r2dec.debug') || has_option(args, '--debug'),
			file: r2pipe.string('i~^file[1:0]'),
			highlights: r2pipe.bool('e r2dec.highlight') || has_option(args, '--highlight-current'),
			json: has_option(args, '--as-json'),
			offset: r2pipe.long('s'),
			slow: r2pipe.bool('e r2dec.slow'),
			annotation: has_option(args, '--annotation'),
			optimize: (function() {
                var cli = parse_optimize_from_args(args);
                if (cli !== null) {
                    return cli;
                }
                return parse_optimize_from_evar();
            })(),
			};
			o.add_comment = function(comment, offset) {
				if (!comment || comment.length < 1) {
					return;
				}
				radare2.command('CC- @ 0x' + offset.toString(16));
				radare2.command('CCu base64:' + btoa(comment) + ' @ 0x' + offset.toString(16));
			};
			o.add_code_line = function(comment, offset) {
				if (comment.trim().length < 1) {
					return;
				}
				var line = __line_cnt++;
				radare2.command('"CL 0x' + offset.toString(16) + ' r2dec.c:' + line + ' ' + comment.replace(/\n/g, '; ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + ';"');
			};

			if (o.extra.ascomment || o.extra.ascodeline) {
				o.honor.assembly = false;
				o.honor.blocks = false;
				o.honor.offsets = false;
				o.extra.json = false;
				o.honor.color = false;
				o.extra.highlights = false;
				o.extra.annotation = false;
			}

			if (o.extra.allfunctions) {
				o.extra.ascomment = false;
				o.extra.ascodeline = false;
				o.honor.assembly = false;
				o.honor.blocks = false;
				o.honor.offsets = false;
				o.extra.json = false;
				o.extra.highlights = false;
				o.extra.annotation = false;
			}

			if (o.extra.annotation) {
				o.extra.ascodeline = false;
				o.extra.ascomment = false;
				o.extra.highlights = false;
				o.extra.html = false;
				o.extra.json = false;
				o.honor.assembly = false;
				o.honor.blocks = false;
				o.honor.color = false;
				o.honor.offsets = false;
			}

			if (o.sanitize.html || !o.honor.color) {
				o.extra.highlights = false;
			}
			return o;
		},
		data: function() {
            var isfast = !r2pipe.bool('e r2dec.slow');
            this.arch = r2_arch();
            this.bits = r2pipe.int('e asm.bits', 32);
            this.xrefs = {
                symbols: (isfast ? [] : r2pipe.json('isj', [])),
                strings: (isfast ? [] : r2pipe.json('Csj', [])),
                functions: (isfast ? [] : aflj()),
                classes: r2pipe.json('icj', []),
                arguments: offset_long(r2pipe.json('afvj', {
                    "sp": [],
                    "bp": [],
                    "reg": []
                }))
            };
            this.graph = r2pipe.json('agj', []);
            this.argdb = r2pipe.custom('afcfj @@@i', merge_arrays);
		},
		sanitize: function(enable, evars) {
			if (!evars) {
				return;
			}
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
			if (!evars || evars.extra.debug) {
				var msg = exception.message + ' (' + exception.name + ')';
				return 'Exception: ' + msg + '\n' + exception.stack;
            } else {
                return '\n\nr2dec has crashed (info: ' + r2pipe.string('i~^file[1:0]') + ' @ ' + r2pipe.string('s') + ').\n' +
                    'Please report the bug at https://github.com/wargio/r2dec-js/issues\n' +
                    'Enable -e r2dec.debug=true to check the javascript backtrace.\n' +
                    'Use the command \'pddi\' to generate the needed data for the issue.';
            }
		}
	};
	return r2util;
})();
