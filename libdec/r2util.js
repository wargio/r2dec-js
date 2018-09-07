/* 
 * Copyright (C) 2018 deroad, elicn
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

    function r2json(m, def) {
        var x = r2cmd(m).replace(/\n/g, '').trim();

        return x.length > 0 ? _JSON.parse(x) : def;
    }

    function r2dec_sanitize(enable, evar, oldstatus, newstatus) {
        var status = enable ? newstatus : oldstatus;

        r2cmd(['e', evar, '=', status].join(' '));
    }

    var usages = {
        '--help':     'this help message',
        '--assembly': 'shows pseudo next to the assembly',
        '--blocks':   'shows only scopes blocks',
        '--colors':   'enables syntax colors',
        '--casts':    'shows all casts in the pseudo code',
        '--debug':    'do not catch exceptions',
        '--html':     'outputs html data instead of text',
        '--issue':    'generates the json used for the test suite',
        '--paddr':    'all xrefs uses physical addresses instead of virtual addresses',
        '--xrefs':    'shows also instruction xrefs in the pseudo code',
    };

    function has_option(args, name) {
        return (args.indexOf(name) >= 0);
    }

    function has_invalid_arg(args) {
        var valid_keys = Object.keys(usages);
        var found = false;

        for (var i = 0; !found && (i < args.length); i++) {
            var a = args[i];

            if (a && valid_keys.indexOf(a) == (-1)) {
                console.log('Invalid argument \'' + a + '\'\n');

                found = true;
            }
        }

        return found;
    }

    function usage() {
        var justify = function(s, col, total) {
            var lpad = ' '.repeat(col);
            var rpad = ' '.repeat(total - col - s.length);

            return [lpad, s, rpad].join('');
        };

        console.log('r2dec [options]');
        for (var key in usages) {
            console.log([justify(key, 7, 19), '|', usages[key]].join(' '));
        }
    }

    function print_issue() {
        var ej = r2json('ej', {});

        var issue = {
            'name': 'issue_' + (new Date()).getTime(),
            'arch': ej['asm.arch'],
            'archbits': ej['asm.bits'],
            'agj':  r2json('agj', []),
            'isj':  r2json('isj', []),
            'izj':  r2json('izj', []),
            'afvj': r2json('afvj', { 'sp': [], 'bp': [], 'reg': [] }),
            'afjl': r2json('aflj', [])
        };

        console.log(issue);
    }

    var r2util = {
        check_args: function(args) {
            if (has_invalid_arg(args)) {
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
                    symbols:   o.isj  || [],
                    strings:   o.izj  || [],
                    functions: o.aflj || [],
                    arguments: o.afvj || { 'sp': [], 'bp': [], 'reg': [] }
                }
            };
        },
        evars: function(args) {
            var ej = r2json('ej', {});

            this.arch     = ej['asm.arch'];
            this.archbits = ej['asm.bits'];

            this.honor = {
                casts:    ej['r2dec.casts']   || has_option(args, '--casts'),
                assembly: ej['r2dec.asm']     || has_option(args, '--assembly'),
                blocks:   ej['r2dec.blocks']  || has_option(args, '--blocks'),
                xrefs:    ej['r2dec.xrefs']   || has_option(args, '--xrefs'),
                paddr:    ej['r2dec.paddr']   || has_option(args, '--paddr'),
                html:     ej['scr.html']      || has_option(args, '--html'),
                color:    ej['scr.color'] > 0 || has_option(args, '--colors')
            };

            this.sanitize = {
                ucase:      ej['asm.ucase'],
                pseudo:     ej['asm.pseudo'],
                capitalize: ej['asm.capitalize'],
            };

            this.extra = {
                theme: ej['r2dec.theme'],
                debug: has_option(args, '--debug')
            };
        },
        data: function() {
            var ej = r2json('ej', {});

            this.arch  = ej['asm.arch'];
            this.bits  = ej['asm.bits'];
            this.graph = r2json('agj', []);

            this.xrefs = {
                symbols:   r2json('isj', []),
                strings:   r2json('izj', []),
                functions: r2json('aflj', []),
                arguments: r2json('afvj', {
                    'sp':  [],
                    'bp':  [],
                    'reg': []
                })
            };
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
                console.log([
                    '',
                    '',
                    'r2dec has crashed.',
                    'Please report the bug at https://github.com/wargio/r2dec-js/issues',
                    'Use the option \'--issue\' or the command \'pddi\' to generate',
                    'the needed data for the issue.'].join('\n')
                );
            }
        }
    };

    return r2util;
})();