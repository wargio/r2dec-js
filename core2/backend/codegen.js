
module.exports = (function() {
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');

    var load_palette = function(ecj) {
        var escape = function(tok) {
            return '\033[' + tok + 'm';
        };

        var rgb_to_esccode = function(rgb) {
            var r = rgb[0];
            var g = rgb[1];
            var b = rgb[2];

            return ['38', '2', r, g, b].join(';');
        };

        // color keys we want to extract from 'ecj' output
        var keys = [
            'comment',
            'call',
            'ret',
            'reg',
            'num',
            'math',
            'mov',
            'fname',
            'cmp',
            'btext',
            'func_var_type',
            'offset',
            'invalid'
        ];

        var palette = { '': escape(0) };

        keys.forEach(function(k) {
            palette[k] = escape(rgb_to_esccode(ecj[k]));
        });

        return palette;
    };

    var parenthesize = function(s) {
        return Array.prototype.concat(
            [[TOK.PAREN, '(']],
            s,
            [[TOK.PAREN, ')']]
        );
    };

    var auto_paren = function(s) {
        var is_paren_token = function(e) {
            return (e instanceof Array) && (e.length === 2) && (e[0] === TOK.PAREN);
        };

        var complex = s.length > 1;
        var has_paren = is_paren_token(s[0]) && is_paren_token(s[s.length - 1]);

        return (complex && !has_paren) ? parenthesize(s) : s;
    };

    function CodeGen(ecj) {
        this.palette = load_palette(ecj);
        this.tabstop = 4;
        this.scope_newline = true;
    }

    /**
     * Tokens to r2 theme colors mapping
     * @readonly
     */
    const TOK = {
        WHTSPCE : '',               // whitespace
        KEYWORD : 'ret',            // c language keyword
        PAREN   : '',               // parenthesis
        PUNCT   : '',               // punctuation
        ARITH   : 'math',           // arithmetic operator
        BITWISE : 'math',           // bitwise operator
        COMPARE : 'cmp',            // comparison operator
        NUMBER  : 'num',            // number
        STRING  : 'btext',          // string
        FNCALL  : 'call',           // function call
        ASSIGN  : 'mov',            // assignment
        FNNAME  : 'fname',          // function name
        VARTYPE : 'func_var_type',  // data types
        VARNAME : 'reg',            // variable
        COMMENT : 'comment',        // comment
        OFFSET  : 'offset',         // offset
        INVALID : 'invalid'         // ?
    };

    CodeGen.prototype.colorize = function(t, s) {
        return this.palette[t] + s + this.palette[''];
    };

    CodeGen.prototype.emit = function(tokens) {
        var colorized = tokens.map(function(tok) {
            var t = tok[0];
            var s = tok[1];

            return this.colorize(t, s);
        }, this);

        return colorized.join('');
    };

    CodeGen.prototype.pad = function(depth) {
        return ' '.repeat(this.tabstop).repeat(depth);
    };

    CodeGen.prototype.emit_expression = function(expr) {

        var _emit_uexpr = function(uexpr, op) {
            return Array.prototype.concat(
                [op],
                auto_paren(this.emit_expression(uexpr.operands[0]))
            );
        };

        var _emit_bexpr = function(bexpr, op) {
            return Array.prototype.concat(
                this.emit_expression(bexpr.operands[0]),
                [
                    [TOK.WHTSPCE, ' '],
                    op,
                    [TOK.WHTSPCE, ' ']
                ],
                this.emit_expression(bexpr.operands[1])
            );
        };

        var _emit_texpr = function(texpr, op1, op2) {
            return Array.prototype.concat(
                this.emit_expression(texpr.operands[0]),
                [
                    [TOK.WHTSPCE, ' '],
                    op1,
                    [TOK.WHTSPCE, ' ']
                ],
                this.emit_expression(texpr.operands[1]),
                [
                    [TOK.WHTSPCE, ' '],
                    op2,
                    [TOK.WHTSPCE, ' ']
                ],
                this.emit_expression(texpr.operands[2])
            );
        };

        if (expr instanceof Expr.Val) {
            return [[TOK.NUMBER, expr.toString()]];
        }

        else if (expr instanceof Expr.Reg) {
            return [[TOK.VARNAME, expr./*name.*/toString()]];
        }

        else if (expr instanceof Expr.Assign) {
            var lhand = expr.operands[0];
            var rhand = expr.operands[1];

            // there are three special cases where assignments should be displayed diffreently:
            //  x = x op y  -> x op= y
            //  x = x + 1   -> x++
            //  x = x - 1   -> x--

            // "x = x op y"
            if ((rhand instanceof Expr.BExpr) && (lhand.equals(rhand.operands[0]))) {
                // "x = x op 1"
                if (rhand.operands[1].equals(new Expr.Value(1, lhand.size))) {
                    // x = x +/- 1
                    if ((rhand instanceof Expr.Add) || (rhand instanceof Expr.Sub)) {
                        // x++ / x--
                        return Array.prototype.concat(
                            this.emit_expression(lhand),
                            [[TOK.ARITH, rhand.operator.repeat(2)]]
                        );
                    }
                }

                // "x op= y"
                return Array.prototype.concat(
                    this.emit_expression(lhand),
                    [
                        [TOK.WHTSPCE, ' '],
                        [TOK.ARITH, rhand.operator + '='],
                        [TOK.WHTSPCE, ' ']
                    ],
                    this.emit_expression(rhand.operands[1])
                );
            }

            // not a special case
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '=']);
        }

        else if (expr instanceof Expr.Deref) {
            return _emit_uexpr.call(this, expr, [TOK.PUNCT, '*']);
        }

        else if (expr instanceof Expr.AddrOf) {
            return _emit_uexpr.call(this, expr, [TOK.PUNCT, '&']);
        }

        else if (expr instanceof Expr.Not) {
            return _emit_uexpr.call(this, expr, [TOK.BITWISE, '~']);
        }

        else if (expr instanceof Expr.Neg) {
            return _emit_uexpr.call(this, expr, [TOK.ARITH, '-']);
        }

        else if (expr instanceof Expr.Add) {
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '+']);
        }

        else if (expr instanceof Expr.Sub) {
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '-']);
        }

        else if (expr instanceof Expr.Mul) {
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '*']);
        }

        else if (expr instanceof Expr.Div) {
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '/']);
        }

        else if (expr instanceof Expr.Mod) {
            return _emit_bexpr.call(this, expr, [TOK.ARITH, '%']);
        }

        else if (expr instanceof Expr.And) {
            return _emit_bexpr.call(this, expr, [TOK.BITWISE, '&']);
        }

        else if (expr instanceof Expr.Or) {
            return _emit_bexpr.call(this, expr, [TOK.BITWISE, '|']);
        }

        else if (expr instanceof Expr.Xor) {
            return _emit_bexpr.call(this, expr, [TOK.BITWISE, '^']);
        }

        else if (expr instanceof Expr.Shl) {
            return _emit_bexpr.call(this, expr, [TOK.BITWISE, '<<']);
        }

        else if (expr instanceof Expr.Shr) {
            return _emit_bexpr.call(this, expr, [TOK.BITWISE, '>>']);
        }

        else if (expr instanceof Expr.EQ) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '==']);
        }

        else if (expr instanceof Expr.NE) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '!=']);
        }

        else if (expr instanceof Expr.LT) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '<']);
        }

        else if (expr instanceof Expr.GT) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '>']);
        }

        else if (expr instanceof Expr.LE) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '<=']);
        }

        else if (expr instanceof Expr.GE) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '>=']);
        }

        else if (expr instanceof Expr.Call) {
            var first = [];
            var rest = [];

            if (expr.operands.length > 1) {
                first = [this.emit_expression(expr.operands[1])];

                rest = expr.operands.slice(2).map(function(a) {
                    return Array.prototype.concat(
                        [
                            [TOK.PUNCT, ','],
                            [TOK.WHTSPCE, ' ']
                        ],
                        this.emit_expression(a)
                    );
                }, this);
            }

            return Array.prototype.concat(
                [
                    [TOK.FNCALL, expr.operator],
                    [TOK.PAREN, '(']
                ],
                first,
                rest,
                [[TOK.PAREN, ')']]
            );
        }

        else if (expr instanceof Expr.TCond) {
            return _emit_texpr.call(this, expr, [TOK.PUNCT, '?'], [TOK.PUNCT, ':']);
        }

        else if (expr instanceof Expr.BoolAnd) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '&&']);
        }

        else if (expr instanceof Expr.BoolOr) {
            return _emit_bexpr.call(this, expr, [TOK.COMPARE, '||']);
        }

        else if (expr instanceof Expr.BoolNot) {
            return _emit_uexpr.call(this, expr, [TOK.COMPARE, '!']);
        }

        return [[TOK.INVALID, expr.toString()]];
    };

    /**
     * Emit a statement with the appropriate indentation.
     * @param {!Stmt.Statement} stmt  Statement object to emit
     * @param {number} depth Nesting level
     */
    CodeGen.prototype.emit_statement = function(stmt, depth) {
        const p = this.pad(depth);
        var tokens = [];

        tokens.push([TOK.WHTSPCE, p]);

        // <DEBUG>
        tokens.push([TOK.OFFSET, '0x' + stmt.addr.toString(16)]);
        tokens.push([TOK.WHTSPCE, ' '.repeat(this.tabstop)]);
        // </DEBUG>

        if (stmt instanceof Stmt.Branch) {
            // TODO: a Branch is meant to be replaced by an 'If'; it is here only for dev purpose
            tokens.push([TOK.KEYWORD, 'branch']);
            tokens.push([TOK.WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.PUNCT, '?']);
            tokens.push([TOK.WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.taken));
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.PUNCT, ':']);
            tokens.push([TOK.WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.not_taken));
            tokens.push([TOK.PUNCT, ';']);
        } else if (stmt instanceof Stmt.Break) {
            tokens.push([TOK.KEYWORD, 'break']);
            tokens.push([TOK.PUNCT, ';']);
        } else if (stmt instanceof Stmt.Continue) {
            tokens.push([TOK.KEYWORD, 'continue']);
            tokens.push([TOK.PUNCT, ';']);
        } else if (stmt instanceof Stmt.DoWhile) {
            tokens.push([TOK.KEYWORD, 'do']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
            tokens.push([TOK.KEYWORD, 'while']);
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK.PAREN, ')']);
        } else if (stmt instanceof Stmt.Goto) {
            tokens.push([TOK.KEYWORD, 'goto']);
            tokens.push([TOK.WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.dest));
            tokens.push([TOK.PUNCT, ';']);
        } else if (stmt instanceof Stmt.If) {
            tokens.push([TOK.KEYWORD, 'if']);
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK.PAREN, ')']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.then_cntr, depth));

            if (stmt.else_cntr) {
                if (this.scope_newline) {
                    tokens.push([TOK.WHTSPCE, '\n']);
                }

                tokens.push([TOK.WHTSPCE, p]);
                tokens.push([TOK.KEYWORD, 'else']);
                Array.prototype.push.apply(tokens, this.emit_scope(stmt.else_cntr, depth));
            }
        } else if (stmt instanceof Stmt.Return) {
            tokens.push([TOK.KEYWORD, 'return']);

            if (stmt.retval) {
                tokens.push([TOK.WHTSPCE, ' ']);
                Array.prototype.push.apply(tokens, this.emit_expression(stmt.retval));
            }
            tokens.push([TOK.PUNCT, ';']);

        } else if (stmt instanceof Stmt.While) {
            tokens.push([TOK.KEYWORD, 'while']);
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK.PAREN, ')']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
        } else {
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.expressions.pop()));
            tokens.push([TOK.PUNCT, ';']);

            stmt.expressions.forEach(function(expr) {
                tokens.push([TOK.WHTSPCE, '\n']);
                Array.prototype.push.apply(tokens, this.emit_expression(expr));
                tokens.push([TOK.PUNCT, ';']);
            }, this);
        }

        tokens.push([TOK.WHTSPCE, '\n']);

        return tokens;
    };

    /**
     * Emit a lexical scope with the appropriate indentation.
     * @param {!Stmt.Container} cntr  Container object to emit
     * @param {number} depth Nesting level
     */
    CodeGen.prototype.emit_scope = function(cntr, depth) {
        const p = this.pad(depth);
        var tokens = [];

        if (this.scope_newline) {
            tokens.push([TOK.WHTSPCE, '\n']);
        }

        tokens.push([TOK.WHTSPCE, p]);
        tokens.push([TOK.PAREN, '{']);
        tokens.push([TOK.WHTSPCE, '\n']);

        cntr.statements.forEach(function(s) {
            Array.prototype.push.apply(tokens, this.emit_statement(s, depth + 1));
        }, this);

        tokens.push([TOK.WHTSPCE, p]);
        tokens.push([TOK.PAREN, '}']);
        tokens.push([TOK.WHTSPCE, '\n']);

        return tokens;
    };

    CodeGen.prototype.emit_func = function(func) {
        var tokens = [];

        tokens.push([TOK.VARTYPE, func.rettype]);
        tokens.push([TOK.WHTSPCE, ' ']);
        tokens.push([TOK.FNNAME, func.name]);
        tokens.push([TOK.WHTSPCE, ' ']);

        tokens.push([TOK.PAREN, '(']);
        if (func.args.length === 0) {
            tokens.push([TOK.VARTYPE, 'void']);
        } else {
            var a = func.args[0];

            // handle first arg
            tokens.push([TOK.VARTYPE, a.type]);
            tokens.push([TOK.WHTSPCE, ' ']);
            tokens.push([TOK.VARNAME, a.name]);

            // handle rest of the args
            func.args.slice(1).forEach(function(a) {
                tokens.push([TOK.PUNCT, ',']);
                tokens.push([TOK.WHTSPCE, ' ']);
                tokens.push([TOK.VARTYPE, a.type]);
                tokens.push([TOK.WHTSPCE, ' ']);
                tokens.push([TOK.VARNAME, a.name]);
            });
        }
        tokens.push([TOK.PAREN, ')']);

        // TODO: this should work after ControlFlow is implemented
        // Array.prototype.push.apply(tokens, this.emit_scope(func.entry_block.container, 0));

        // <WORKAROUND>
        func.basic_blocks.forEach(function(bb) {
            Array.prototype.push.apply(tokens, this.emit_scope(bb.container, 0));
        }, this);
        // </WORKAROUND>

        return this.emit(tokens);
    };

    return CodeGen;
})();