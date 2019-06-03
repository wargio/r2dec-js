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

    // all architectural x86 / amd64 registers, except program counter
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

    const IDX_REG64 = 0;
    const IDX_REG32 = 1;
    const IDX_REG16 = 2;
    const IDX_REG8L = 3;
    const IDX_REG8H = 4;

    // 64-bit masks
    const MASK32 = Long.fromInt(0x00000000ffffffff, true);
    const MASK16 = Long.fromInt(0x000000000000ffff, true);
    const MASK8L = Long.fromInt(0x00000000000000ff, true);
    const MASK8H = Long.fromInt(0x000000000000ff00, true);

    // 32-bit masks
    const MASK_INV16 = Long.fromInt(0xffffffffffff0000, true);
    const MASK_INV8L = Long.fromInt(0xffffffffffffff00, true);
    const MASK_INV8H = Long.fromInt(0xffffffffffff00ff, true);

    // generate assignments for the overlapping counterparts of a 64-bit register
    var set64 = function(reg64, ovl) {
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg32, new Expr.And(reg64.clone(), new Expr.Val(MASK32, 64))),
            new Expr.Assign(reg16, new Expr.And(reg64.clone(), new Expr.Val(MASK16, 64))),
            new Expr.Assign(reg8l, new Expr.And(reg64.clone(), new Expr.Val(MASK8L, 64))),
        ];

        return gen;
    };

    // generate assignments for the overlapping counterparts of a 32-bit register
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

    // generate assignments for the overlapping counterparts of a 16-bit register
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

    // generate assignments for the overlapping counterparts of a low 8-bit register
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

    // generate assignments for the overlapping counterparts of a high 8-bit register [n/a in 64 bits]
    var set8h = function(reg8h, ovl) {
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV8H, 32))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 32))),
            new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(MASK_INV8H, 16))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 16)))
        ];
    };

    /**
     * Some architectural registers in the x86 architecture overlap each other,
     * which means that assigning a value to a register directly affects its
     * overlapping counterparts; e.g. assigning value to al affects the value in
     * eax, and vice versa.
     * 
     * This helper object is used to identify and implement the assignments side
     * effects on overlapping registers by generating the appropriate assignments
     * 
     * For additional information see: http://sandpile.org/x86/gpr.htm
     * @param {number} bits 
     * @constructor
     */
    function Overlaps(bits) {
        // a lookup table for overlapping registers: each register name
        // is mapped to its corresponding index on the regs list
        this.lookup = {};

        // note that the regs list includes all registers regardless of the number of
        // bits the binary operates in. a different subset is needed for different number
        // of bits and the lookup table should include only the relevant registers.
        //
        // however, to speed things up the code heavily relies on array indices. exact
        // filtering for all three possible options will be messy and introduce code clutter.
        // to keep it simple, some filtering was made and some was not.

        // if not in 64 bits, take only the first 8 table items
        var rows = bits === 64 ? regs.length : 8;

        for (var i = 0; i < rows; i++) {
            // higher bytes are inaccessible in 64 bits
            var cols = bits === 64 ?
                regs[i].length - 1 :
                regs[i].length;

            for (var j = 0; j < cols; j++) {
                this.lookup[regs[i][j]] = i;
            }
        }

        this.handlers = [
            set64,  // IDX_REG64
            set32,  // IDX_REG32
            set16,  // IDX_REG16
            set8l,  // IDX_REG8L
            set8h   // IDX_REG8H
        ];
    }

    Overlaps.prototype.generate = function(reg) {
        var ovl = regs[this.lookup[reg]];

        if (ovl) {
            var i = ovl.indexOf(reg.name);
            var exprs = this.handlers[i](reg, ovl);
            var addr = reg.parent_stmt().addr;

            return exprs.map(function(e) {
                return Stmt.make_statement(addr, e);
            });
        }

        return [];
    };

    return Overlaps;
})();