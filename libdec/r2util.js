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
        return value.length = 0 ? expected : value;
    }

    function r2dec_sanitize(enable, evar, oldstatus, newstatus) {
        if (enable) {
            r2cmd('e ' + evar + ' = ' + newstatus);
        } else {
            r2cmd('e ' + evar + ' = ' + oldstatus);
        }
    };

    var padding = '            ';
    var usages = {
        "--help": "this help message",
        "--colors": "enables syntax colors",
        "--assembly": "shows pseudo next to the assembly",
        "--offset": "shows pseudo next to the offset",
        "--casts": "shows all casts in the pseudo code",
        "--issue": "generates the json used for the test suite",
        "--debug": "do not catch exceptions",
        "--html": "outputs html data instead of text",
        "--xrefs": "shows all xrefs in the pseudo code",
    }

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
        var fcnargs = r2_sanitize(r2str('afvj', true), '{"sp":[],"bp":[],"reg":[]}');
        var data = r2_sanitize(r2str('e asm.bits'), '32');
        console.log('{"name":"issue_' + (new Date()).getTime() +
            '","arch":"' + arch +
            '","archbits":' + archbits +
            ',"agj":' + data +
            ',"isj":' + xrefs +
            ',"izj":' + strings +
            ',"afvj":' + fcnargs +
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
        tests: function() {
            this.honor = {
                casts: true,
                assembly: true,
                offset: false,
                xrefs: false,
                pseudo: false,
                html: false,
                color: false
            };
            this.extra = {
                theme: 'default',
                debug: true
            }
        },
        evars: function(args) {
            this.arch = r2str('e asm.arch');
            this.honor = {
                casts: r2bool('e r2dec.casts') || has_option(args, '--casts'),
                assembly: r2bool('e r2dec.asm') || has_option(args, '--assembly'),
                offset: r2bool('e r2dec.offset') || has_option(args, '--offset'),
                xrefs: r2bool('e r2dec.xrefs') || has_option(args, '--xrefs'),
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
            }
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