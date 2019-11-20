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

(function(){
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Simplify = require('js/libcore2/analysis/ir/simplify');

    function CConvCdecl(arch) {
        this.arch = arch;
    }

    // get definition (if any) that is assigned to the enclosing expression.
    // for example, get `def` for the specified `expr`:
    //      def = Expr(..., Expr(..., Expr(..., expr)))
    var _parent_def = function(expr) {
        for (var p = expr.parent; p instanceof Expr.Expr; p = p.parent) {
            if (p instanceof Expr.Assign) {
                return p.operands[0];
            }
        }

        return null;
    };

    // used in an expression that is assigned to a weak def
    var _is_weak_use = function(expr) {
        var def = _parent_def(expr);

        // WORKAROUND: actually this should check for wither weak use, or whether the use occures after expr in cfg.
        // this can be done by recording the cfg path along the way when building context, and see whether the use
        // appears there (occures ealier) or not (occures afterwards).
        // as a workaround, we check for phi uses, which are the common case for late use, but not all - hence this is
        // not acurate and may result in funny output
        return def && (((def instanceof Expr.Reg) && (def.weak)) || (def.parent.operands[1] instanceof Expr.Phi));
    };

    var _get_live_unused_by = function(context, expr) {
        var live_by = context.live_ranges.filter(function(rng) {
            return rng.is_defined_by(expr)              // defined before expr is reached on that cfg path
                && rng.is_alive_by(expr)                // definition is still alive by expr is reached
                && rng.def.uses
                && rng.def.uses.every(_is_weak_use);    // definition is either unused or used only by weak users
        });

        // extract definitions out of ranges
        return live_by.map(function(rng) {
            return rng.def;
        });
    };

    CConvCdecl.prototype.get_args_expr = function(fcall, context) {
        var top_of_stack = null;
        var args = [];

        var live_by_fcall = _get_live_unused_by(context, fcall);

        // <DEBUG>
        // console.log(fcall.parent_stmt().address.toString(16), 'fcall:', fcall.toString());
        // live_by_fcall.forEach(function(d) {
        //     console.log('  |', 'def:', d.parent.toString());
        //
        //     d.uses.forEach(function(u) {
        //         console.log('  |', '  |', _is_weak_use(u) ? '[w]' : '[ ]', u.parent_stmt().toString());
        //     });
        // });
        // console.log();
        // </DEBUG>

        // scan live defs backwards starting from fcall to locate top of stack
        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i];

            if (this.arch.is_stack_reg(def)) {
                top_of_stack = def.parent.operands[1].clone(['idx', 'def'], false);

                break;
            }
        }

        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i];

            if (def instanceof Expr.Deref) {
                var deref_op = def.operands[0];

                if (this.arch.is_stack_reg(deref_op) || this.arch.is_stack_var(deref_op)) {
                    if (deref_op.equals(top_of_stack)) {
                        var arg = def.clone(['idx', 'def']);

                        // register arg as a new user
                        arg.def = def;
                        arg.def.uses.push(arg);

                        args.push(arg);

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

    function CConvAmd64() {
        // empty
    }

    CConvAmd64.prototype.get_args_expr = function(fcall, context) {
        var nargs = 0;
        var args = _arg_regs64.slice();

        var live_by_fcall = _get_live_unused_by(context, fcall);

        // drop all weak definitions
        live_by_fcall = live_by_fcall.filter(function(def) {
            return !(def.weak);
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
            var def = live_by_fcall[i];

            for (var j = 0; j < _arg_regs64.length; j++) {
                if (def.equals_no_idx(_arg_regs64[j]) ||
                    def.equals_no_idx(_arg_regs32[j])) {

                    // make sure that slot was not already taken
                    if (args[j].def === undefined) {
                        var arg = def.clone(['idx']);

                        // register arg as a new user
                        arg.def = def;
                        arg.def.uses.push(arg);

                        args[j] = arg;
                        nargs = Math.max(nargs, j);
                    }
                }
            }
        }

        // XXX: some elements of 'args' may be the default ones, i.e. with no ssa data
        return args.slice(0, nargs + 1);
    };

    return function(arch) {
        return {
            'cdecl': new CConvCdecl(arch),  // args passed through stack
        //  'ms'   : new CConvMs(),         // args passed through: rcx, rdx, r8, r9 | xmm0-3 + stack
            'amd64': new CConvAmd64()       // args passed through: rdi, rsi, rdx, rcx, r8, r9, xmm0-7
        };
    };
});