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
    var __colors = {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        gray: [90, 39],
    };
    function pair(name, n) {
        if (name.length === 6) {
            n *= 2;
            return parseInt(name.substring (n, n + 2), 16);
        }
        return (parseInt(name.substring (n, n + 1), 16) << 4) >>> 0;
    }
    var Color = function(name) {
        var fn = function(x) {
            var o = arguments.callee;
            return o.open + x + o.close;
        };
        if (name.startsWith('rgb:')) {
            name = name.substring (4);
            const str = '38;2;'+ pair(name, 0) + ';' + pair(name, 1) + ';' + pair(name, 2);
            fn.open = '\u001b[' + str + 'm';
            fn.close = '\u001b[39m';
        } else {
            if (!__colors[name]) {
                throw new Error('Invalid name: ' + name);
            }
            fn.open = '\u001b[' + __colors[name][0] + 'm';
            fn.close = '\u001b[' + __colors[name][1] + 'm';
        }
        return fn;
    };
    Color.make = function(theme) {
        var g = {};
        for (var key in theme) {
            g[key] = Color(theme[key]);
        }
        return g;
    };
    return Color;
});
