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
    var Color = function(name) {
        if (!__colors[name]) {
            throw new Error('Invalid name: ' + name);
        }
        var fn = function(x) {
            var o = arguments.callee;
            return o.open + x + o.close;
        };
        fn.open = '\u001b[' + __colors[name][0] + 'm';
        fn.close = '\u001b[' + __colors[name][1] + 'm';
        return fn;
    };
    module.exports = Color;
    module.exports.make = function(theme) {
        var g = {};
        for (var key in theme) {
            g[key] = Color(theme[key]);
        }
        return g;
    };
})();