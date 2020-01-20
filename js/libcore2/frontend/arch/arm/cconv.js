/** 
 * Copyright (C) 2018-2019 elicn
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
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Simplify = require('js/libcore2/analysis/ir/simplify');

    const _arm_registers = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'];

    const _arg_regs = _arm_registers.map(function(x) { return new Expr.Reg(x, 32); });

    var _is_defined = function(x) {
        return !!x;
    };

    var _is_seq = function(x, i) {
        return x.name == _arm_registers[i];
    };

    var _make_user = function(def) {
        var use = def.clone(['idx']);

        use.def = def;
        use.def.uses.push(use);

        return use;
    };

    function CCArm32() {
    }

    var _is_phi_with_unint_arg = function(def) {
        var val = def.parent.operands[1];

        var __is_uninit = function(o) {
            return (o.idx === 0);
        };

        return (val instanceof Expr.Phi) && val.operands.some(__is_uninit);
    };

    var _get_live_unused_by = function(context, expr) {
        // var live_by = context.live_ranges.filter(function(rng) {
        //     return rng.is_defined_by(expr)  // defined before expr is reached on that cfg path
        //         // && rng.is_alive_by(expr)    // definition is still alive by expr is reached
        //         && rng.is_unused_by(expr);  // definition is not used [or used only by weak users] by expr is reached
        // });
        //
        // // extract definitions out of ranges
        // return live_by.map(function(rng) {
        //     return rng.def;
        // });

        return context.live_ranges.filter(function(rng) {
            return rng.is_defined_by(expr);
        });
    };

    CCArm32.prototype.get_args_expr = function(fcall, context) {
        var nargs = (-1);
        var args = [];

        var live_by_fcall = _get_live_unused_by(context, fcall);

        // <DEBUG>
        // console.log(fcall.parent_stmt().address.toString(16), 'fcall:', fcall.toString());
        // live_by_fcall.forEach(function(d) {
        //     var d = rng.def;
        //     var c0 = d.weak ? '\033[90m' : '';
        //     var c1 = d.weak ? '\033[0m' : '';
        //
        //     console.log(c0, ' |', 'def:', d.parent.parent.toString(), c1);
        //
        //     d.uses.forEach(function(u) {
        //         console.log(c0, ' |', '  |', u.parent_stmt().toString(), c1);
        //     });
        // });
        // console.log();
        // </DEBUG>

        // drop all weak definitions
        live_by_fcall = live_by_fcall.filter(function(rng) {
            return !(rng.def.weak);
        });

        // as opposed to arguments passed on the stack, arguments passed on registers are
        // not necessarily assigned in their natural order; in some cases, they may not be
        // assigned at all [e.g. when passing caller's arguments directly].
        //
        // here we look for assignments to arguments registers and will set `nargs` to be the
        // latest index of an argument register, regardless of the order they are set in code.
        //
        // for example: if a setup contains two assignments: to "rdx" and then "edi",
        // `nargs` will be set to 3 since "edx" comes later on the arguments list of this
        // calling convension and it is the 3rd one. this is regardless of the actual
        // assignment order and the fact that "rsi" was not assigned at all (it is assumed to
        // be passed directly).

        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var rng = live_by_fcall[i];
            var def = rng.def;

            for (var j = 0; j < _arg_regs.length; j++) {
                if (def.equals_no_idx(_arg_regs[j])) {

                    // do not consider phi definitions that have at least one uninit argument. that prevents
                    // registers that are not initialized on all paths - from being considered as fcall args
                    if (!_is_phi_with_unint_arg(def)) {
                        // make sure that slot was not already taken; i.e. consider only the latest definition
                        // of the same name
                        if (args[j] === undefined) {
                            args[j] = def;

                            if (rng.is_unused_by(fcall)) {
                                nargs = Math.max(nargs, j);
                            }
                        }
                    }
                }
            }
        }

        return args.filter(_is_defined).filter(_is_seq).map(function(def) {
            return _make_user(def);
        });
    };

    const CConvs = {
        'arm32': new CCArm32(),
    };

    return CConvs;
});