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

    var _parent_stmt_address = function(expr) {
        return expr.parent_stmt().address;
    };

    // XXX: 'lt' is not correct, since 'before' and 'after' relations should be determined
    // by control flow graph rather than the address
    var _is_defined_by = function(range, address) {
        return _parent_stmt_address(range[0]).lt(address);
    };

    // XXX: see remark above
    var _is_alive_by = function(range, address) {
        return (range[1] === null) || _parent_stmt_address(range[1]).lt(address);
    };

    var _get_live_defs_by = function(ranges, address) {
        return ranges.filter(function(rng) {
            return _is_defined_by(rng, address) && _is_alive_by(rng, address);
        }).map(function(rng) {
            return rng[0];
        // }).sort(function(a, b) {
        //     var a_addr = a.parent_stmt().address;
        //     var b_addr = b.parent_stmt().address;
        //
        //     return a_addr.compare(b_addr);
        });
    };

    CConvCdecl.prototype.get_args_expr = function(fcall, live_ranges) {
        var top_of_stack = null;
        var args = [];

        var live_by_fcall = _get_live_defs_by(live_ranges, _parent_stmt_address(fcall));

        for (var i = (live_by_fcall.length - 1); i >= 0; i--) {
            var def = live_by_fcall[i];

            if (def instanceof Expr.Deref) {
                var deref_op = def.operands[0];

                if (this.arch.is_stack_reg(deref_op) || this.arch.is_stack_var(deref_op)) {
                    if (!top_of_stack) {
                        top_of_stack = def.clone(['def', 'idx']);
                    }

                    if (def.equals_no_idx(top_of_stack)) {
                        var arg = def.clone(['def', 'idx']);

                        // register arg as a new user
                        arg.def = def;
                        def.uses.push(arg);

                        args.push(arg);

                        top_of_stack = new Expr.Deref(new Expr.Add(top_of_stack.operands[0], this.arch.ASIZE_VAL.clone()));
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

    var _parent_def = function(expr) {
        for (var p = expr.parent; p instanceof Expr.Expr; p = p.parent) {
            if (p instanceof Expr.Assign) {
                return p.operands[0];
            }
        }

        return null;
    };

    var _is_weak_use = function(expr) {
        var def = _parent_def(expr);

        return def && (def instanceof Expr.Reg) && (def.weak);
    };

    CConvAmd64.prototype.get_args_expr = function(fcall, live_ranges) {
        var args = this.arg_regs64.slice();
        var nargs = 0;

        var fcall_address = _parent_stmt_address(fcall);

        var live_by_fcall = live_ranges.filter(function(rng) {
            return _is_defined_by(rng, fcall_address) && ((rng[1] !== null) && _is_weak_use(rng[1]));
        }).map(function(rng) {
            return rng[0];
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

            for (var j = 0; j < this.arg_regs64.length; j++) {
                if (def.equals_no_idx(this.arg_regs64[j]) ||
                    def.equals_no_idx(this.arg_regs32[j])) {
                    var arg = def.clone(['idx', 'def']);

                    // register arg as a new user
                    arg.def = def;
                    def.uses.push(arg);

                    args[j] = arg;

                    nargs = Math.max(nargs, j);
                }
            }
        }

        return args.slice(0, nargs + 1);
    };

    return CallConv;
})();