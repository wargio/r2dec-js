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
    var Base = require('libdec/core/base');
    var Utils = require('libdec/core/utils');
    var Scope = require('libdec/core/scope');
    var Variable = require('libdec/core/variable');
    var Condition = require('libdec/core/condition');

    var _compare_locations = function(a, b) {
        if (a.eq(b.location)) {
            return 0;
        }
        return a.lt(b.location) ? 1 : -1;
    };

    var _compare_blocks = function(a, b) {
        // TODO
        return 0
    };

    var _condition = function(instruction, invert) {
        return instruction.cond ? new Condition.convert(instruction.cond.a, instruction.cond.b, instruction.cond.type, invert) : new Condition.inf()
    }

    var _set_outbounds_jump = function(blkdata, instrdata) {
        var block = blkdata.current;
        var instruction = instrdata.instruction;
        if (block.bounds.isInside(instruction.jump)) {
            return false;
        }
        if (!instruction.code) {
            instruction.code = Base.goto('0x' + instruction.jump.toString());
        }
        return true;
    };

    var _set_loops = function(blkdata, instrdata) {
        var block = blkdata.current;
        var instruction = instrdata.instruction;

        // loops jumps only backwards or to the same location.
        if (instruction.jump.gt(instruction.location)) {
            return false;
        }

        // let's check if is a oneline loop or panic loop
        if (instruction.jump.eq(instruction.location)) {
            if (!instruction.code) {
                block.addExtra(new Scope.whileInline(instruction.jump, _condition(instruction)));
            } else {
                block.addExtra(new Scope.do(instruction.jump));
                block.addExtra(new Scope.whileEnd(instruction.location, _condition(instruction)));
            }
            return true;
        }

        // let's check it there is a jump inside the loop
        // if it is, then it's a while (cond) {}
        var previous = Utils.search(instruction.jump, block.instructions, _compare_locations);
        if (previous && previous.jump && previous.jump.gte(instruction.jump) && previous.jump.lte(instruction.location)) {
            block.addExtra(new Scope.while(instruction.jump, _condition(instruction)));
            block.addExtra(new Scope.brace(instruction.location));
        }
        // ok it's a do {} while (cond);
        block.addExtra(new Scope.do(instruction.jump));
        block.addExtra(new Scope.whileEnd(instruction.location, _condition(instruction)));
        return true;
    };

    var _set_if_else = function(blkdata, instrdata) {
        var block = blkdata.current;
        var instruction = instrdata.instruction;

        // if/els jumps only forward.
        if (instruction.jump.lte(instruction.location)) {
            return false;
        }

        // let's check if contains a jump outside the if.
        var previous = Utils.search(instruction.jump, block.instructions, _compare_locations);
        if (instruction.jump.eq(instruction.location)) {
            if (!instruction.code) {
                block.addExtra(new Scope.whileInline(instruction.jump, _condition(instruction)));
            } else {
                block.addExtra(new Scope.do(instruction.jump));
                block.addExtra(new Scope.whileEnd(instruction.location, _condition(instruction)));
            }
            return true;
        }

        return true;
    };

    return function(session) {
        var blocks = session.blocks;

        var context = {
            labels: [],

        };

        var blkdata = {
            list: blocks,
            current: null,
            index: -1
        };
        var instrdata = {
            instruction: null,
            index: -1
        };
        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            blkdata.current = blk;
            blkdata.index = i;
            for (var j = 0; j < blk.instructions.length; j++) {
                if (!blk.instructions[j].jump) continue;
                instrdata.instruction = blk.instructions[j];
                instrdata.index = j;
                if (!_set_outbounds_jump(blkdata, instrdata)) {
                    _set_loops(blkdata, instrdata);
                }
            }
        }
        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            blkdata.current = blk;
            blkdata.index = i;
            for (var j = 0; j < blk.instructions.length; j++) {
                if (!blk.instructions[j].jump) continue;
                instrdata.instruction = blk.instructions[j];
                instrdata.index = j;
                _set_if_else(blkdata, instrdata);
            }
        }
    };
})();