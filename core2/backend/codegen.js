
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

            this._emit_token(func.rettype);
            this._emit_whitespace(' ');
            this._emit_token(func.name);
            this._emit_whitespace(' ');
            this._emit_token('(');

            if (func.args.length == 0) {
                this._emit_token('void');
            } else {
                var a = func.args[0];

                // handle first arg
                this._emit_token(a.type);
                this._emit_whitespace(' ');
                this._emit_token(a.name);

                // handle rest of the args
                func.args.slice(1).forEach(function(a) {
                    this._emit_token(',');
                    this._emit_whitespace(' ');
                    this._emit_token(a.type);
                    this._emit_whitespace(' ');
                    this._emit_token(a.name);
                }, this);
            }
            this._emit_token(')');
            this._emit_whitespace('\n');

            // var block = func.entry_block;
            // while (block) {
            //     this._emit_scope(block, 0);
            //
            //     block = this.func.blocks[block.container.next];
            // }
            //
            // TODO: temp
            func.basic_blocks.forEach(function(bb) {
                this._emit_scope(bb.container, 0);
            }, this);

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
            if (expr instanceof Expr.Val) {
                // TODO: use a representation according to context (r2 flag, char, hex, dec, signed, -1)

            } else if (expr instanceof Expr.Reg) {

            } else if (expr instanceof Expr.Assign) {

            } else if (expr instanceof Expr.Deref) {

            } else if (expr instanceof Expr.AddrOf) {

            } else if (expr instanceof Expr.Not) {

            } else if (expr instanceof Expr.Neg) {

            } else if (expr instanceof Expr.Add) {

            } else if (expr instanceof Expr.Sub) {

            } else if (expr instanceof Expr.Mul) {

            } else if (expr instanceof Expr.Div) {

            } else if (expr instanceof Expr.Mod) {

            } else if (expr instanceof Expr.And) {

            } else if (expr instanceof Expr.Or) {

            } else if (expr instanceof Expr.Xor) {

            } else if (expr instanceof Expr.Shl) {

            } else if (expr instanceof Expr.Shr) {

            } else if (expr instanceof Expr.EQ) {

            } else if (expr instanceof Expr.NE) {

            } else if (expr instanceof Expr.LT) {

            } else if (expr instanceof Expr.GT) {

            } else if (expr instanceof Expr.LE) {

            } else if (expr instanceof Expr.GE) {

            } else if (expr instanceof Expr.Call) {

            } else if (expr instanceof Expr.TCond) {

            } else if (expr instanceof Expr.BoolAnd) {

            } else if (expr instanceof Expr.BoolOr) {

            } else if (expr instanceof Expr.BoolNot) {

            }

            // ... TODO: lazy implementation; remove this
            this.text.push(expr.toString());
        };

        this._emit_statement = function(stmt, depth) {
            var p = this._pad(depth);
            this._emit_whitespace(p);

            // TODO: for debug purposes; remove this
            this._emit_token('0x' + stmt.addr.toString(16) + ' : ');

            if (stmt instanceof Stmt.Branch) {
                // TODO: a Branch is meant to be replaced by an 'If'; it is here only for dev purpose
                this._emit_token(stmt);
            } else if (stmt instanceof Stmt.Break) {
                this._emit_token('break');
                this._emit_token(';');
            } else if (stmt instanceof Stmt.Continue) {
                this._emit_token('continue');
                this._emit_token(';');
            } else if (stmt instanceof Stmt.DoWhile) {
                this._emit_token('do');

                this._emit_scope(stmt.body, depth);

                this._emit_token('while');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond);
                this._emit_token(')');
            } else if (stmt instanceof Stmt.Goto) {
                this._emit_token('goto');
                this._emit_whitespace(' ');
                this._emit_expression(stmt.dest);
                this._emit_token(';');
            } else if (stmt instanceof Stmt.If) {
                this._emit_token('if');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond);
                this._emit_token(')');
                this._emit_whitespace('\n');

                this._emit_scope(stmt.then_cntr, depth);

                if (stmt.else_cntr) {
                    this._emit_whitespace(p);
                    this._emit_token('else');
                    this._emit_whitespace('\n');
                    this._emit_scope(stmt.else_cntr, depth);
                }
            } else if (stmt instanceof Stmt.Return) {
                this._emit_token('return');

                if (stmt.retval) {
                    this._emit_whitespace(' ');
                    this._emit_expression(stmt.retval);
                }
                this._emit_token(';');

            } else if (stmt instanceof Stmt.While) {
                this._emit_token('while');
                this._emit_whitespace(' ');
                this._emit_token('(');
                this._emit_expression(stmt.cond);
                this._emit_token(')');
                this._emit_whitespace('\n');

                this._emit_scope(stmt.body, depth);
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

        this._emit_scope = function(cntr, depth) {
            const p = this._pad(depth);

            this._emit_whitespace(p);
            this._emit_token('{');
            this._emit_whitespace('\n');

            cntr.statements.forEach(function(s) {
                this._emit_statement(s, depth + 1);
            }, this);

            this._emit_whitespace(p);
            this._emit_token('}');
            this._emit_whitespace('\n');
        };
    }

    return CodeGen;
})();