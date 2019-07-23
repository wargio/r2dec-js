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
    const Long = require('libdec/long');

    var Bounds = function(low, hi) {
        this.low = low;
        this.hi = hi;
        this.gt = function(bound) {
            return this.low.gt(bound.low);
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
        }
        return a.address.gt(b.address) ? 1 : -1;
    };

    var _fill_splitted_extra = function(oldblock, newblock, name) {
        var e = oldblock[name][oldblock[name].length - 1];
        while (e && e.address.gte(newblock.bounds.low)) {
            newblock[name].push(oldblock[name].pop());
            e = oldblock[name][oldblock[name].length - 1];
        }
    };

    var _block = function(bounds) {
        this.bounds = bounds || Bounds.invalid();
        this.extraHead = [];
        this.extraTail = [];
        this.instructions = [];
        this.addInstruction = function(instruction) {
            this.instructions.push(instruction);
            this.update();
        };
        this.addExtraHead = function(extra) {
            this.extraHead.push(extra);
            this.extraHead.sort(_sort_extra);
        };
        this.lastHead = function(extra) {
            return this.extraHead.length > 0 ? this.extraHead[this.extraHead.length - 1] : null;
        };
        this.firstTail = function(extra) {
            return this.extraTail.length > 0 ? this.extraTail[0] : null;
        };
        this.addExtraTail = function(extra) {
            this.extraTail.unshift(extra);
            this.extraTail.sort(_sort_extra);
        };
        this.update = function() {
            var l = this.instructions.length;
            if (l > 0) {
                var first = this.instructions[0];
                var last = this.instructions[l - 1];
                this.bounds = new Bounds(first.location, last.location);
            } else {
                // invalidate this block if is empty..
                this.bounds = Bounds.invalid();
            }
        };
        this.split = function(from) {
            if (from < 0 || from >= this.instructions.length) {
                return null;
            }
            var i = this.instructions.splice(from, this.instructions.length);
            var b = new _block(new Bounds(i[0].location, i[i.length - 1].location));
            b.instructions = i;

            _fill_splitted_extra(this, b, 'extraHead');
            _fill_splitted_extra(this, b, 'extraTail');

            this.update();
            b.update();
            return b;
        };
        this.ascomment = function() {
            for (var i = 0; i < this.instructions.length; i++) {
                this.instructions[i].ascomment();
            }
        };
        this.ascodeline = function() {
            for (var i = 0; i < this.instructions.length; i++) {
                this.instructions[i].ascodeline();
            }
        };
        this.hasPrintables = function() {
            for (var i = 0; i < this.instructions.length; i++) {
                if (this.instructions[i].valid && this.instructions[i].code) {
                    return true;
                }
            }
            return false;
        };
        this.print = function() {
            var h = 0;
            var t = 0;
            var i;
            for (i = 0; i < this.instructions.length; i++) {
                while (this.extraHead[h] && this.extraHead[h].address.lte(this.instructions[i].location)) {
                    this.extraHead[h].print();
                    h++;
                }
                this.instructions[i].print();
                while (this.extraTail[t] && this.extraTail[t].address.eq(this.instructions[i].location)) {
                    this.extraTail[t].print();
                    t++;
                }
            }
            //this one is bad, but it still require to be executed.
            for (i = h; i < this.extraHead.length; i++) {
                this.extraHead[i].print();
            }
            //this one is ok.
            for (i = t; i < this.extraTail.length; i++) {
                this.extraTail[i].print();
            }
        };
    };
    return _block;
});