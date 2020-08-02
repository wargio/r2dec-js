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

    // <DEBUG>
    // var __print_debug_info = function(lranges, fcall) {
    //     console.log(fcall.parent_stmt().address.toString(16), 'fcall:', fcall.toString());
    // 
    //     lranges.forEach(function(rng) {
    //         var d = rng.def;
    //         var c0 = d.weak ? '\033[90m' : '';
    //         var c1 = d.weak ? '\033[0m' : '';
    // 
    //         console.log(c0, ' |', 'def:', d.parent.parent.toString(), c1);
    // 
    //         d.uses.forEach(function(u) {
    //             console.log(c0, ' |', ' |', u.parent_stmt().toString(), c1);
    //         });
    //     });
    //     console.log();
    // };
    // </DEBUG>

    var _get_defined_by = function(context, expr) {
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

    // --------------------------------------------------

    // cc base class for arguments passed on the stack
    function StackArgsCC(arch) {
        this.arch = arch;
    }

    StackArgsCC.prototype.get_args_expr = function(fcall, context) {
        var top_of_stack = null;
        var args = [];

        var live_by_fcall = _get_defined_by(context, fcall);

        // drop all definitions that are already used prior to fcall
        live_by_fcall = live_by_fcall.filter(function(rng) {
            return rng.is_unused_by(fcall);
        });

        // <DEBUG>
        // __print_debug_info(live_by_fcall, fcall);
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

    StackArgsCC.prototype.get_arg_index = function(def) {
        return this.arch.is_stack_reg(def) ? 1 : (-1);
    };

    // --------------------------------------------------

    // cc base class for arguments passed through registers
    function RegArgsCC(regsset) {
        this.regsset = regsset;
    }

    var _is_phi_with_unint_arg = function(def) {
        var val = def.parent.operands[1];

        var __is_uninit = function(o) {
            return (o.idx === 0);
        };

        return (val instanceof Expr.Phi) && val.operands.some(__is_uninit);
    };

    RegArgsCC.prototype.get_args_expr = function(fcall, context) {
        var nargs = (-1);
        var args = [];

        var live_by_fcall = _get_defined_by(context, fcall);

        // <DEBUG>
        // __print_debug_info(live_by_fcall, fcall);
        // </DEBUG>

        // arguments passed through registers would have overlap assingments generated for
        // them, in which we are not interested. drop all weak definitions before proceeding
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

            var __matching_arg_reg = function(areg) {
                return def.equals_no_idx(areg);
            };

            this.regsset.forEach(function(set, j) {
                if (set.find(__matching_arg_reg)) {
                    // do not consider phi definitions that have at least one uninit argument. that prevents
                    // registers that are not initialized on all paths from being considered as fcall args
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
            });
        }

        return args.slice(0, nargs + 1).map(function(def) {
            return _make_user(def);
        });
    };

    RegArgsCC.prototype.get_arg_index = function(def) {
        var __matching_arg_reg = function(areg) {
            return def.equals_no_idx(areg);
        };

        return this.regsset.findIndex(function(set) {
            return !!set.find(__matching_arg_reg);
        });
    };

    // --------------------------------------------------

    function cdecl(arch) {
        StackArgsCC.call(this, arch);
    }

    cdecl.prototype = Object.create(StackArgsCC.prototype);
    cdecl.prototype.constructor = cdecl;

    // --------------------------------------------------

    const _amd64_argsset = [
        [new Expr.Reg('rdi', 64), new Expr.Reg('edi', 32), new Expr.Reg('dil', 8)],
        [new Expr.Reg('rsi', 64), new Expr.Reg('esi', 32), new Expr.Reg('sil', 8)],
        [new Expr.Reg('rdx', 64), new Expr.Reg('edx', 32), new Expr.Reg('dl',  8)],
        [new Expr.Reg('rcx', 64), new Expr.Reg('ecx', 32), new Expr.Reg('cl',  8)],
        [new Expr.Reg('r8',  64), new Expr.Reg('r8d', 32), new Expr.Reg('r8b', 8)],
        [new Expr.Reg('r9',  64), new Expr.Reg('r9d', 32), new Expr.Reg('r9b', 8)]
    //  [new Expr.Reg('xmm0', 128)],
    //  [new Expr.Reg('xmm1', 128)],
    //  [new Expr.Reg('xmm2', 128)],
    //  [new Expr.Reg('xmm3', 128)],
    //  [new Expr.Reg('xmm4', 128)],
    //  [new Expr.Reg('xmm5', 128)],
    //  [new Expr.Reg('xmm6', 128)],
    //  [new Expr.Reg('xmm7', 128)]
    ];

    function amd64() {
        RegArgsCC.call(this, _amd64_argsset);
    }

    amd64.prototype = Object.create(RegArgsCC.prototype);
    amd64.prototype.constructor = amd64;

    // --------------------------------------------------

    const _ms_argsset = [
        [new Expr.Reg('xmm0', 128), new Expr.Reg('rcx', 64), new Expr.Reg('ecx', 32), new Expr.Reg('cl',  8)],
        [new Expr.Reg('xmm1', 128), new Expr.Reg('rdx', 64), new Expr.Reg('edx', 32), new Expr.Reg('dl',  8)],
        [new Expr.Reg('xmm2', 128), new Expr.Reg('r8',  64), new Expr.Reg('r8d', 32), new Expr.Reg('r8b', 8)],
        [new Expr.Reg('xmm3', 128), new Expr.Reg('r9',  64), new Expr.Reg('r9d', 32), new Expr.Reg('r9b', 8)]
    ];

    function ms() {
        RegArgsCC.call(this, _ms_argsset);
    }

    ms.prototype = Object.create(RegArgsCC.prototype);
    ms.prototype.constructor = ms;

    // --------------------------------------------------
    
    function guess(cchandlers) {
        this.cchandlers = cchandlers;
    }

    // BUG:
    //
    // consider the following assembly code:
    //    push 0
    //    mov  eax, dword [var_8h]
    //    push eax
    //    mov  ecx, dword [var_8h]
    //    mov  edx, dword [ecx + 0x14]
    //    call edx
    //
    // correct analysis would yield the following fcall:
    //    (var_8h + 20)(var_8h, 0)
    //
    // however, by the time this method is used to guess the calling convension, var_8h is already
    // propagated into [ecx + 0x14], which in turn is propagated into the fcall target. though the
    // propagations took place, the propagated definitions (now appear 'unused') are not pruned yet.
    // that causes the cc guess method to pick up edx as the first considerable argument, since it
    // has no uses left

    guess.prototype.get_args_expr = function(fcall, context) {
        var live_by_fcall = _get_defined_by(context, fcall);

        // drop all definitions that are already used prior to fcall
        live_by_fcall = live_by_fcall.filter(function(rng) {
            return rng.is_unused_by(fcall) && !(rng.def.weak);
        });

        var cc_obj = null;
        var cc_rank = (-1);

        // scan live defs backwards starting from fcall to locate potential args
        for (var i = (live_by_fcall.length - 1); !cc_obj && (i >= 0); i--) {
            var rng = live_by_fcall[i];

            // query all cc what arg index (rank) would the current def get. the cc
            // to return the minimal rank would be picked
            for (var j = 0; j < this.cchandlers.length; j++) {
                var cc = this.cchandlers[j];
                var rank = cc.get_arg_index(rng.def);

                if ((cc_rank === (-1)) || (rank < cc_rank)) {
                    cc_obj = cc;
                    cc_rank = rank;
                }
            }
        }

        if (cc_obj) {
            // console.log('assuming', fcall.parent_stmt().toString(), 'is called using', cc_obj.constructor.name);

            return cc_obj.get_args_expr(fcall, context);
        }

        // could not find any suitable cc
        return [];
    };

    return function(arch) {
        var cc_cdecl = new cdecl(arch);
        var cc_amd64 = new amd64();
        var cc_ms = new ms();
        var cc_guess = new guess([cc_cdecl, cc_amd64, cc_ms]);

        return {
            ''     : cc_guess,  // unknown cc, try to guess it
            'cdecl': cc_cdecl,  // args passed through stack
            'amd64': cc_amd64,  // args passed through: rdi, rsi, rdx, rcx, r8, r9, xmm0-7
            'ms'   : cc_ms      // args passed through: rcx, rdx, r8, r9
        };
    };
});