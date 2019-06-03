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
        this.arch_stack_reg = arch.get_stack_reg();
        this.arch_asize_val = arch.get_asize_val();
    }

    var scale = function(vexpr, scalar) {
        return new Expr.Val(vexpr.value.mul(scalar), vexpr.size);
    };

    var cdecl_get_nargs = function(setup, sreg) {
        var nargs = 0;

        setup.forEach(function(expr) {
            if (expr instanceof Expr.Assign) {
                var lhand = expr.operands[0];
                var rhand = expr.operands[1];

                // reached an assignment to a stack location; that is probably an argument for the upcoming function call
                if ((lhand instanceof Expr.Deref) && lhand.iter_operands(true)[0].equals(sreg)) {
                    nargs++;
                }

                // reached a stack pointer adjustment, this is most likely a cleanup after a function call. start over
                else if (lhand.equals(sreg) && (rhand instanceof Expr.Add) && rhand.operands[0].equals(sreg)) {
                    nargs = 0;
                }
            }
        });

        return nargs;
    };

    CConvCdecl.prototype.get_args_expr = function(setup) {
        var nargs = cdecl_get_nargs(setup, this.arch_stack_reg);
        var args = new Array(nargs);

        for (var j = 0; j < nargs; j++) {
            args[j] = new Expr.Deref(new Expr.Add(this.arch_stack_reg.clone(), scale(this.arch_asize_val, j)));
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

    CConvAmd64.prototype.get_args_expr = function(setup) {
        var args = this.arg_regs64.slice();
        var nargs = 0;

        // as opposed to arguments passed on the stack, arguments passed on registers are
        // not necessarily assigned in their natural order; in some cases, they may not be
        // assigned at all [e.g. when passing caller's arguments directly].
        //
        // here we look for assignments to arguments registers and will set `nargs` to be the
        // latest index of an argument register, regardless of the order they are set in code.
        //
        // for example: if a setup block contains two assignments: to "rdx" and then "edi",
        // `nargs` will be set to 3 since "edx" comes later on the arguments list of this
        // calling convension and it is the 3rd one. this is regardless of the actual
        // assignment order and the fact that "rsi" was not assigned at all (it is assumed to
        // be passed directly).

        setup.forEach(function(expr) {
            if (expr instanceof Expr.Assign) {
                var lhand = expr.operands[0];

                // reached an assignment to an argument register; that is probably an argument for the upcoming function call
                for (var i = 0; i < this.arg_regs64.length; i++) {
                    if (lhand.equals(this.arg_regs64[i]) ||
                        lhand.equals(this.arg_regs32[i])) {
                        args[i] = lhand.clone();

                        nargs = Math.max(nargs, i);
                    }
                }
            }
        }, this);

        return args.slice(0, nargs + 1);
    };

    return CallConv;
})();