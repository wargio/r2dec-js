module.exports = (function() {

    var Expr = require('libdec/core/ir/expressions');

    var add_sub = function(expr) {
        // TODO: implement this one
        return null;
    };

    var ref_deref = function(expr) {
        // (& (* addr)) yields addr
        if ((expr instanceof Expr.address_of) && (expr.operands[0] instanceof Expr.deref)) {
            return expr.operands[0].operands[0];
        }

        // (* (& addr)) yields addr
        if ((expr instanceof Expr.deref) && (expr.operands[0] instanceof Expr.address_of)) {
            return expr.operands[0].operands[0];
        }

        return null;
    };

    var correct_signs = function(expr) {
        // (+ x -y) becomes (- x y)
        if ((expr instanceof Expr.add) && (expr.operands[1] instanceof Expr.val) && (expr.operands[1].value < 0)) {
            return new Expr.sub(expr.operands[0], new Expr.val(Math.abs(expr.operands[1])));
        }

        // (- x -y) becomes (+ x y)
        if ((expr instanceof Expr.sub) && (expr.operands[1] instanceof Expr.val) && (expr.operands[1].value < 0)) {
            return new Expr.add(expr.operands[0], new Expr.val(Math.abs(expr.operands[1])));
        }

        return null;
    };

    var special_xor = function(expr) {
        // (^ e e) yields 0
        if (expr instanceof Expr.xor && expr.operands[0].equals(expr.operands[1])) {
            return new Expr.val(0, expr.operands[0].size);
        }

        return null;
    };

    var special_and = function(expr) {
        if (expr instanceof Expr.and) {
            // (& e 0) yields 0
            if ((expr.operands[1] instanceof Expr.val) && (expr.operands[1].value === 0)) {
                return expr.operands[1];
            }

            // (& e e) yields e
            if (expr.operands[0].equals(expr.operands[1])) {
                return expr.operands[0];
            }
        }

        return null;
    };

    var filters = [
        add_sub,
        ref_deref,
        correct_signs,
        special_xor,
        special_and
    ];

    var once = function(expr) {
        for (var i = 0; i < filters.length; i++) {
            var new_expr = filters[i](expr);

            if (new_expr) {
                return new_expr;
            }
        }

        return null;
    };

    var run = function(stmnt) {
        var modified = true;

        while (modified)
        {
            modified = false;

            stmnt.expressions.forEach(function(expr) {
                expr.iter_operands().forEach(function(op) {
                    var new_expr = once(op);

                    if (new_expr) {
                        console.log(op.toString(), '->', new_expr.toString());
                        op.overwrite(new_expr);

                        modified = true;
                    }
                });
            });
        }
    };

    return {
        once: once,
        run: run
    };
})();