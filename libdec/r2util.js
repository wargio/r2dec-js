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

module.exports = (function() {
    var _JSON = require('libdec/json64');

    function r2custom(value, regex, function_fix) {
        var x = r2cmd(value);
        if (regex) {
            x = x.replace(regex, '');
        }
        return function_fix ? function_fix(x.trim()) : x.trim();
    }

    function r2str(value, multiline) {
        var x = r2cmd(value);
        if (multiline) {
            x = x.replace(/\n/g, '');
        }
        return x.trim();
    }

    function r2json(m, def) {
        var x = r2str(m, true);
        return x.length > 0 ? _JSON.parse(x) : def;
    }

    function r2int(value, def) {
        var x = r2str(value);
        if (x != '') {
            try {
                return parseInt(x);
            } catch (e) {}
        }
        return def;
    }

    function r2bool(value) {
        var x = r2str(value);
        return x == 'true' || x == '1';
    }

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
        input = input.split('\n').map(function(x){
            return x.length > 2 ? x.trim().substr(1, x.length).substr(0, x.length - 2) : '';
        });
        var array = '[' + input.filter(Boolean).join(',') + ']';
        return array;
    }

    function merge_arrays_json(input) {
        return _JSON.parse(merge_arrays(input));
    }

    var padding = '            ';
    var usages = {
        "--help": "this help message",
        "--assembly": "shows pseudo next to the assembly",
        "--blocks": "shows only scopes blocks",
        "--colors": "enables syntax colors",
        "--casts": "shows all casts in the pseudo code",
        "--debug": "do not catch exceptions",
        "--html": "outputs html data instead of text",
        "--issue": "generates the json used for the test suite",
        "--paddr": "all xrefs uses physical addresses instead of virtual addresses",
        "--xrefs": "shows also instruction xrefs in the pseudo code",
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
        var xrefs = r2_sanitize(r2str('isj'), '[]');
        var strings = r2_sanitize(r2str('izj'), '[]');
        var functions = r2_sanitize(r2str('aflj'), '[]');
        var data = r2_sanitize(r2str('agj'), '[]');
        var farguments = r2_sanitize(r2str('afvj', true), '{"sp":[],"bp":[],"reg":[]}');
        var arch = r2_sanitize(r2str('e asm.arch'), '');
        var archbits = r2_sanitize(r2str('e asm.bits'), '32');
        var database = r2_sanitize(r2custom('afcfj @@@i', /^\[\]\n/g, merge_arrays), '[]');
        console.log('{"name":"issue_' + (new Date()).getTime() +
            '","arch":"' + arch +
            '","archbits":' + archbits +
            ',"agj":' + data +
            ',"isj":' + xrefs +
            ',"izj":' + strings +
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
                casts: true,
                assembly: true,
                blocks: false,
                xrefs: false,
                paddr: false,
                pseudo: false,
                html: false,
                color: false
            };
            this.extra = {
                theme: 'default',
                debug: true
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
                    strings: o.izj || [],
                    functions: o.aflj || [],
                    arguments: o.afvj || {
                        "sp": [],
                        "bp": [],
                        "reg": []
                    }
                },
                argdb: o.afcfj
            };
        },
        evars: function(args) {
            this.arch = r2str('e asm.arch');
            this.archbits = r2int('e asm.bits', 32);
            this.honor = {
                casts: r2bool('e r2dec.casts') || has_option(args, '--casts'),
                assembly: r2bool('e r2dec.asm') || has_option(args, '--assembly'),
                blocks: r2bool('e r2dec.blocks') || has_option(args, '--blocks'),
                xrefs: r2bool('e r2dec.xrefs') || has_option(args, '--xrefs'),
                paddr: r2bool('e r2dec.paddr') || has_option(args, '--paddr'),
                html: r2bool('e scr.html') || has_option(args, '--html'),
                color: r2int('e scr.color', 0) > 0 || has_option(args, '--colors')
            };
            this.sanitize = {
                ucase: r2bool('e asm.ucase'),
                pseudo: r2bool('e asm.pseudo'),
                capitalize: r2bool('e asm.capitalize'),
            };
            this.extra = {
                theme: r2str('e r2dec.theme'),
                debug: has_option(args, '--debug')
            };
        },
        data: function() {
            this.arch = r2str('e asm.arch');
            this.bits = r2int('e asm.bits', 32);
            this.xrefs = {
                symbols: r2json('isj', []),
                strings: r2json('izj', []),
                functions: r2json('aflj', []),
                arguments: r2json('afvj', {
                    "sp": [],
                    "bp": [],
                    "reg": []
                })
            };
            this.graph = r2json('agj', []);
            this.argdb = r2custom('afcfj @@@i', /^\[\]\n/g, merge_arrays_json);
        },
        sanitize: function(enable, evars) {
            var s = evars.sanitize;
            r2dec_sanitize(enable, 'asm.ucase', s.ucase, 'false');
            r2dec_sanitize(enable, 'asm.pseudo', s.pseudo, 'false');
            r2dec_sanitize(enable, 'asm.capitalize', s.capitalize, 'false');
        },
        debug: function(evars, exception) {
            r2util.sanitize(false, evars);
            if (evars.extra.debug) {
                console.log('Exception:', exception.stack);
            } else {
                console.log(
                    '\n\nr2dec has crashed.\n' +
                    'Please report the bug at https://github.com/wargio/r2dec-js/issues\n' +
                    'Use the option \'--issue\' or the command \'pddi\' to generate \n' +
                    'the needed data for the issue.'
                );
            }
        }
    };
    return r2util;
})();
