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
        if (a == b) {
            return 0;
        }
        return a.bounds.gt(b.bounds) ? 1 : -1;
    };

    var _condition = function(instruction, invert) {
        return instruction.cond ? new Condition.convert(instruction.cond.a, instruction.cond.b, instruction.cond.type, invert) : new Condition.inf();
    };


    var ControlFlowContext = function(blocks, instructions) {
        this.instructions = instructions;
        this.labels = [];
        this.addLabel = function(label) {
            if (label) {
                this.labels.push(label);
            }
        };
        this.findLabel = function(location) {
            for (var i = 0; i < this.labels.length; i++) {
                if (this.labels[i].address.eq(location)) {
                    return this.labels[i];
                }
            }
        };
        this.blocks = blocks;
        this.addBlock = function(blk) {
            if (blk) {
                this.blocks.push(blk);
                this.blocks = this.blocks.sort(_compare_blocks);
            }
        };
        this.findBlock = function(location) {
            for (var i = 0; i < this.blocks.length; i++) {
                if (this.blocks[i].bounds.isInside(location)) {
                    return this.blocks[i];
                }
            }
        };
    };

    var _set_goto = function(instruction, label) {
        if (!instruction.code || !instruction.valid) {
            instruction.code = Base.goto(label);
            instruction.valid = true;
        } else if (instruction.code.composed) {
            instruction.code.composed.push(Base.goto(label));
        } else {
            instruction.code = Base.composed([instruction.code, Base.goto(label)]);
        }
    };

    var _set_outbounds_jump = function(instruction, index, context) {
        if (Utils.search(instruction.jump, context.instructions, _compare_locations)) {
            return false;
        }
        if (!instruction.code) {
            //instruction.code = Base.goto('0x' + instruction.jump.toString());
            var call = Variable.functionPointer('0x' + instruction.jump.toString(16), 0, []);
            instruction.code = Base.call(call, []);
            // if we have a jump as the last instruction, then we will have a return call for sure.
        }

        if (context.instructions.indexOf(instruction) == (context.instructions.length - 1)) {
            instruction.code = Base.return(instruction.code);
            if (instruction.cond) {
                instruction.comments.push('Beware that this jump is a conditional jump.');
                instruction.comments.push('r2dec transformed it as a return, due being the');
                instruction.comments.push('last instruction. Please, check \'pdda\' output');
                instruction.comments.push('for more hints.');
            }
        } else if (instruction.cond) {
            var block = context.findBlock(instruction.location);
            var single_instr = block.split(block.instructions.indexOf(instruction));
            if (single_instr) {
                single_instr.addExtraHead(new Scope.if(instruction.location, _condition(instruction, false)));
                single_instr.addExtraTail(new Scope.brace(instruction.location));
                context.addBlock(single_instr);
                context.addBlock(single_instr.split(1));
            }
        }

        instruction.setBadJump();
        return true;
    };

    var _set_loops = function(instruction, index, context) {
        // loops jumps only backwards or to the same location.
        var single_instr = null;
        if (instruction.jump.gt(instruction.location)) {
            return false;
        }
        var block = context.findBlock(instruction.location);

        // let's check if is a oneline loop or panic loop
        if (instruction.jump.eq(instruction.location)) {
            single_instr = block.split(index);
            if (single_instr) {
                if (!instruction.code) {
                    single_instr.addExtraHead(new Scope.whileInline(instruction.jump, _condition(instruction)));
                } else {
                    single_instr.addExtraHead(new Scope.do(instruction.jump));
                    single_instr.addExtraTail(new Scope.whileEnd(instruction.location, _condition(instruction)));
                }
                context.addBlock(single_instr);
                context.addBlock(single_instr.split(1));
            }
            return true;
        }

        var loop_start = Utils.search(instruction.jump, block.instructions, _compare_locations);
        if (!loop_start) {
            var label = context.findLabel(instruction.jump);
            if (!label) {
                label = Variable.newLabel(instruction.jump);
                context.addLabel(label);
            }
            _set_goto(instruction, label);
            if (instruction.cond) {
                single_instr = block.split(block.instructions.indexOf(instruction));
                // here the jump is taken only if the condition is true.
                if (single_instr) {
                    single_instr.addExtraHead(new Scope.if(instruction.location, _condition(instruction, false)));
                    single_instr.addExtraTail(new Scope.brace(instruction.location));
                    context.addBlock(single_instr);
                    context.addBlock(single_instr.split(1));
                }
            }
            return true;
        }
        var loop_start_index = block.instructions.indexOf(loop_start);
        var previous = block.instructions[loop_start_index - 1];
        var loop_block = block.split(loop_start_index);

        var next = loop_block.split(loop_block.instructions.indexOf(instruction) + 1);

        // let's check it there is a jump inside the loop
        // if it is, then it's a while (cond) {}
        if (previous && previous.jump && previous.jump.gte(instruction.jump) && previous.jump.lte(instruction.location)) {
            previous.setBadJump();
            loop_block.addExtraHead(new Scope.while(instruction.jump, _condition(instruction)));
            loop_block.addExtraTail(new Scope.brace(instruction.location));
        } else {
            // ok it's a do {} while (cond);
            loop_block.addExtraHead(new Scope.do(instruction.jump));
            loop_block.addExtraTail(new Scope.whileEnd(instruction.location, _condition(instruction)));
        }

        context.addBlock(loop_block);
        context.addBlock(next);
        return true;
    };

    var _set_if_else = function(instruction, index, context) {
        var label = null;
        // if/else jumps only forward and inside the block.
        if (instruction.jump.lte(instruction.location)) {
            return false;
        }

        // if jumps to the next instruction, just ignore it..
        if (!instruction.cond && context.instructions[index + 1] && context.instructions[index + 1].location.eq(instruction.jump)) {
            instruction.setBadJump();
            return false;
        }
        if (!instruction.cond) {
            if (!instruction.code) {
                label = context.findLabel(instruction.jump);
                if (!label) {
                    label = Variable.newLabel(instruction.jump);
                    context.addLabel(label);
                }
                instruction.code = Base.goto(label);
            }
            return true;
        }

        var block = context.findBlock(instruction.location);

        var outside = Utils.search(instruction.jump, block.instructions, _compare_locations);

        // not found. let's use goto.
        if (!outside) {
            label = context.findLabel(instruction.jump);
            if (!label) {
                label = Variable.newLabel(instruction.jump);
                context.addLabel(label);
            }
            _set_goto(instruction, label);
            if (instruction.cond) {
                var single_instr = block.split(block.instructions.indexOf(instruction));
                if (!single_instr) {
                    return true;
                }
                // here the jump is taken only if the condition is true.
                single_instr.addExtraHead(new Scope.if(instruction.location, _condition(instruction, false)));
                single_instr.addExtraTail(new Scope.brace(instruction.location));
                context.addBlock(single_instr);
                context.addBlock(single_instr.split(1));
            }
            return true;
        }

        // let's create the if block.
        var if_block = block.split(block.instructions.indexOf(instruction));
        if_block.addExtraHead(new Scope.if(instruction.location, _condition(instruction, true)));


        // let's get the last element inside the if (jump instr -1).
        var outside_index = if_block.instructions.indexOf(outside);
        var last_if_instruction = if_block.instructions[outside_index - 1];

        // let's check if the last instruction is a jump forward (outside), that can lead to an else
        if (last_if_instruction.jump && !last_if_instruction.cond && last_if_instruction.jump.gt(last_if_instruction.location)) {
            // ok we have an else. let's search for the last instruction.
            var first_else_instruction = outside;
            var instr_after_else = Utils.search(last_if_instruction.jump, context.instructions, _compare_locations);
            var last_else_instruction = context.instructions[context.instructions.indexOf(instr_after_else) - 1];
            if (Utils.search(last_else_instruction.location, if_block.instructions, _compare_locations) && first_else_instruction != instr_after_else) {
                var lh = if_block.lastHead();
                var ft = if_block.firstTail();
                if (lh && lh.isElse && ft && ft.address.eq(last_else_instruction.location)) {
                    if_block.addExtraTail(new Scope.brace(first_else_instruction.location));
                    if_block.addExtraHead(new Scope.else(first_else_instruction.location));
                } else {
                    if_block.addExtraHead(new Scope.else(first_else_instruction.location));
                    if_block.addExtraTail(new Scope.brace(last_else_instruction.location));
                }
                last_if_instruction.setBadJump();
                outside_index = if_block.instructions.indexOf(last_else_instruction) + 1;
            } else {
                if_block.addExtraTail(new Scope.brace(last_if_instruction.location));
            }
        } else {
            if_block.addExtraTail(new Scope.brace(last_if_instruction.location));
        }

        context.addBlock(if_block);
        context.addBlock(if_block.split(outside_index));
        return true;
    };

    return function(session) {
        var j, i;
        var context = new ControlFlowContext(session.blocks, session.instructions);

        for (j = 0; j < session.instructions.length; j++) {
            if (!session.instructions[j].jump) {
                continue;
            }
            if (!_set_outbounds_jump(session.instructions[j], j, context)) {
                _set_loops(session.instructions[j], j, context);
            }
        }

        for (j = 0; j < session.instructions.length; j++) {
            if (!session.instructions[j].jump) {
                continue;
            }
            _set_if_else(session.instructions[j], j, context);
        }

        for (i = 0; i < context.labels.length; i++) {
            var instruction = Utils.search(context.labels[i].address, session.instructions, _compare_locations);
            instruction.label = context.labels[i];
        }

        session.blocks = context.blocks.sort(_compare_blocks);
    };
})();