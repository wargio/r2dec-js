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
    //const _autoregex = /(\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|[ui]+nt[123468]+\_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|0x[0-9A-Fa-f]+|\b\d+\b)/g

    /**
     * Contains the regex used to colorize a given string. 
     * @type {Object}
     */
    const _autotheme = {
        controlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b/g,
        definebits: /[ui]+nt[123468]+_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|\bchar\b|\bwchar_t\b|\bextern\b|\bstruct\b|\bsize_t\b|\btime_t\b/g,
        numbers: /0x[0-9a-fA-F]+|\b\d+\b/g,
        string: /("[^"]+")/
    };

    // const defaulttheme = JSON.parse(include('themes/default.json'));
    // Just to be sure this won't impact anybody..
    const defaulttheme = {
        "callname": "gray",
        "integers": "cyan",
        "comment": "red",
        "labels": "green",
        "types": "green",
        "macro": "yellow",
        "flow": "magenta",
        "text": "yellow"
    };

    var colortheme = defaulttheme;

    /**
     * Color types (ansi, html, nocolor)
     * @type {Object}
     */
    const Colors = {
        ansi: require('libdec/colors/ansi'),
        html: require('libdec/colors/html'),
        text: require('libdec/colors/invalid'),
    };

    var _theme_colors = Colors.text.make(defaulttheme);

    /**
     * HTML escape chars
     * @type {Object}
     */
    const _html_basic = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&apos;',
        ' ': '&nbsp;',
        '\n': '</br>\n'
    };

    /**
     * Escapes a given string chars to html ones.
     * @param  {String} text - string to escape to html
     * @return {String}      - escaped string
     */
    var _htmlize = function(text) {
        if (!Global.evars.honor.html) {
            return text;
        }
        var l = text.split(/([ <>&"'\n])/g);
        for (var i = 0; i < l.length; i++) {
            var value = _html_basic[l[i]];
            if (value) {
                l[i] = value;
            }
        }
        return l.join('');
    };

    /**
     * Applies colors to the string given a certain regex
     * @param  {String} input - Input string
     * @param  {String} type  - Color name (ansi, html, text)
     * @param  {String} regex - Regex to apply
     * @return {String}       - Result string
     */
    var _apply_regex = function(input, type, regex) {
        var x = input.split(regex);
        var p = input.match(regex);
        if (!p) {
            return s;
        }
        var s = '';
        var i = 0;
        for (i = 0; i < p.length; i++) {
            s += x[i] + _theme_colors[type](p[i]);
        }
        for (; i < x.length; i++) {
            s += x[i];
        }
        return s;
    };

    /**
     * Colorize the input string via ansi/html converters
     * @param  {String} input - Input string
     * @return {String}       - Result string
     */
    var _colorize_text = function(input) {
        if (!input || input.length < 1) {
            return '';
        }
        /* control flow (if, else, while, do, etc..) */
        var x = input.split(_autotheme.controlflow);
        if (x.length > 1) {
            input = _apply_regex(input, 'flow', _autotheme.controlflow);
        }
        /* numbers */
        x = input.split(_autotheme.numbers);
        if (x.length == 1 && x == '') {
            input = _theme_colors.integers(input);
        } else if (x.length > 1) {
            input = _apply_regex(input, 'integers', _autotheme.numbers);
        }
        /* uint32_t, etc.. */
        x = input.split(_autotheme.definebits);
        if (x.length == 1 && x == '') {
            input = _theme_colors.types(input);
        } else if (input.split(_autotheme.definebits).length > 1) {
            input = _apply_regex(input, 'types', _autotheme.definebits);
        }
        return input;
    };

    /**
     * Gets the user theme and sets the color to be used.
     * @param  {String} name - Theme name
     */
    var _themefy = function(name) {
        if (typeof name != 'string' || name.indexOf('/') >= 0 || name == 'default') {
            colortheme = defaulttheme;
            return;
        }
        try {
            colortheme = JSON.parse(include('themes/' + name + '.json'));
            for (var key in defaulttheme) {
                if (!colortheme[key]) {
                    colortheme[key] = defaulttheme[key];
                }
            }
        } catch (e) {
            colortheme = defaulttheme;
        }
    };

    /**
     * Applies all the colors options (theme/colors/html).
     */
    var _set_options = function() {
        _themefy(Global.evars.extra.theme);
        if (Global.evars.honor.color && Global.evars.honor.html) {
            _theme_colors = Colors.html.make(colortheme);
        } else if (Global.evars.honor.color) {
            _theme_colors = Colors.ansi.make(colortheme);
        } else {
            _theme_colors = Colors.text.make(colortheme);
        }
    };

    /**
     * Printer Object
     * @return {Function} - Printer object (to be called via `new Printer()`)
     */
    return function() {
        _set_options();
        this.theme = _theme_colors;
        this.auto = _colorize_text;
        this.html = _htmlize;
    };
})();