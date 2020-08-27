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
    /**
     * Imports.
     */
    const Long = require('libdec/long');
    const json64 = require('libdec/json64');

    function initializeColors() {
        const config = {};
        const colors = r2cmd ? r2cmd("ec*") : '';
        colors.split('\n').forEach(function(line) {
            const tok = line.split(' ');
            config[tok[1]] = tok[2];
        });
        return {
            "callname": config['call'] || 'gray',
            "integers": config['num'] || 'cyan',
            "comment": config['comment'] || 'red',
            "labels": config['flag'] || 'green',
            "types": config['func_var_type'] || 'green',
            "macro": config['cjmp'] || 'yellow',
            "flow": config['flow'] || 'magenta',
            "text": config['usrcmt'] || 'yellow',
        };
    }
    //const _autoregex = /(\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|[ui]+nt[123468]+\_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|0x[0-9A-Fa-f]+|\b\d+\b)/g

    /**
     * Contains the regex used to colorize a given string. 
     * @type {Object}
     */
    const _autotheme = {
        controlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|\bthrow\b/g,
        definebits: /[ui]+nt[123468]+_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|\bchar\b|\bwchar_t\b|\bextern\b|\bstruct\b|\bsize_t\b|\btime_t\b|\bboolean\b/g,
        numbers: /0x[0-9a-fA-F]+|\b(?![;[])\d+(?![;m])\b/g,
        string: /("[^"]+")/,
    };

    // const defaulttheme = JSON.parse(include('themes/default.json'));
    // Just to be sure this won't impact anybody..

    const defaulttheme = initializeColors();

    var colortheme = defaulttheme;

    /**
     * Color types (ansi, nocolor)
     * @type {Object}
     */
    const Colors = {
        ansi: require('libdec/colors/ansi'),
        text: require('libdec/colors/invalid'),
    };

    var _theme_colors = Colors.text.make(defaulttheme);

    /**
     * Applies colors to the string given a certain regex
     * @param  {String} input - Input string
     * @param  {String} type  - Color name (ansi, text)
     * @param  {String} regex - Regex to apply
     * @return {String}       - Result string
     */
    var _apply_regex = function(input, type, regex) {
        var x = input.split(regex);
        var p = input.match(regex);
        var s = '';
        if (!p) {
            return s;
        }
        var i = 0;
        for (i = 0; i < p.length; i++) {
            if (p[i].length > 0) {
                s += x[i] + _theme_colors[type](p[i]);
            } else {
                s += x[i] + p[i];
            }
        }
        for (; i < x.length; i++) {
            s += x[i];
        }
        return s;
    };

    /**
     * Colorize the input string via ansi converters
     * @param  {String} input - Input string
     * @return {String}       - Result string
     */
    var _colorize_text = function(input) {
        if (!input || input.length < 1) {
            return '';
        }
        if (!Global.evars.honor.color) {
            return input;
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
     * Applies all the colors options (theme/colors).
     */
    var _set_options = function() {
        _themefy(Global.evars.extra.theme);
        if (Global.evars.honor.color) {
            _theme_colors = Colors.ansi.make(colortheme);
        } else {
            _theme_colors = Colors.text.make(colortheme);
        }
    };

    /**
     * Prints the final r2dec output
     * @param useJSON - boolean whether to print as json
     */
    var _flush_output = function(lines, errors, log, evars) {
        if (evars.annotation && lines) {
            var jdan = {};
            var last = {};
            var anno = [];
            jdan.code = "";
            lines.forEach(function(x) {
                if (!x.define) {
                    throw new Error("invalid object");
                }
                if (x.type == "offset") {
                    var def = x.define(jdan.code.length);
                    if (last.type != "offset") {
                        anno.push(def);
                        last = x;
                    } else {
                        anno[anno.length - 1].end = def.end;
                    }
                } else {
                    if (["function_name", "function_parameter", "local_variable"].indexOf(x.type) >= 0) {
                        anno.push(x.define(jdan.code.length));
                    }
                    anno.push(x.syntax(jdan.code.length));
                    last = x;
                }
                jdan.annotations = anno;
                jdan.code += x.value;
            });
            console.log(json64.stringify(jdan));
        } else if (evars.json) {
            var jdata = {};
            if (lines && lines.length > 0) {
                jdata.lines = lines;
            }
            if (errors && errors.length > 0) {
                jdata.errors = errors;
            }
            if (log && log.length > 0) {
                jdata.log = log;
            }
            console.log(json64.stringify(jdata));
        } else {
            var prefix = evars.allfunctions ? "// " : "";
            if (lines && lines.length > 0) {
                for (var i = 0; i < lines.length; i++) {
                    if (evars.highlights && evars.offset.eq(lines[i].offset || Long.ZERO)) {
                        console.log('\u001b[7m' + lines[i].str + '\u001b[49m\u001b[0m');
                    } else {
                        console.log(lines[i].str);
                    }
                }
            }
            if (errors && errors.length > 0) {
                console.log(prefix + errors.join("\n").replace(/\n/g, '\n' + prefix));
            }
            if (log && log.length > 0) {
                console.log(prefix + log.join("\n").replace(/\n/g, '\n' + prefix));
            }
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
        this.flushOutput = _flush_output;
    };
});