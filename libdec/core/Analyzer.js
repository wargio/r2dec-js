/* 
 * Copyright (C) 2017-2018 deroad
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
    var Base = require('libdec/arch/base');
    const cfg = require('libdec/config');
    var Flow = require('libdec/core/Flow');
    var Scope = require('libdec/core/Scope');
    var Instruction = require('libdec/core/Instruction');
    var XRefs = require('libdec/core/XRefs');
    var Strings = require('libdec/core/Strings');
    var Routine = require('libdec/core/Routine');

    var _resolve_xref = function(xrefs, instr) {
        instr.forEach(function(e) {
            if (e.ref && e.ptr) {
                var str = xrefs.search(e.ptr);
                if (str) {
                    e.comments.push(str ? str.value : cfg.strings.xref + e.ptr.toString(16));
                }
            }
            for (var i = 0; i < e.xrefs.length; i++) {
                var str = xrefs.search(e.xrefs[i].addr);
                if (str) {
                    e.comments.push(str ? str.value : cfg.strings.xref + e.xrefs[i].addr.toString(16));
                } else {
                    e.comments.push(cfg.strings.xref + e.xrefs[i].addr.toString(16) + ' ' + e.xrefs[i].type);
                }
            }
        });
    };

    var _resolve_strings = function(strings, instr) {
        instr.forEach(function(e) {
            if (e.ref && e.ptr) {
                var str = strings.search(e.ptr);
                if (str) {
                    e.string = '"' + str.value + '"';
                }
            }
        });
    };

    var _analyze_instructions = function(instructions, arch, context) {
        var fcn, opcode, instr;
        for (var i = 0; i < instructions.length; i++) {
            instr = instructions[i];
            // removes just 'sym.[imp.]' strings..
            instr.opcode = instr.opcode.replace(cfg.anal.replace, '');
            instr.parsed = arch.parse(instr.opcode);
        }
        if (arch.delayed_branch) {
            arch.delayed_branch(instructions);
        }
        for (var i = 0; i < instructions.length; i++) {
            instr = instructions[i];
            fcn = arch.instructions[instr.parsed[0]];
            if (fcn) {
                instr.pseudo = fcn(instr, context, instructions);
            } else {
                instr.pseudo = Base.instructions.unknown(instr.opcode);
            }
        }
    };

    var _analyze_flows = function(scopes, instructions) {
        Flow(scopes, instructions);
    };

    /*
     * Expects agj, isj and izj jsons as input.
     */
    var Analyzer = function() {
        this.make = function(agj) {
            var instructions = [];
            var scope = new Scope();
            for (var i = 0; i < agj[0].blocks.length; i++) {
                var block = agj[0].blocks[i];
                instructions = instructions.concat(block.ops.map(function(b) {
                    return new Instruction(b, scope);
                }));
            }
            var routine = new Routine(agj[0].name, instructions);
            return routine;
        };
        this.strings = function(routine, izj) {
            var instructions = routine.instructions;
            var strings = new Strings(izj);
            _resolve_strings(strings, instructions);
        };
        this.analyze = function(routine, arch) {
            var context = arch.context();
            _analyze_instructions(routine.instructions, arch, context);
            _analyze_flows(routine.instructions)
            routine.returnType = arch.returns(context);
        };
        this.xrefs = function(routine, isj) {
            var instructions = routine.instructions;
            var xrefs = new XRefs(isj);
            _resolve_xref(xrefs, instructions);
        };
    };
    return new Analyzer();
})();