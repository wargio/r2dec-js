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
    Utils = require('./Utils');

    var AddrBounds = function(low, hi) {
        this.low = low;
        this.hi = hi;

        this.isInside = function(addr) {
            return addr.gte(this.low) && addr.lte(this.hi);
        }
    };

    var _compare_loc = function(a, b) {
        if (a.eq(b.loc)) {
            return 0;
        } else if (a.lt(b.loc)) {
            return 1;
        }
        return -1;
    };
    /* [long] jumps */
    var _detect_jumps = function(scopes, instructions, index, context) {
        var instr = instructions[index];
        if (context.limits.isInside(instr.jump)) {
            return false;
        }
        if (!instr.pseudo) {
            instr.pseudo = 'goto 0x' + instr.jump.toString(16) + ';'
        }
        return true;
    };

    var _detect_while = function(scopes, instructions, index, context) {
        var instr = instructions[index];
        var current = scopes[instr.scopeid];
        /* while(cond) { block } */
        if (instr.jump.lte(instr.loc)) {
            /* infinite loop */
            if (instr.jump.eq(current.loc)) {
                var cond = instr.cond ? Branch.generate(instr.cond.a, instr.cond.b, instr.cond.type, Branch.FLOW_DEFAULT) : Branch.true();
                scopes[instr.scopeid] = Scope.generate(current.loc, current.ident + cfg.ident, cond, 'do {', '} while (#);');
                context.while.push(new AddrBounds(instr.jump, instr.loc));
                return true;
            } else {
                var cond = instr.cond ? Branch.generate(instr.cond.a, instr.cond.b, instr.cond.type, Branch.FLOW_DEFAULT) : Branch.true();
                var tmpscope = Utils.search(instr.jump, scopes, _compare_loc);
                var tmpinstr = Utils.search(tmpscope.loc, instructions, _compare_loc);
                scopes[tmpinstr.scopeid] = Scope.generate(tmpscope.loc, tmpscope.ident, cond, 'do {', '');
                var start = instructions.indexOf(tmpinstr);
                tmpscope = null;
                for (var i = start; i <= index; i++) {
                    tmpinstr = instructions[i];
                    if (tmpscope != scopes[tmpinstr.scopeid]) {
                        tmpscope = scopes[tmpinstr.scopeid];
                        tmpscope.increaseIdent();
                    }
                }
                scopes[tmpinstr.scopeid] = Scope.generate(tmpinstr.loc, tmpscope.ident, cond, '', '} while (#);');
                context.while.push(new AddrBounds(instr.jump, instr.loc));
                return true;
            }
        }
        return false;
    };

    var _detect_if = function(scopes, instructions, index, context) {
        var instr = instructions[index];
        var current = scopes[instr.scopeid];
        if (instr.jump.lte(instr.loc)) {
            return false;
        }
        /* if(cond) { block } */
        var cond = instr.cond ? Branch.generate(instr.cond.a, instr.cond.b, instr.cond.type, Branch.FLOW_DEFAULT) : Branch.true();
        var tmpscope = Utils.search(instr.jump, scopes, _compare_loc);
        var tmpinstr = Utils.search(instr.jump, instructions, _compare_loc);
        scopes[tmpinstr.scopeid] = Scope.generate(tmpscope.loc, tmpscope.ident, cond, 'if (#) {', '');
        var end = instructions.indexOf(tmpinstr);
        tmpscope = null;
        for (var i = index; i < end; i++) {
            tmpinstr = instructions[i];
            if (tmpscope != scopes[tmpinstr.scopeid]) {
                tmpscope = scopes[tmpinstr.scopeid];
                tmpscope.increaseIdent();
            }
        }
        scopes[tmpinstr.scopeid] = Scope.generate(tmpinstr.loc, tmpscope.ident, cond, '', '}');
        return true;
    };

    return function(scopes, instructions) {
        var context = {
            limits: new AddrBounds(instructions[0].loc, instructions[instructions.length - 1].loc),
            while: []
        };
        for (var i = 0; i < instructions.length; i++) {
            if (!instructions[i].jump) {
                continue;
            }
            if (!_detect_jumps(scopes, instructions, i, context)) {
                if (!_detect_while(scopes, instructions, i, context)) {
                    _detect_if(scopes, instructions, i, context);
                }
            }
        }
    };
})();