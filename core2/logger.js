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
    var _level = 0;
    var Logger = {};

    Logger.WARNING = 0;
    Logger.INFO = 1;
    Logger.DEBUGGER = 2;

    Logger.is = function(level) {
        return _level >= level;
    };

    Logger.warn = function() {
        if (_level >= Logger.WARNING) {
            console.log.apply(console, arguments);
        }
    };

    Logger.info = function() {
        if (_level >= Logger.INFO) {
            console.log.apply(console, arguments);
        }
    };

    Logger.debug = function() {
        if (_level >= Logger.DEBUGGER) {
            console.log.apply(console, arguments);
        }
    };

    Logger.set = function(level) {
        _level = level;
    };

    return Logger;
})();