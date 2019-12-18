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

    function CCcdecl(arch) {
        this.arch = arch;
    }

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

    var _make_user = function(def) {
        var use = def.clone(['idx']);

        use.def = def;
        use.def.uses.push(use);

        return use;
    };

    CCcdecl.prototype.get_args_expr = function(fcall, context) {
        var top_of_stack = null;
        var args = [];

        var live_by_fcall = _get_live_unused_by(context, fcall);

        // drop all definitions that are already used prior to fcall
        live_by_fcall = live_by_fcall.filter(function(rng) {
            return rng.is_unused_by(fcall);
        });

        // <DEBUG>
        // console.log(fcall.parent_stmt().address.toString(16), 'fcall:', fcall.toString());
        // live_by_fcall.forEach(function(rng) {
        //     var d = rng.def;
        //     var c0 = d.weak ? '\33[90m' : '';
        //     var c1 = d.weak ? '\33[0m' : '';
        //
        //     console.log(c0, ' |', 'def:', d.parent.parent.toString(), c1);
        //
        //     d.uses.forEach(function(u) {
        //         console.log(c0, ' |', '  |', u.parent_stmt().toString(), c1);
        //     });
        // });
        // console.log();
        // </DEBUG>

        // scan live defs backwards starting from fcall to locate top of stack
        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i].def;

            if (this.arch.is_stack_reg(def)) {
                top_of_stack = def.parent.operands[1].clone(['idx', 'def'], false);

                break;
            }
        }

        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i].def;

            if (def instanceof Expr.Deref) {
                var deref_op = def.operands[0];

                if (this.arch.is_stack_reg(deref_op) || this.arch.is_stack_var(deref_op)) {
                    if (deref_op.equals(top_of_stack)) {
                        args.push(_make_user(def));

                        // calculate next top of stack to look for
                        top_of_stack = new Expr.Add(top_of_stack, this.arch.ASIZE_VAL.clone());

                        // encapsulate it with a Deref expr only to make sure it can be reduced successfully
                        // (a reduced expr has to have a parent to handle the replacement)
                        top_of_stack = new Expr.Deref(top_of_stack, undefined);
                        Simplify.reduce_expr(top_of_stack);

                        // now un-encapsulate it back
                        top_of_stack = top_of_stack.operands[0];
                    } else {
                        // no more args
                        break;
                    }
                }
            }
        }

        return args;
    };

    CCcdecl.prototype.is_potential_arg = function(rng, fcall) {
        return rng.is_unused_by(fcall) && this.arch.is_stack_reg(rng.def);
    };

    // --------------------------------------------------

    const _arg_regs64 = [
        new Expr.Reg('rdi', 64),
        new Expr.Reg('rsi', 64),
        new Expr.Reg('rdx', 64),
        new Expr.Reg('rcx', 64),
        new Expr.Reg('r8',  64),
        new Expr.Reg('r9',  64)
    ];

    const _arg_regs32 = [
        new Expr.Reg('edi', 32),
        new Expr.Reg('esi', 32),
        new Expr.Reg('edx', 32),
        new Expr.Reg('ecx', 32),
        new Expr.Reg('r8d', 32),
        new Expr.Reg('r9d', 32)
    ];

    // const _arg_regs128 = [
    //     new Expr.Reg('xmm0', 128),
    //     new Expr.Reg('xmm1', 128),
    //     new Expr.Reg('xmm2', 128),
    //     new Expr.Reg('xmm3', 128),
    //     new Expr.Reg('xmm4', 128),
    //     new Expr.Reg('xmm5', 128),
    //     new Expr.Reg('xmm6', 128),
    //     new Expr.Reg('xmm7', 128),
    // ];

    function CCamd64() {
        // empty
    }

    var _is_phi_with_unint_arg = function(def) {
        var val = def.parent.operands[1];

        var __is_uninit = function(o) {
            return (o.idx === 0);
        };

        return (val instanceof Expr.Phi) && val.operands.some(__is_uninit);
    };

    CCamd64.prototype.get_args_expr = function(fcall, context) {
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

            for (var j = 0; j < _arg_regs64.length; j++) {
                if (def.equals_no_idx(_arg_regs64[j]) ||
                    def.equals_no_idx(_arg_regs32[j])) {

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

        return args.slice(0, nargs + 1).map(function(def) {
            return _make_user(def);
        });
    };

    CCamd64.prototype.is_potential_arg = function(rng, fcall) {
        var found = false;

        for (var j = 0; !found && (j < _arg_regs64.length); j++) {
            found = rng.def.equals_no_idx(_arg_regs64[j]) ||
                    rng.def.equals_no_idx(_arg_regs32[j]);
        }

        return found;
    };

    // --------------------------------------------------

    function CCguess(cchandlers) {
        this.cchandlers = cchandlers;
    }

    CCguess.prototype.get_args_expr = function(fcall, context) {
        var live_by_fcall = _get_live_unused_by(context, fcall);

        var CCobj = null;

        // scan live defs backwards starting from fcall to locate potential args
        for (var i = (live_by_fcall.length - 1); !CCobj && (i >= 0); i--) {
            var rng = live_by_fcall[i];

            // find first cc handler that would consider def as a potential fcall argument
            for (var j = 0; !CCobj && (j < this.cchandlers.length); j++) {
                var cc = this.cchandlers[j];

                if (cc.is_potential_arg(rng, fcall)) {
                    CCobj = cc;
                }
            }
        }

        if (CCobj) {
            // console.log('assuming', fcall.parent_stmt().toString(), 'is called using', CCobj.constructor.name);

            return CCobj.get_args_expr(fcall, context);
        }

        // could not find any suitable cc
        return [];
    };

    return function(arch) {
        var cc_cdecl = new CCcdecl(arch);
        var cc_amd64 = new CCamd64();
        var cc_guess = new CCguess([cc_cdecl, cc_amd64]);

        return {
            ''     : cc_guess,  // unknown cc, try to guess it
            'cdecl': cc_cdecl,  // args passed through stack
            'amd64': cc_amd64   // args passed through: rdi, rsi, rdx, rcx, r8, r9, xmm0-7
        };
    };
});