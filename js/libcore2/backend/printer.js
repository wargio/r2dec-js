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

    var _themes = {

        // theme based on vscode dark+
        'dark+': [
            null,               // Tag.RESET -- placeholder
            '',                 // Tag.WHTSPCE
            [ 86, 156, 214],    // Tag.KEYWORD
            [197, 134, 192],    // Tag.CFLOW
            [212, 212, 212],    // Tag.PAREN
            [212, 212, 212],    // Tag.PUNCT
            [212, 212, 212],    // Tag.OPERATOR
            [181, 206, 168],    // Tag.NUMBER
            [206, 145, 120],    // Tag.STRING
            [220, 220, 170],    // Tag.FNCALL
            [220, 220, 170],    // Tag.FNNAME
            [ 78, 201, 176],    // Tag.VARTYPE
            [156, 220, 254],    // Tag.VARNAME
            [106, 153,  85],    // Tag.COMMENT
            [131, 148, 150],    // Tag.OFFSET
            [244,  71,  71]     // Tag.INVALID
        ],

        // theme based on selected r2 theme colors
        'default': [
            null,               // Tag.RESET -- placeholder
            '',                 // Tag.WHTSPCE
            'ret',              // Tag.KEYWORD
            'cjmp',             // Tag.CFLOW
            '',                 // Tag.PAREN
            '',                 // Tag.PUNCT
            'math',             // Tag.OPERATOR
            'num',              // Tag.NUMBER
            'btext',            // Tag.STRING
            'call',             // Tag.FNCALL
            'fname',            // Tag.FNNAME
            'func_var_type',    // Tag.VARTYPE
            'reg',              // Tag.VARNAME
            'comment',          // Tag.COMMENT
            'offset',           // Tag.OFFSET
            'invalid'           // Tag.INVALID
        ],

        // no syntax highlighting; useful when stdout is not a tty (i.e. pipe)
        'none': Array(Tag.INVALID + 1).fill(null)
    };

    // ------------------------------------------------------------

    _themes = new Proxy(_themes, {
        get: function(obj, key) {
            var colormap = obj[key];

            // if r2 theme, fetch currently selected theme and translate its entries
            // into their corresponding rgb values
            if (key === 'default') {
                var ecj = Global.r2cmdj('ecj');

                colormap = colormap.map(function(k) {
                    return ecj[k];
                });
            }

            // populate the RESET placeholder
            if (key !== 'none') {
                colormap[Tag.RESET] = '0';
            }

            return colormap.map(function(k) {
                return _wrap(_rgb_to_esccode(k));
            });
        }
    });

    var _wrap = function(esccode) {
        return esccode ? '\033[' + esccode + 'm' : '';
    };

    var _rgb_to_esccode = function(rgb) {
        if (!(rgb instanceof Array)) {
            return rgb || '';
        }

        var r = rgb[0];
        var g = rgb[1];
        var b = rgb[2];

        return ['38', '2', r, g, b].join(';');
    };

    function Printer(tname) {
        this.colormap = _themes[tname];
    }

    Printer.prototype.hasTheme = function(tname) {
        return Object.keys(_themes).indexOf(tname) > (-1);
    };

    Printer.prototype.colorize = function(token) {
        var tag = token[0];  // coloring tag
        var txt = token[1];  // text to color

        return this.colormap[tag] + txt + this.colormap[Tag.RESET];
    };

    Printer.prototype.colorizeAll = function(tokens) {
        return tokens.map(this.colorize, this).join('');
    };

    // ------------------------------------------------------------

    return Printer;
});
