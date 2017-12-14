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


module.exports = (function() {
    var Branch = require('./Branch');
    var Scope = require('./Scope');
    var cfg = require('../config');

    /*
                var value = block.cond.type ? Branch.generate(block.cond.a, block.cond.b, block.cond.type, Branch.DEFINE.DEFAULT) : '\/\* unknown \*\/';
                var temp = Scope.generate(/#/, value, 'while (#) {', '}');
    */

    var _detect_while = function(flow, instr, index) {
        var current = instr[index];
        if (current.jump && current.jump.lte(current.loc)) {

        }
    };

    var _detect_jmp = function(flow, instr, index) {};

    var _detect_if = function(flow, instr, index) {
        return false;
    };

    var _detect = function(flow, instr, index) {
        _detect_while(flow, instr, index);
        _detect_if(flow, instr, index);
    };

    return function(instr) {
        var flow = [];
        _detect(flow, instr.splice(), 0);
        return flow;
    };
})();