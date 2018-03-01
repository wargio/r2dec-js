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
    var Base = require('../arch/base');
    var cfg = require('../config');
    Utils = require('./Utils');

    var _label_counter = 0;

    var AddressBounds = function(low, hi) {
        this.low = low;
        this.hi = hi;

        this.isInside = function(addr) {
            return addr ? (addr.gte(this.low) && addr.lte(this.hi)) : false;
        }
    };

    var _compare_loc = function(a, b) {
        if (a.eq(b.loc)) {
            return 0;
        }
        return a.lt(b.loc) ? 1 : -1;
    };

    /* [long] jumps */
    var _detect_jumps = function(instructions, index, context) {
        var instr = instructions[index];
        if (context.limits.isInside(instr.jump)) {
            return false;
        }
        if (!instr.pseudo) {
            instr.pseudo = Base.goto(instr.jump);
        }
        return true;
    };

    var _has_label = function(instr) {
        return typeof instr.pseudo == 'string' && instr.pseudo.toString().indexOf('goto label_') == 0;
    }

    var _set_label = function(instructions, index, is_external) {
        var instr = instructions[index];
        if (is_external) {
            instr.pseudo = Base.goto(instr.jump);
            return false;
        }
        var found = Utils.search(instr.jump, instructions, _compare_loc);
        if (found) {
            var label = (found.label < 0) ? _label_counter++ : found.label;
            found.label = label;
            instr.pseudo = Base.goto('label_' + label);
            return true;
        }
        return false;
    };

    var _shift_any_instruction_after_goto = function(instructions, index, level) {
        // reshift any instruction after the goto label_xxxxx.
        var instr = instructions[index];
        var scope = new Scope(level);
        for (var j = index + 1; j < instructions.length; j++) {
            var shift = instructions[j];
            if (instr.scope.uid != shift.scope.uid) {
                break;
            }
            shift.scope = scope;
        }

    };

    var _detect_if = function(instructions, index, context) {
        var instr = instructions[index];
        if (instr.jump.lte(instr.loc) || !instr.cond) {
            return false;
        }
        var scope = new Scope();
        var level = instr.scope.level;
        scope.level = level + 1;
        var end = instr.jump;
        var bounds = new AddressBounds(instr.loc, instr.jump);
        /* if(cond) { block } */
        var cond = Branch.generate(instr.cond.a, instr.cond.b, instr.cond.type, Branch.FLOW_DEFAULT);
        var fail = instr.fail;
        var elseinst = null;
        scope.header = 'if (' + cond + ') {';
        scope.trailer = '}';
        for (var i = index; i < instructions.length; i++) {
            instr = instructions[i];
            if (end.lte(instr.loc)) {
                break;
            }
            if (instr.scope.level == scope.level) {
                instr.scope.level++;
            } else if (instr.scope.level >= level && instr.scope.level < scope.level) {
                instr.scope = scope;
                elseinst = null;
            }
            if (instr.jump && context.limits.isInside(instr.jump) && !bounds.isInside(instr.jump)) {
                elseinst = instr;
                end = instr.jump;
                bounds = new AddressBounds(instr.loc, instr.jump)
                scope.trailer = '}';
                scope = new Scope();
                scope.level = instr.scope.level;
                if (instr.fail && instr.cond) {
                    var cond = Branch.generate(instr.cond.a, instr.cond.b, instr.cond.type, Branch.FLOW_DEFAULT);
                    scope.header = 'else if (' + cond + ') {';
                } else {
                    scope.header = 'else {';
                }
                scope.trailer = '}';
            }
        }
        if (elseinst && elseinst.jump.gt(elseinst.loc)) {
            _set_label(instructions, instructions.indexOf(elseinst));
            elseinst = null;
        }
        return true;
    };

    var _detect_while = function(instructions, index, context) {
        var first = instructions[index];
        /* while(cond) { block } */
        if (!first.jump.lte(first.loc)) {
            return false;
        }
        /* infinite loop */
        var scope = new Scope();
        var bounds = new AddressBounds(first.jump, first.loc);
        var cond = first.cond ? Branch.generate(first.cond.a, first.cond.b, first.cond.type, Branch.FLOW_DEFAULT) : Branch.true();
        var instr = Utils.search(first.jump, instructions, _compare_loc);
        if (!instr) {
            return false;
        }
        var start = instructions.indexOf(instr);
        var is_while = (instructions[start - 1] && bounds.isInside(instructions[start - 1].jump));
        if (instructions[start].scope.level > first.scope.level) {
            _set_label(instructions, index, !context.limits.isInside(first.jump));
            return true;
        }
        scope.level = instructions[start].scope.level + 1;
        scope.header = is_while ? ('while (' + cond + ') {') : 'do {';
        var scopes = [];
        for (var i = start; i < index; i++) {
            instr = instructions[i];
            if (instr.scope.level == scope.level) {
                instr.scope.level++;
                scopes.push(instr.scope);
            } else if (instr.scope.level < scope.level) {
                instr.scope = scope;
            } else if (instr.scope.level > scope.level && scopes.indexOf(instr.scope) < 0) {
                scopes.push(instr.scope);
                instr.scope.level++;
            }
            if (instr.jump && instr.jump.gt(instr.loc) && !bounds.isInside(instr.jump)) {
                if (_set_label(instructions, i, !context.limits.isInside(instr.jump))) {
                    _shift_any_instruction_after_goto(instructions, i, scope.level - 1);
                }
            }
        }
        scope.trailer = is_while ? '}' : '} while (' + cond + ');';
        return true;
    };

    return function(instructions) {
        var context = {
            limits: new AddressBounds(instructions[0].loc, instructions[instructions.length - 1].loc)
        };
        for (var i = 0; i < instructions.length; i++) {
            if (!instructions[i].jump) {
                continue;
            }
            if (!_detect_jumps(instructions, i, context)) {
                _detect_if(instructions, i, context);
            }
        }
        for (var i = 0; i < instructions.length; i++) {
            if (!instructions[i].jump) {
                continue;
            }
            if (!_detect_jumps(instructions, i, context)) {
                _detect_while(instructions, i, context);
            }
        }
    };
})();