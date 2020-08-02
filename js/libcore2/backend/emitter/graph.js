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
	const Graph = require('js/libcore2/analysis/graph');
    const Tag = require('js/libcore2/backend/tags');

    function GraphEmitter(conf) {
        this.offsets = conf.offsets;
        this.tabsize = conf.tabsize;
    }

    GraphEmitter.prototype.emit = function(listing, printer, cfg) {
        const indent = ' '.repeat(this.tabsize);

        var _empty = function() { return ''; };

        var _offset = this.offsets ?
            function(obj) {
                var o = obj.address;

                return o && printer.colorize([Tag.OFFSET, o + ' ']) + indent;
            } : _empty;
    
        var _blanks = this.offsets ?
            function(obj) {
                var b = ' '.repeat(obj.address.length);

                return printer.colorize([Tag.OFFSET, b + ' ']) + indent;
            } : _empty;

        var contents = {};
        var keys = Object.keys(listing);

        var nodes = keys.map(function(skey) {
            var scope = listing[skey];

            contents[skey] = scope.lines.map(function(l) {
                var offset = _offset(l) || _blanks(scope);
                var line = printer.colorizeAll(l.line);

                return offset + line;
            }).join('\n');

            return skey;
        });

        var _flatten = function(arr) {
            return Array.prototype.concat.apply([], arr);
        };

        var _addrOf = function(o) {
            return '0x' + o.key.address.toString(16);
        };

        var edges = _flatten(cfg.nodes.map(function(u) {
            return cfg.successors(u).map(function(v) {
                return [_addrOf(u), _addrOf(v)];
            });
        }));

        var decl = listing['entry'].lines[0];
        var root = decl.sub[0];

        // put function declaration on top of first block
        contents[root] = [contents['entry'], contents[root]].join('\n');

        // remove 'entry' node, as it is no longer needed
        nodes.splice(nodes.indexOf('entry'), 1);
        
        var g = new Graph.Directed(nodes, edges, root);

        var _mk_title = function(node) {
            return node.key;
        };

        var _mk_body = function(node) {
            return "base64:" + Duktape.enc("base64", contents[node.key]);
        };

        return Global.r2cmd(g.r2graph(_mk_title, _mk_body).join(' ; '));
    };

    return GraphEmitter;
});