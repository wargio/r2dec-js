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
    const Long = require('js/libcore2/libs/long');
    const Expr = require('js/libcore2/analysis/ir/expressions');

    // intel architecture registers.
    // overlapping registers are stored in the same line, ordered by their size in bits.
    const ALL_REGS = [
        ['rax', 'eax', 'ax', 'al', 'ah'],
        ['rbx', 'ebx', 'bx', 'bl', 'bh'],
        ['rcx', 'ecx', 'cx', 'cl', 'ch'],
        ['rdx', 'edx', 'dx', 'dl', 'dh'],

        ['rsp', 'esp', 'sp', 'spl'],
        ['rbp', 'ebp', 'bp', 'bpl'],
        ['rsi', 'esi', 'si', 'sil'],
        ['rdi', 'edi', 'di', 'dil'],

        ['rip', 'eip', 'ip'],

        ['r8',  'r8d',  'r8w',  'r8b' ],
        ['r9',  'r9d',  'r9w',  'r9b' ],
        ['r10', 'r10d', 'r10w', 'r10b'],
        ['r11', 'r11d', 'r11w', 'r11b'],
        ['r12', 'r12d', 'r12w', 'r12b'],
        ['r13', 'r13d', 'r13w', 'r13b'],
        ['r14', 'r14d', 'r14w', 'r14b'],
        ['r15', 'r15d', 'r15w', 'r15b']
    ];

    // const IDX_RESULT_REG = 0;
    // const IDX_STACK_REG = 4;
    // const IDX_FRAME_REG = 5;
    // const IDX_PC_REG = 8;

    // size index: ALL_REGS columns
    const IDX_REG64 = 0;
    const IDX_REG32 = 1;
    const IDX_REG16 = 2;
    const IDX_REG8L = 3;
    const IDX_REG8H = 4;    // not applicable to all registers

    // bitmask constants
    const MASK32 = Long.fromBits(0xffffffff, 0x00000000, true);
    const MASK16 = Long.fromBits(0x0000ffff, 0x00000000, true);
    const MASK8L = Long.fromBits(0x000000ff, 0x00000000, true);
    const MASK8H = Long.fromBits(0x0000ff00, 0x00000000, true);
    const MASK_INV16 = MASK16.not();
    const MASK_INV8L = MASK8L.not();
    const MASK_INV8H = MASK8H.not();

    // generate assignments for the overlapping counterparts of a 64-bit register
    var set64 = function(reg64, ovl) {
        var reg32 = ovl[IDX_REG32] && new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = ovl[IDX_REG16] && new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = ovl[IDX_REG8L] && new Expr.Reg(ovl[IDX_REG8L],  8);

        return [
            reg32 && new Expr.Assign(reg32, new Expr.And(reg64.clone(), new Expr.Val(MASK32, 64))),
            reg16 && new Expr.Assign(reg16, new Expr.And(reg64.clone(), new Expr.Val(MASK16, 64))),
            reg8l && new Expr.Assign(reg8l, new Expr.And(reg64.clone(), new Expr.Val(MASK8L, 64))),
        ].filter(Boolean);
    };

    // generate assignments for the overlapping counterparts of a 32-bit register
    var set32 = function(reg32, ovl) {
        var reg64 = ovl[IDX_REG64] && new Expr.Reg(ovl[IDX_REG64], 64);
        var reg16 = ovl[IDX_REG16] && new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = ovl[IDX_REG8L] && new Expr.Reg(ovl[IDX_REG8L],  8);
        var reg8h = ovl[IDX_REG8H] && new Expr.Reg(ovl[IDX_REG8H],  8);

        return [
            reg64 && new Expr.Assign(reg64, new Expr.And(reg32.clone(), new Expr.Val(MASK32, 32))),
            reg16 && new Expr.Assign(reg16, new Expr.And(reg32.clone(), new Expr.Val(MASK16, 32))),
            reg8l && new Expr.Assign(reg8l, new Expr.And(reg32.clone(), new Expr.Val(MASK8L, 32))),
            reg8h && new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg32.clone(), new Expr.Val(MASK8H, 32)), new Expr.Val(8, 32)))
        ].filter(Boolean);
    };

    // generate assignments for the overlapping counterparts of a 16-bit register
    var set16 = function(reg16, ovl) {
        var reg64 = ovl[IDX_REG64] && new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = ovl[IDX_REG32] && new Expr.Reg(ovl[IDX_REG32], 32);
        var reg8l = ovl[IDX_REG8L] && new Expr.Reg(ovl[IDX_REG8L],  8);
        var reg8h = ovl[IDX_REG8H] && new Expr.Reg(ovl[IDX_REG8H],  8);

        return [
            reg64 && new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(MASK_INV16, 64)), reg16.clone())),
            reg32 && new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV16, 32)), reg16.clone())),
            reg8l && new Expr.Assign(reg8l, new Expr.And(reg16.clone(), new Expr.Val(MASK8L, 16))),
            reg8h && new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg16.clone(), new Expr.Val(MASK8H, 16)), new Expr.Val(8, 16)))
        ].filter(Boolean);
    };

    // generate assignments for the overlapping counterparts of a low 8-bit register
    var set8l = function(reg8l, ovl) {
        var reg64 = ovl[IDX_REG64] && new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = ovl[IDX_REG32] && new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = ovl[IDX_REG16] && new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            reg64 && new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(MASK_INV8L, 64)), reg8l.clone())),
            reg32 && new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV8L, 32)), reg8l.clone())),
            reg16 && new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(MASK_INV8L, 16)), reg8l.clone()))
        ].filter(Boolean);
    };

    // generate assignments for the overlapping counterparts of a high 8-bit register [n/a in 64 bits]
    var set8h = function(reg8h, ovl) {
        var reg32 = ovl[IDX_REG32] && new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = ovl[IDX_REG16] && new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            reg32 && new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(MASK_INV8H, 32))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 32))),
            reg16 && new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(MASK_INV8H, 16))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 16)))
        ].filter(Boolean);
    };

    // lookup generators by size index
    var handlers = [
        set64,  // IDX_REG64
        set32,  // IDX_REG32
        set16,  // IDX_REG16
        set8l,  // IDX_REG8L
        set8h   // IDX_REG8H
    ];

    // lookup register size by size index
    var sizes = [
        64,     // IDX_REG64
        32,     // IDX_REG32
        16,     // IDX_REG16
         8,     // IDX_REG8L
         8      // IDX_REG8H
    ];

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
    function ArchRegs(bits) {

        // we will never need all entries from ALL_REGS; a different subset is needed
        // depending on arch bits. this module is designed to rely on predefined indexes,
        // so instead of copying the relevant entries and discarding all the rest, all
        // entries are copied but irrelevant ones are masked out

        var subset = {
            64: [[0, 16], [0, 3]],  // rows: 0-16, cols: 0-3
            32: [[0,  8], [1, 4]],  // rows: 0-8,  cols: 1-4
            16: [[0,  8], [2, 4]]   // rows: 0-8,  cols: 2-4
        }[bits];

        var min_row = subset[0][0];
        var max_row = subset[0][1];
        var min_col = subset[1][0];
        var max_col = subset[1][1];

        // copy only relevant rows. in each row, copy all elements but mask out
        // the irrelevant ones
        var archregs = ALL_REGS.slice(min_row, max_row + 1).map(function(row) {
            var masked = Array(row.length);
            var relevant = row.slice(min_col, max_col + 1);

            // replace masked items with relevant ones
            //
            // unfortunately, duktape does not recognize array unpacking, so we cannot
            // use the splice method for that. replacing manually:
            for (var i = 0; i < relevant.length; i++) {
                masked[min_col + i] = relevant[i];
            }

            return masked;
        });

        // every time a register gets assigned, the module needs to determine its overlapping
        // counterparts and generate the appropriate assingments for them. this lookup table
        // maps each indevidual register name to its row index in the 'archregs' table
        var lookup = {};

        archregs.forEach(function(row, i) {
            row.forEach(function(item) {
                lookup[item] = i;
            });
        });

        /** @const {Array.<Array.<string>>} */
        this.archregs = archregs;

        /** @const {Object.<string,number>} */
        this.lookup = lookup;
    }

    /**
     * Retrieve register size by its name.
     * @param {string} name Register name
     * @returns {number} Register size in bits, or 0 if register name is unknown
     */
    ArchRegs.prototype.get_reg_size = function(name) {
        var rgroup = this.archregs[this.lookup[name]];

        return rgroup ? sizes[rgroup.indexOf(name)] || 0 : 0;
    };

    /**
     * Generate assignments for the overlapping counterparts of `reg`
     * @param {Expr.Reg} reg Register instance
     * @returns {Array.<Expr.Assign>} An array of assignment expressions
     */
    ArchRegs.prototype.generate = function(reg) {
        var rgroup = this.archregs[this.lookup[reg.name]];

        if (rgroup) {
            var generator = handlers[rgroup.indexOf(reg.name)];
            var assingments = generator(reg, rgroup);

            // overalpping assignments add artificial definitions; tagging them as
            // 'weak' helps later analysis distinct them from genuine ones
            assingments.forEach(function(expr) {
                expr.operands[0].weak = true;
            });

            return assingments;
        }

        return [];
    };

    return ArchRegs;
})();