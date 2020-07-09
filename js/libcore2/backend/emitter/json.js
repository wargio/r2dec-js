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
    function JsonEmitter(conf) {
        this.offsets = conf.offsets;
        this.tabsize = conf.tabsize;
    }

    JsonEmitter.prototype.emit = function(listing, printer) {
        Object.keys(listing).forEach(function(skey) {
            var scope = listing[skey];

            scope.lines.forEach(function(l) {
                l.line = printer.colorizeAll(l.line);
            });
        });

        return JSON.stringify(listing);
    };

    return JsonEmitter;
});