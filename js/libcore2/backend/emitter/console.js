/* 
 * Copyright (C) 2020 elicn
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

(function() {
    const Tag = require('js/libcore2/backend/tags');

    function ConsoleEmitter(conf) {
        this.offsets = conf.offsets;
        this.tabsize = conf.tabsize;
        this.scope_newline = conf.newline;

        // see alternate guides here: http://unicode-search.net/unicode-namesearch.pl?term=VERTICAL
        var guides = [
            ' ',        // none
            '\uffe8',   // solid line
            '\uffe4',   // dashed line
            '\ufe19'    // dotted line
        ];

        if (conf.guides >= guides.length) {
            conf.guides = 0;
        }

        this.guide = guides[conf.guides];
    }

    ConsoleEmitter.prototype.emit = function(listing, printer) {
        const guide = printer.colorize([Tag.OFFSET, this.guide]) + ' '.repeat(this.tabsize - 1);

        var _empty = function() { return ''; };

        var _offset = this.offsets ?
            function(obj) {
                var o = obj.address;

                return o && printer.colorize([Tag.OFFSET, o + ' ']);
            } : _empty;
    
        var _blanks = this.offsets ?
            function(obj) {
                var b = ' '.repeat(obj.address.length);

                return printer.colorize([Tag.OFFSET, b + ' ']);
            } : _empty;
    
        var _do_nothing = function() { };

        var _emit_brace = function(offset, indent, brace) {
            out.push(offset + indent + brace);
        };

        const space = printer.colorize([Tag.WHTSPCE, ' ']);
        const obrace = printer.colorize([Tag.PAREN, '{']);
        const cbrace = printer.colorize([Tag.PAREN, '}']);

        var _emit_obrace = this.scope_newline ?
            function(scope, indent) {
                _emit_brace(_offset(scope), indent, obrace);
            } : _do_nothing;

        var _emit_cbrace = function(scope, indent) {
            _emit_brace(_blanks(scope), indent, cbrace);
        };

        var _inline_brace = this.scope_newline ?
            _empty :
            function(l) {
                return l.sub.length > 0 ? space + obrace : '';
            };

        var _emit_scope = function(skey, ilvl) {
            const indent = guide.repeat(ilvl);

            var scope = listing[skey];

            scope.lines.forEach(function(l) {
                var offset = _offset(l) || _blanks(scope);
                var line = printer.colorizeAll(l.line) + _inline_brace(l);

                out.push(offset + indent + line);

                l.sub.forEach(function(s) {
                    _emit_obrace(listing[s], indent);
                    _emit_scope(s, ilvl + 1);
                    _emit_cbrace(listing[s], indent);
                });
            });

            if (scope.next) {
                _emit_scope(scope.next, ilvl);
            }
        };

        var out = [];

        _emit_scope('entry', 0);

        return out.join('\n');
    };

    return ConsoleEmitter;
});