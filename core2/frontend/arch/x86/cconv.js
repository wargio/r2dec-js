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

module.exports = (function() {
    const Expr = require('core2/analysis/ir/expressions');
    const Simplify = require('core2/analysis/ir/simplify');

    function CallConv(arch) {
        this.cconvs = {
            'cdecl': CConvCdecl,    // args passed through stack
        //  'ms'   : CConvMs,       // args passed through: rcx, rdx, r8, r9 | xmm0-3 + stack
            'amd64': CConvAmd64     // args passed through: rdi, rsi, rdx, rcx, r8, r9, xmm0-7
        };

        this.cached = {};
        this.arch = arch;
    }

    CallConv.prototype.has = function(ccname) {
        return ccname in this.cconvs;
    };

    CallConv.prototype.get = function(ccname) {
        if (!(ccname in this.cached)) {
            this.cached[ccname] = new this.cconvs[ccname](this.arch);
        }

        return this.cached[ccname];
    };

    // --------------------------------------------------

    function CConvCdecl(arch) {
        this.arch = arch;
    }

    // check whether a definition precedes a specified expression in cfg
    var _is_defined_by = function(def, expr) {
        var def_pstmt = def.parent_stmt();
        var exp_pstmt = expr.parent_stmt();

        // live ranges are collected recursively along cfg walk. for that reason, all definitions defined in
        // another block are guaranteed to precede expr. definition that is defined in the same block, must
        // be checked to be defined earlier
        return (def_pstmt.parent !== exp_pstmt.parent) || def_pstmt.address.lt(exp_pstmt.address);
    };

    // check whether a definition is alive by specified expression
    var _is_alive_by = function(use, expr) {
        if (use === null) {
            return true;
        }

        var use_pstmt = use.parent_stmt();
        var exp_pstmt = expr.parent_stmt();

        return (use_pstmt.parent !== exp_pstmt.parent) || use_pstmt.address.ge(exp_pstmt.address);
    };

    var _get_live_defs_by = function(ranges, expr) {
        // select ranges of deinitions that are either defined by specified expr, or
        // still alive by its address
        var live_by = ranges.filter(function(rng) {
            var def = rng[0];   // defined variable
            var use = rng[1];   // killing user

            return _is_defined_by(def, expr) && _is_alive_by(use, expr);
        });

        // extract definitions out of ranges
        return live_by.map(function(rng) {
            return rng[0];
        });
    };

    CConvCdecl.prototype.get_args_expr = function(fcall, live_ranges) {
        var top_of_stack = null;
        var args = [];

        var live_by_fcall = _get_live_defs_by(live_ranges, fcall);

        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i];

            if (def instanceof Expr.Deref) {
                var deref_op = def.operands[0];

                if (this.arch.is_stack_reg(deref_op) || this.arch.is_stack_var(deref_op)) {
                    if (!top_of_stack) {
                        top_of_stack = def.clone(['idx', 'def'], false);
                    }

                    if (def.equals_no_idx(top_of_stack)) {
                        var arg = def.clone(['idx', 'def']);

                        // register arg as a new user
                        arg.def = def;
                        arg.def.uses.push(arg);

                        args.push(arg);

                        top_of_stack = new Expr.Deref(new Expr.Add(top_of_stack.operands[0], this.arch.ASIZE_VAL.clone()), this.arch.bits);
                        Simplify.reduce_expr(top_of_stack);
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

    function CConvAmd64() {
        // TODO: xmm0-7

        this.arg_regs64 = [
            new Expr.Reg('rdi', 64),
            new Expr.Reg('rsi', 64),
            new Expr.Reg('rdx', 64),
            new Expr.Reg('rcx', 64),
            new Expr.Reg('r8',  64),
            new Expr.Reg('r9',  64)
        ];

        this.arg_regs32 = [
            new Expr.Reg('edi', 32),
            new Expr.Reg('esi', 32),
            new Expr.Reg('edx', 32),
            new Expr.Reg('ecx', 32),
            new Expr.Reg('r8d', 32),
            new Expr.Reg('r9d', 32)
        ];
    }

    CConvAmd64.prototype.get_args_expr = function(fcall, live_ranges) {
        var nargs = 0;
        var args = this.arg_regs64.slice();

        var live_by_fcall = _get_live_defs_by(live_ranges, fcall);

        // drop all weak definitions
        live_by_fcall = live_by_fcall.filter(function(def) {
            return !(def.weak);
        });

        // <DEBUG>
        // console.log('live definitions by:', _parent_stmt_address(fcall).toString(16));
        // live_by_fcall.forEach(function(def) {
        //     console.log(' ', def);
        // });
        // </DEBUG>

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

            for (var j = 0; j < this.arg_regs64.length; j++) {
                if (def.equals_no_idx(this.arg_regs64[j]) ||
                    def.equals_no_idx(this.arg_regs32[j])) {

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

    return CallConv;
})();