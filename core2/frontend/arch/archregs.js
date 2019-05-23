/* 
 * Copyright (C) 2019 elicn
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
    const Long = require('libdec/long');
    const Expr = require('core2/analysis/ir/expressions');
    const Stmt = require('core2/analysis/ir/statements');

    const regs = [
        ['rax', 'eax', 'ax', 'al', 'ah'],
        ['rbx', 'ebx', 'bx', 'bl', 'bh'],
        ['rcx', 'ecx', 'cx', 'cl', 'ch'],
        ['rdx', 'edx', 'dx', 'dl', 'dh'],

        ['rsp', 'esp', 'sp', 'spl'],
        ['rbp', 'ebp', 'bp', 'bpl'],
        ['rsi', 'esi', 'si', 'sil'],
        ['rdi', 'edi', 'di', 'dil'],

        ['r8',  'r8d',  'r8w',  'r8b' ],
        ['r9',  'r9d',  'r9w',  'r9b' ],
        ['r10', 'r10d', 'r10w', 'r10b'],
        ['r11', 'r11d', 'r11w', 'r11b'],
        ['r12', 'r12d', 'r12w', 'r12b'],
        ['r13', 'r13d', 'r13w', 'r13b'],
        ['r14', 'r14d', 'r14w', 'r14b'],
        ['r15', 'r15d', 'r15w', 'r15b']
    ];

    // TODO: Duktape Array prototype has no 'find' method. this workaround should be
    // removed when Duktape implements this method for Array prototype.
    // <WORKAROUND>
    regs.find = function(predicate) {
        for (var i = 0; i < this.length; i++) {
            if (predicate(this[i])) {
                return this[i];
            }
        }

        return undefined;
    };
    // </WORKAROUND>

    var find_overlaps = function(reg) {
        return regs.find(function(ovl_list) {
            return (ovl_list.indexOf(reg.name) !== (-1));
        });
    };

    const IDX_REG64 = 0;
    const IDX_REG32 = 1;
    const IDX_REG16 = 2;
    const IDX_REG8L = 3;
    const IDX_REG8H = 4;

    const MASK32 = Long.fromInt(0x00000000ffffffff, true);
    const MASK16 = Long.fromInt(0x000000000000ffff, true);
    const MASK8L = Long.fromInt(0x00000000000000ff, true);
    const MASK8H = Long.fromInt(0x000000000000ff00, true);

    const MASK_INV16 = Long.fromInt(0xffffffffffff0000, true);
    const MASK_INV8L = Long.fromInt(0xffffffffffffff00, true);
    const MASK_INV8H = Long.fromInt(0xffffffffffff00ff, true);

    // TODO: omit REG64 if arch.bits is not 64

    var set64 = function(reg64, ovl) {
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg32, new Expr.And(reg64.clone(), new Expr.Val(MASK32, 64))),
            new Expr.Assign(reg16, new Expr.And(reg64.clone(), new Expr.Val(MASK16, 64))),
            new Expr.Assign(reg8l, new Expr.And(reg64.clone(), new Expr.Val(MASK8L, 64))),
        ];

        // TODO: may be redundant as 8h is not accessible on x64
        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg64.clone(), new Expr.Val(MASK8H, 64)), new Expr.Val(8, 64))));
        }

        return gen;
    };

    var set32 = function(reg32, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg64, new Expr.And(reg32.clone(), new Expr.Val(MASK32, 32))),
            new Expr.Assign(reg16, new Expr.And(reg32.clone(), new Expr.Val(MASK16, 32))),
            new Expr.Assign(reg8l, new Expr.And(reg32.clone(), new Expr.Val(MASK8L, 32))),
        ];

        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg32.clone(), new Expr.Val(MASK8H, 32)), new Expr.Val(8, 32))));
        }

        return gen;
    };

    var set16 = function(reg16, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(MASK_INV16, 64)), reg16.clone())),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV16, 32)), reg16.clone())),
            new Expr.Assign(reg8l, new Expr.And(reg16.clone(), new Expr.Val(MASK8L, 16))),
        ];

        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg16.clone(), new Expr.Val(MASK8H, 16)), new Expr.Val(8, 16))));
        }

        return gen;
    };

    var set8l = function(reg8l, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(MASK_INV8L, 64)), reg8l.clone())),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV8L, 32)), reg8l.clone())),
            new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(MASK_INV8L, 16)), reg8l.clone()))
        ];
    };

    var set8h = function(reg8h, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(MASK_INV8H, 64))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 64))),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV8H, 32))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 32))),
            new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(MASK_INV8H, 16))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 16)))
        ];
    };

    return {
        gen_overlaps: function(reg) {
            var ovl = find_overlaps(reg);

            if (ovl) {
                const handler = [set64, set32, set16, set8l, set8h];

                var addr = reg.parent_stmt().addr;
                var idx = ovl.indexOf(reg.name);
                var exprs = handler[idx](reg, ovl);

                return exprs.map(function(e) {
                    return Stmt.make_statement(addr, e);
                });
            }

            return [];
        }
    };
})();