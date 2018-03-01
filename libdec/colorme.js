/* 
 * Copyright (C) 2017 deroad
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
    const colortheme = {
        callname: 'gray',
        comment: 'red',
        flow: 'magenta',
        integers: 'blue',
        labels: 'cyan',
        text: 'yellow',
        types: 'green'
    };

    const _colors = require('colors/safe');
    _colors.setTheme(colortheme);

    var _regexs = {
        ctrlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b/g,
        bits: /[ui]+nt[123468]+\_t/g,
        numbers: /\b\d+\b|0x[0-9A-Fa-f]+/g,
        string: /("[^"]+")/
    };

    var _colorize_data = function(input, color) {
        if (!input) {
            return '';
        }
        /* control flor (if, else, while, do, etc..) */
        var x = input.split(_regexs.ctrlflow);
        if (x.length > 1) {
            var p = input.match(_regexs.ctrlflow);
            var s = '';
            var i = 0;
            for (i = 0; i < p.length; i++) {
                s += x[i] + _colors.flow(p[i]);
            }
            for (; i < x.length; i++) {
                s += x[i];
            }
            input = s;
        }
        /* numbers */
        var x = input.split(_regexs.numbers);
        if (x.length == 1 && x == '') {
            input = _colors.integers(input);
        } else if (x.length > 1) {
            var p = input.match(_regexs.numbers);
            var s = '';
            var i = 0;
            for (i = 0; i < p.length; i++) {
                s += x[i] + _colors.integers(p[i]);
            }
            for (; i < x.length; i++) {
                s += x[i];
            }
            input = s;
        }
        /* uint32_t, etc.. */
        x = input.split(_regexs.bits);
        if (x.length == 1 && x == '') {
            input = _colors.types(input);
        } else if (input.split(_regexs.bits).length > 1) {
            var p = input.match(_regexs.bits);
            input = x[0] + _colors.types(p[0]) + x[1];
        }
        return input;
    }

    var _colorize = function(input) {
        /* labels */
        if (input.indexOf('label_') == 0) {
            return _colors.labels(input);
        }
        /* strings.. */
        x = input.split(_regexs.string);
        if (x.length == 1 && x == '') {
            input = _colors.text(input);
        } else if (input.split(_regexs.string).length > 1) {
            input = _colorize_data(x[0], _colors) + _colors.text(x[1]) + _colorize_data(x[2], _colors);
        } else {
            return _colorize_data(input, _colors);
        }
        return input;
    };
    return {
        colorize: _colorize,
        instance: _colors
    };
})();