
module.exports = (function() {
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

    const IDX_REG64 = 0;
    const IDX_REG32 = 1;
    const IDX_REG16 = 2;
    const IDX_REG8L = 3;
    const IDX_REG8H = 4;

    var find_overlaps = function(reg) {
        return regs.find(function(ovl_list) {
            return (ovl_list.indexOf(reg.name) !== (-1));
        });
    };

    // TODO: omit REG64 if arch.bits is not 64

    var set64 = function(reg64, ovl) {
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg32, new Expr.And(reg64.clone(), new Expr.Val(0xffffffff, 64))),
            new Expr.Assign(reg16, new Expr.And(reg64.clone(), new Expr.Val(0x0000ffff, 64))),
            new Expr.Assign(reg8l, new Expr.And(reg64.clone(), new Expr.Val(0x000000ff, 64))),
        ];

        // TODO: may be redundant as 8h is not accessible on x64
        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg64.clone(), new Expr.Val(0x0000ff00, 64)), new Expr.Val(8, 64))));
        }

        return gen;
    };

    var set32 = function(reg32, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg64, new Expr.And(reg32.clone(), new Expr.Val(0xffffffff, 32))),
            new Expr.Assign(reg16, new Expr.And(reg32.clone(), new Expr.Val(0x0000ffff, 32))),
            new Expr.Assign(reg8l, new Expr.And(reg32.clone(), new Expr.Val(0x000000ff, 32))),
        ];

        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg32.clone(), new Expr.Val(0x0000ff00, 32)), new Expr.Val(8, 32))));
        }

        return gen;
    };

    var set16 = function(reg16, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg8l = new Expr.Reg(ovl[IDX_REG8L],  8);

        var gen = [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(0xffffffffffff0000, 64)), reg16.clone())),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(0xffff0000, 32)), reg16.clone())),
            new Expr.Assign(reg8l, new Expr.And(reg16.clone(), new Expr.Val(0x00ff, 16))),
        ];

        if (IDX_REG8H in ovl) {
            var reg8h = new Expr.Reg(ovl[IDX_REG8H], 8);

            gen.push(new Expr.Assign(reg8h, new Expr.Shr(new Expr.And(reg16.clone(), new Expr.Val(0xff00, 16)), new Expr.Val(8, 16))));
        }

        return gen;
    };

    var set8l = function(reg8l, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(0xffffffffffffff00, 64)), reg8l.clone())),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(0xffffff00, 32)), reg8l.clone())),
            new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(0xff00, 16)), reg8l.clone()))
        ];
    };

    var set8h = function(reg8h, ovl) {
        var reg64 = new Expr.Reg(ovl[IDX_REG64], 64);
        var reg32 = new Expr.Reg(ovl[IDX_REG32], 32);
        var reg16 = new Expr.Reg(ovl[IDX_REG16], 16);

        return [
            new Expr.Assign(reg64, new Expr.Or(new Expr.And(reg64.clone(), new Expr.Val(0xffffffffffff00ff, 64))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 64))),
            new Expr.Assign(reg32, new Expr.Or(new Expr.And(reg32.clone(), new Expr.Val(0xffff00ff, 32))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 32))),
            new Expr.Assign(reg16, new Expr.Or(new Expr.And(reg16.clone(), new Expr.Val(0x00ff, 16))), new Expr.Shl(reg8h.clone(), new Expr.Val(8, 16)))
        ];
    };

    return {
        gen_overlaps: function(reg) {
            var ovl = find_overlaps(reg);

            if (ovl) {
                const handler = [set64, set32, set16, set8l, set8h];

                var addr = reg.parent_stmt().addr;
                var idx = ovl.indexOf(reg.name);
                var stmts = handler[idx](reg, ovl);

                return stmts.map(function(s) {
                    return Stmt.make_statement(addr, s);
                });
            }

            return [];
        }
    };
})();