
module.exports = (function() {
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');

    function CodeGen(func, palette) {
        this.func = func;
        this.palette = palette;
        this.tabstop = 4;
        this.text = [];

        this.emit = function() {
            var func = this.func;

            this._emit_token(func.rtype);
            this._emit_whitespace(' ');
            this._emit_token(func.name);
            this._emit_whitespace(' ');
            this._emit_token('(');
            if (func.args.length == 0) {
                this._emit_token('void');
            } else {
                var a = func.args.pop();

                this._emit_token(a.type);
                this._emit_whitespace(' ');
                this._emit_token(a.name);

                func.args.forEach(function(a) {
                    this._emit_token(',');
                    this._emit_whitespace(' ');
                    this._emit_token(a.type);
                    this._emit_whitespace(' ');
                    this._emit_token(a.name);
                }, this);
            }
            this._emit_token(')');
            this._emit_whitespace('\n');
            this._emit_scope(func.container, 0);

            return this.text.join('');
        };

        this._pad = function(depth) {
            return ' '.repeat(this.tabstop).repeat(depth);
        };

        this._emit_whitespace = function(ws) {
            this.text.push(ws);
        };

        this._emit_token = function(token) {
            // TODO: color token according to palette
            this.text.push(token);
        };

        this._emit_expression = function(expr) {
            if (expr instanceof Expr.val) {
                // TODO: use a representation according to context (r2 flag, char, hex, dec, signed, -1)

            } else if (expr instanceof Expr.reg) {

            } else if (expr instanceof Expr.assign) {

            } else if (expr instanceof Expr.deref) {

            } else if (expr instanceof Expr.address_of) {

            } else if (expr instanceof Expr.not) {

            } else if (expr instanceof Expr.neg) {

            } else if (expr instanceof Expr.inc) {

            } else if (expr instanceof Expr.dec) {

            } else if (expr instanceof Expr.add) {

            } else if (expr instanceof Expr.sub) {

            } else if (expr instanceof Expr.mul) {

            } else if (expr instanceof Expr.div) {

            } else if (expr instanceof Expr.mod) {

            } else if (expr instanceof Expr.and) {

            } else if (expr instanceof Expr.or) {

            } else if (expr instanceof Expr.xor) {

            } else if (expr instanceof Expr.shl) {

            } else if (expr instanceof Expr.shr) {

            } else if (expr instanceof Expr.cmp_eq) {

            } else if (expr instanceof Expr.cmp_ne) {

            } else if (expr instanceof Expr.cmp_lt) {

            } else if (expr instanceof Expr.cmp_gt) {

            } else if (expr instanceof Expr.cmp_le) {

            } else if (expr instanceof Expr.cmp_ge) {

            } else if (expr instanceof Expr.fcall) {

            } else if (expr instanceof Expr.tcond) {

            } else if (expr instanceof Expr.bool_and) {

            } else if (expr instanceof Expr.bool_or) {

            } else if (expr instanceof Expr.bool_not) {

            }

            // hack! remove this
            this.text.push(expr.toString());
        };

        this._emit_statement = function(stmt, depth) {
            this._emit_whitespace(this._pad(depth));

            if (stmt instanceof Stmt.branch) {
                // ?
            } else if (stmt instanceof Stmt.break) {
                this._emit_token('break');
                this._emit_token(';');
            } else if (stmt instanceof Stmt.continue) {
                this._emit_token('continue');
                this._emit_token(';');
            } else if (stmt instanceof Stmt.do_while) {
                this._emit_token('do');

                this._emit_scope(stmt.loop_body, depth + 1);

                this._emit_token('while');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond_expr);
                this._emit_token(')');
            } else if (stmt instanceof Stmt.goto) {
                this._emit_token('goto');
                this._emit_whitespace(' ');
                this._emit_expression(stmt.dest);
                this._emit_token(';');
            } else if (stmt instanceof Stmt.if) {
                this._emit_token('if');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond_expr);
                this._emit_token(')');
                this._emit_whitespace('\n');

                this._emit_scope(stmt.then_cntr, depth + 1);

                if (stmt.else_cntr) {
                    this._emit_token('else');
                    this._emit_scope(stmt.else_cntr, depth + 1);
                }
            } else if (stmt instanceof Stmt.ret) {
                this._emit_token('return');

                if (stmt.value) {
                    this._emit_whitespace(' ');
                    this._emit_expression(stmt.value);
                }
                this._emit_token(';');

            } else if (stmt instanceof Stmt.while) {
                this._emit_token('while');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond_expr);
                this._emit_token(')');
                this._emit_whitespace('\n');

                this._emit_scope(stmt.loop_body, depth + 1);
            } else {
                this._emit_expression(stmt.expressions.pop());
                this._emit_token(';');
                stmt.expressions.forEach(function(expr) {
                    this._emit_whitespace('\n');
                    this._emit_expression(expr);
                    this._emit_token(';');
                }, this);
            }

            this._emit_whitespace('\n');
        };

        this._emit_scope = function(block, depth) {
            const p = this._pad(depth);

            this._emit_whitespace(p);
            this._emit_token('{');
            this._emit_whitespace('\n');

            block.statements.forEach(function(s) {
                this._emit_statement(s, depth + 1);
            }, this);

            this._emit_whitespace(p);
            this._emit_token('}');
            this._emit_whitespace('\n');
        };
    }

    return CodeGen;
})();