/* 
 * Copyright (C) 2017 deroad
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

module.exports = (function () {
    var cfg = require('../config');
    var XRefs = require('./XRefs');
    var Strings = require('./Strings');
    var Block = require('./Block');
    var Routine = require('./Routine');

    var _resolve_xref = function (xrefs, blocks) {
        var block;
        var instr;
        var elem;
        for (var i = 0; i < blocks.length; i++) {
            block = blocks[i];
            for (var j = 0; j < block.instr.length; j++) {
                instr = block.instr[j];
                for (var k = 0; k < instr.xrefs.length; k++) {
                    elem = xrefs.search(instr.xrefs[k].addr);
                    instr.comments.push(elem ? elem.value : cfg.strings.xref + instr.xrefs[k].addr.toString(16));
                }
            }
        }
    };

    var _resolve_strings = function (strings, blocks) {
        var block;
        var instr;
        var elem;
        for (var i = 0; i < blocks.length; i++) {
            block = blocks[i];
            for (var j = 0; j < block.instr.length; j++) {
                instr = block.instr[j];
                if (instr.ref && instr.ptr) {
                    elem = strings.search(instr.ptr);
                    if (elem) {
                        instr.string = '"' + elem.value + '"';
                    }
                }
            }
        }
    };

    var _analyze = function (block, arch) {
        var fcn, opcode;
        for (var i = 0; i < block.instr.length; i++) {
            opcode = block.instr[i].opcode.replace(/sym\.imp\.|sym\./, '');
            block.instr[i].parsed = arch.parse(opcode);
            fcn = arch.instr[block.instr[i].parsed[0]];
            if (fcn) {
                block.instr[i].pseudo = fcn(block.instr[i], block);
            } else {
                block.instr[i].pseudo = '_asm("' + arch.asm(block.instr[i].parsed) + '");';
            }
        }
    };

    /*
     * Expects agj, isj and izj jsons as input.
     */
    var Analyzer = function () {
        this.make = function (agj) {
            var blocks = agj[0].blocks.map(function (b) {
                return new Block(b);
            });
            var routine = new Routine(agj[0].name, blocks);
            return routine;
        };
        this.strings = function (routine, izj) {
            var blocks = routine.blocks;
            var strings = new Strings(izj);
            _resolve_strings(strings, blocks);
        };
        this.analyze = function (routine, arch) {
            var blocks = routine.blocks;
            for (var i = 0; i < blocks.length; i++) {
                _analyze(blocks[i], arch);
            }
        };
        this.xrefs = function (routine, isj) {
            var blocks = routine.blocks;
            var xrefs = new XRefs(isj);
            _resolve_xref(xrefs, blocks);
        };
    };
    return new Analyzer();
})();