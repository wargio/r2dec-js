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
    var __colors = [
        'black',
        'red',
        'green',
        'yellow',
        'blue',
        'magenta',
        'cyan',
        'white',
        'gray',
    ];
    var Color = function(name) {
        if (__colors.indexOf(name) < 0) {
            throw new Error('Invalid name: ' + name);
        }
        var fn = function(x) {
            return x;
        };
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