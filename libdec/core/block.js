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
    const Long = require('libdec/long');

    var Bounds = function(low, hi) {
        this.low = low;
        this.hi = hi;
        this.gt = function(bound) {
            return this.hi.gt(bound.low);
        };
        this.isInside = function(addr) {
            return addr ? (addr.gte(this.low) && addr.lte(this.hi)) : false;
        };
        this.isOutside = function(addr) {
            return !this.isInside(addr);
        };
    };

    Bounds.invalid = function() {
        return new Bounds(Long.MAX_UNSIGNED_VALUE, Long.MAX_UNSIGNED_VALUE);
    };

    var _sort_extra = function(a, b) {
        if (a.address.eq(b.address)) {
            return 0;
        } else if (a.address.lt(b.address)) {
            return -1;
        }
        return 1;
    };

    var _block = function(bounds) {
        this.bounds = bounds || Bounds.invalid();
        this.extra = [];
        this.instructions = [];
        this.addInstruction = function(instruction) {
            this.instructions.push(instruction);
            this.update();
        };
        this.addExtra = function(extra) {
            this.extra.push(extra);
            this.extra = this.extra.sort(_sort_extra);
        };
        this.update = function() {
            var l = this.instructions.length;
            if (l > 0) {
                var first = this.instructions[0];
                var last = this.instructions[l - 1];
                this.bounds = new Bounds(first.location, last.location);
            }
        };
        this.split = function(from) {
            if (from < 0 || from >= this.instructions.length) return null;
            var i = this.instructions.splice(from, this.instructions.length);
            var b = new _block(new Bounds(i[0].location, i[i.length - 1].location));
            b.instructions = i;
            var e = this.extra[this.extra.length - 1];
            while (e && e.address.gte(b.bounds.low)) {
                b.extra.push(this.extra.pop());
                e = this.extra[this.extra.length - 1];
            }
            this.update();
            b.update();
            return b;
        };
        this.print = function() {
            for (var i = 0, j = 0; i < this.instructions.length; i++) {
                while (this.extra[j] && this.extra[j].isHead && this.extra[j].address.eq(this.instructions[i].location)) {
                    this.extra[j].print();
                    j++;
                }
                this.instructions[i].print();
                while (this.extra[j] && this.extra[j].isTail && this.extra[j].address.eq(this.instructions[i].location)) {
                    this.extra[j].print();
                    j++;
                }
            }
        };
    };
    return _block;
})();