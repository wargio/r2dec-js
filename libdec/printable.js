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

(function() {
    const colortheme = {
        callname: 'gray',
        comment: 'red',
        flow: 'magenta',
        integers: 'cyan',
        labels: 'green',
        text: 'yellow',
        types: 'green',
        macro: 'yellow'
    };

    const Colors = {
        ansi: require('libdec/colors/ansi'),
        html: require('libdec/colors/html'),
        text: require('libdec/colors/invalid'),
    };

    var _theme_colors = Colors.text.make(colortheme);

    const _autoregex = /(\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|[ui]+nt[123468]+\_t|\bvoid\b|\bconst\b|\bsizeof\b|0x[0-9A-Fa-f]+|\b\d+\b)/g

    const _autotheme = {
        controlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b/g,
        definebits: /[ui]+nt[123468]+\_t|\bvoid\b|\bconst\b|\bsizeof\b/g,
        numbers: /0x[0-9a-fA-F]+|\b\d+\b/g,
        string: /("[^"]+")/
    };



    var _apply_regex = function(input, type, regex) {
        var x = input.split(regex);
        var p = input.match(regex);
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

    var _colorize_text = function(input) {
        if (!input) {
            return '';
        }
        /* control flow (if, else, while, do, etc..) */
        var x = input.split(_autotheme.controlflow);
        if (x.length > 1) {
            input = _apply_regex(input, 'flow', _autotheme.controlflow);
        }
        /* numbers */
        var x = input.split(_autotheme.numbers);
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

    const _html_basic = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&apos;',
        ' ': '&nbsp;',
        '\n': '</br>\n'
    };


    const _space_text = '                                                                                                                        ';
    const _space_html = [
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;',
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'
    ];

    var _htmlize = function(text) {
        var l = text.split(/([\ <>&"'\n])/g);
        for (var i = 0; i < l.length; i++) {
            var value = _html_basic[l[i]];
            if (value) {
                l[i] = value;
            }
        }
        return l.join('');
    }

    var uString = function(text) {
        this.text = text;
        this.toString = function(options) {
            if (options.html) {
                return _htmlize(this.text);
            }
            return this.text;
        };
    };
    var uColor = function(text, type) {
        this.text = text;
        this.type = type;
        this.toString = function(options) {
            _set_options(options);
            var s = this.text;
            if (options.html) {
                s = _htmlize(s);
            }
            return _theme_colors[this.type](s);
        };
    };
    var uSpace = function(size) {
        this.size = size;
        this.toString = function(options) {
            if (this.size < 1) {
                return;
            }
            if (options.html) {
                return _space_html.slice(0, this.size).join('');
            }
            return _space_text.substr(0, this.size);
        };
    };
    var uObject = function(object) {
        this.object = object;
        this.toString = function(options) {
            var s = this.object.toString(options);
            if (options.color) {
                return _colorize_text(s);
            }
            return s;
        };
    }

    var _colorize_me = function(input, printable) {
        var x = input.split(_autoregex);
        for (var i = 0; i < x.length; i++) {
            if (x[i].length < 1) {
                continue;
            }
            if (_autotheme.controlflow.test(x[i])) {
                printable.appendFlow(x[i]);
            } else if (_autotheme.numbers.test(x[i])) {
                printable.appendIntegers(x[i]);
            } else if (_autotheme.definebits.test(x[i])) {
                printable.appendTypes(x[i]);
            } else {
                printable.append(x[i]);
            }
        }
    };

    var Printable = function() {
        this.data = [];
        this.contains = function(y) {
            for (var i = 0; i < this.data.length; i++) {
                var p = this.data[i].text;
                if (p && p.indexOf(y) >= 0) {
                    return true;
                }
            }
            return false;
        };
        this.append = function(x) {
            if (!x || x.length < 1) {
                return;
            }
            this.data.push(new uString(x));
        };
        this.appendPrintable = function(x) {
            if (!x || x.data.length < 1) {
                return;
            }
            this.data = this.data.concat(x.data);
        };
        this.appendSpace = function(size) {
            this.data.push(new uSpace(size));
        };
        this.appendColorize = function(x) {
            if (!x || x.length < 1) {
                return;
            }
            _colorize_me(x, this);
        };
        this.appendObject = function(x) {
            if (!x) {
                return;
            }
            this.data.push(new uObject(x));
        };
        this.appendEndline = function() {
            //console.log((new Error('l')).stack)
            this.data.push(new uString('\n'));
        };
        this.appendPipe = function() {
            this.data.push(new uString(' | '));
        };
        this.appendSpacedPipe = function(size) {
            if (!size || size < 1) {
                return;
            }
            this.data.push(new uSpace(size));
            this.data.push(new uString(' | '));
        };
        for (var key in colortheme) {
            var keytitle = 'append' + key.charAt(0).toUpperCase() + key.substr(1, key.length);
            this[keytitle] = function(x) {
                if (!x || x.length < 1) {
                    return;
                }
                var o = arguments.callee;
                this.data.push(new uColor(x, o.type));
            };
            this[keytitle].type = key;
        }
        this.clean = function() {
            this.data = [];
        }
        this.toString = function(options) {
            var s = '';
            for (var i = 0; i < this.data.length; i++) {
                s += this.data[i].toString(options);
            }
            return s;
        };
        this.print = function(p, options) {
            var s = this.toString(options);
            if (s.length == 0) return;
            if (options.html) {
                p(s + '</br>');
            } else {
                p(s.replace(/\s+$/,''));
            }
        };
    };

    var _set_options = function(options) {
        if (options.html) {
            _theme_colors = Colors.html.make(colortheme);
        } else if (options.color) {
            _theme_colors = Colors.ansi.make(colortheme);
        } else {
            _theme_colors = Colors.text.make(colortheme);
        }
    };
    for (var key in colortheme) {
        var keytitle = 'append' + key.charAt(0).toUpperCase() + key.substr(1, key.length);
        var fcnname = key.charAt(0).toUpperCase() + key.substr(1, key.length);
        Printable[fcnname] = function(x) {
            if (!x || x.length < 1) {
                return null;
            }
            var o = arguments.callee;
            var p = new Printable();
            p[o.type](x);
            return p;
        };
        Printable[fcnname].type = keytitle;
    };
    Printable.spacedPipe = function(size) {
        var p = new Printable();
        p.appendSpacedPipe(size);
        return p;
    };
    Printable.text = function(x) {
        if (!x || x.length < 1) {
            return null;
        }
        var p = new Printable();
        p.append(x);
        return p;
    };
    Printable.colorize = function(x) {
        if (!x || x.length < 1) {
            return null;
        }
        var p = new Printable();
        p.appendColorize(x);
        return p;
    };
    module.exports = Printable;
})();
