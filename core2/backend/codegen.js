
module.exports = (function() {
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');

    // coloring tokens enumeration
    const TOK_WHTSPCE =  0; // whitespace
    const TOK_KEYWORD =  1; // language keyword
    const TOK_PAREN   =  2; // parenthesis
    const TOK_PUNCT   =  3; // punctuation
    const TOK_ARITH   =  4; // arithmetic operator
    const TOK_BITWISE =  5; // bitwise operator
    const TOK_COMPARE =  6; // comparison operator
    const TOK_NUMBER  =  7; // number
    const TOK_STRING  =  8; // string
    const TOK_FNCALL  =  9; // function name [func call]
    const TOK_ASSIGN  = 10; // assignment operator
    const TOK_FNNAME  = 11; // function name [func prototype]
    const TOK_VARTYPE = 12; // data types
    const TOK_VARNAME = 13; // variable name
    const TOK_COMMENT = 14; // comment
    const TOK_OFFSET  = 15; // offset
    const TOK_INVALID = 16; // unknown

    /**
     * Coloring tokens to r2 theme colors mapping
     * @readonly
     */
    var COLORMAP = [
        '',                 // TOK_WHTSPCE
        'ret',              // TOK_KEYWORD
        '',                 // TOK_PAREN
        '',                 // TOK_PUNCT
        'math',             // TOK_ARITH
        'math',             // TOK_BITWISE
        'cmp',              // TOK_COMPARE
        'num',              // TOK_NUMBER
        'btext',            // TOK_STRING
        'call',             // TOK_FNCALL
        'mov',              // TOK_ASSIGN
        'fname',            // TOK_FNNAME
        'func_var_type',    // TOK_VARTYPE
        'reg',              // TOK_VARNAME
        'comment',          // TOK_COMMENT
        'offset',           // TOK_OFFSET
        'invalid'           // TOK_INVALID
    ];

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

        // init palette with reset formatting code
        var palette = { '': escape(0) };

        COLORMAP.forEach(function(key) {
            if (!(key in palette)) {
                palette[key] = escape(rgb_to_esccode(ecj[key]));
            }
        });

        return palette;
    };

    var parenthesize = function(s) {
        return Array.prototype.concat(
            [[TOK_PAREN, '(']],
            s,
            [[TOK_PAREN, ')']]
        );
    };

    var auto_paren = function(s) {
        var is_paren_token = function(e) {
            return (e instanceof Array) && (e.length === 2) && (e[0] === TOK_PAREN);
        };

        var complex = s.length > 1;
        var has_paren = is_paren_token(s[0]) && is_paren_token(s[s.length - 1]);

        return (complex && !has_paren) ? parenthesize(s) : s;
    };

    function CodeGen(ecj) {
        this.palette = load_palette(ecj);

        // TODO: these could be set through r2 variables
        this.tabstop = 4;
        this.scope_newline = true;
    }

    CodeGen.prototype.emit = function(tokens) {
        var colorized = tokens.map(function(pair) {
            var tok = pair[0]; // coloring token
            var txt = pair[1];  // text to color

            return this.palette[COLORMAP[tok]] + txt + this.palette[''];
        }, this);

        return colorized.join('');
    };

    CodeGen.prototype.pad = function(depth) {
        return ' '.repeat(this.tabstop).repeat(depth);
    };

    CodeGen.prototype.emit_expression = function(expr) {

        // emit a generic unary expression
        var _emit_uexpr = function(uexpr, op) {
            return Array.prototype.concat(
                [op],
                auto_paren(this.emit_expression(uexpr.operands[0]))
            );
        };

        // emit a generic binary expression
        var _emit_bexpr = function(bexpr, op) {
            return Array.prototype.concat(
                this.emit_expression(bexpr.operands[0]),
                [
                    [TOK_WHTSPCE, ' '],
                    op,
                    [TOK_WHTSPCE, ' ']
                ],
                this.emit_expression(bexpr.operands[1])
            );
        };

        // emit a generic ternary expression
        var _emit_texpr = function(texpr, op1, op2) {
            return Array.prototype.concat(
                this.emit_expression(texpr.operands[0]),
                [
                    [TOK_WHTSPCE, ' '],
                    op1,
                    [TOK_WHTSPCE, ' ']
                ],
                this.emit_expression(texpr.operands[1]),
                [
                    [TOK_WHTSPCE, ' '],
                    op2,
                    [TOK_WHTSPCE, ' ']
                ],
                this.emit_expression(texpr.operands[2])
            );
        };

        if (expr instanceof Expr.Val) {
            // TODO: emit value in the appropriate format: dec, hex, signed, unsigned, ...
            return [[TOK_NUMBER, expr.toString()]];
        }

        else if (expr instanceof Expr.Reg) {
            return [[TOK_VARNAME, expr.toString()]];
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
                            [[TOK_ARITH, rhand.operator.repeat(2)]]
                        );
                    }
                }

                // "x op= y"
                return Array.prototype.concat(
                    this.emit_expression(lhand),
                    [[TOK_WHTSPCE, ' '], [TOK_ASSIGN, rhand.operator + '='], [TOK_WHTSPCE, ' ']],
                    this.emit_expression(rhand.operands[1])
                );
            }

            // not a special case
            return _emit_bexpr.call(this, expr, [TOK_ASSIGN, '=']);
        }

        else if (expr instanceof Expr.Deref) {
            return [[TOK_PUNCT, expr.toString()]];
            // return _emit_uexpr.call(this, expr, [TOK_PUNCT, '*']);
        }

        else if (expr instanceof Expr.AddrOf) {
            return _emit_uexpr.call(this, expr, [TOK_PUNCT, '&']);
        }

        else if (expr instanceof Expr.Not) {
            return _emit_uexpr.call(this, expr, [TOK_BITWISE, '~']);
        }

        else if (expr instanceof Expr.Neg) {
            return _emit_uexpr.call(this, expr, [TOK_BITWISE, '-']);
        }

        else if (expr instanceof Expr.Add) {
            return _emit_bexpr.call(this, expr, [TOK_ARITH, '+']);
        }

        else if (expr instanceof Expr.Sub) {
            return _emit_bexpr.call(this, expr, [TOK_ARITH, '-']);
        }

        else if (expr instanceof Expr.Mul) {
            return _emit_bexpr.call(this, expr, [TOK_ARITH, '*']);
        }

        else if (expr instanceof Expr.Div) {
            return _emit_bexpr.call(this, expr, [TOK_ARITH, '/']);
        }

        else if (expr instanceof Expr.Mod) {
            return _emit_bexpr.call(this, expr, [TOK_ARITH, '%']);
        }

        else if (expr instanceof Expr.And) {
            return _emit_bexpr.call(this, expr, [TOK_BITWISE, '&']);
        }

        else if (expr instanceof Expr.Or) {
            return _emit_bexpr.call(this, expr, [TOK_BITWISE, '|']);
        }

        else if (expr instanceof Expr.Xor) {
            return _emit_bexpr.call(this, expr, [TOK_BITWISE, '^']);
        }

        else if (expr instanceof Expr.Shl) {
            return _emit_bexpr.call(this, expr, [TOK_BITWISE, '<<']);
        }

        else if (expr instanceof Expr.Shr) {
            return _emit_bexpr.call(this, expr, [TOK_BITWISE, '>>']);
        }

        else if (expr instanceof Expr.EQ) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '==']);
        }

        else if (expr instanceof Expr.NE) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '!=']);
        }

        else if (expr instanceof Expr.LT) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '<']);
        }

        else if (expr instanceof Expr.GT) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '>']);
        }

        else if (expr instanceof Expr.LE) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '<=']);
        }

        else if (expr instanceof Expr.GE) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '>=']);
        }

        else if (expr instanceof Expr.Call) {
            var args = expr.operands.slice(0);
            var fname = args.shift(); // was: expr.operator

            return Array.prototype.concat(
                [[TOK_FNCALL, fname.toString()], [TOK_PAREN, '(']],
                Array.prototype.concat.apply([],
                    args.map(function(a) {
                        return Array.prototype.concat(this.emit_expression(a), [[TOK_PUNCT, ','], [TOK_WHTSPCE, ' ']]);
                    }, this)
                ).slice(0, -2),
                [[TOK_PAREN, ')']]
            );
        }

        else if (expr instanceof Expr.TCond) {
            return _emit_texpr.call(this, expr, [TOK_PUNCT, '?'], [TOK_PUNCT, ':']);
        }

        else if (expr instanceof Expr.BoolAnd) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '&&']);
        }

        else if (expr instanceof Expr.BoolOr) {
            return _emit_bexpr.call(this, expr, [TOK_COMPARE, '||']);
        }

        else if (expr instanceof Expr.BoolNot) {
            return _emit_uexpr.call(this, expr, [TOK_COMPARE, '!']);
        }

        return [[TOK_INVALID, expr.toString()]];
    };

    /**
     * Emit a statement with the appropriate indentation.
     * @param {!Stmt.Statement} stmt  Statement object to emit
     * @param {number} depth Nesting level
     */
    CodeGen.prototype.emit_statement = function(stmt, depth) {
        const p = this.pad(depth);
        var tokens = [];

        tokens.push([TOK_WHTSPCE, p]);

        // <DEBUG>
        tokens.push([TOK_OFFSET, '0x' + stmt.addr.toString(16)]);
        tokens.push([TOK_WHTSPCE, ' '.repeat(this.tabstop)]);
        // </DEBUG>

        if (stmt instanceof Stmt.Branch) {
            // TODO: a Branch is meant to be replaced by an 'If'; it is here only for dev purpose
            tokens.push([TOK_KEYWORD, 'branch']);
            tokens.push([TOK_WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_PUNCT, '?']);
            tokens.push([TOK_WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.taken));
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_PUNCT, ':']);
            tokens.push([TOK_WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.not_taken));
            tokens.push([TOK_PUNCT, ';']);
        } else if (stmt instanceof Stmt.Break) {
            tokens.push([TOK_KEYWORD, 'break']);
            tokens.push([TOK_PUNCT, ';']);
        } else if (stmt instanceof Stmt.Continue) {
            tokens.push([TOK_KEYWORD, 'continue']);
            tokens.push([TOK_PUNCT, ';']);
        } else if (stmt instanceof Stmt.DoWhile) {
            tokens.push([TOK_KEYWORD, 'do']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
            tokens.push([TOK_KEYWORD, 'while']);
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK_PAREN, ')']);
        } else if (stmt instanceof Stmt.Goto) {
            tokens.push([TOK_KEYWORD, 'goto']);
            tokens.push([TOK_WHTSPCE, ' ']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.dest));
            tokens.push([TOK_PUNCT, ';']);
        } else if (stmt instanceof Stmt.If) {
            tokens.push([TOK_KEYWORD, 'if']);
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK_PAREN, ')']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.then_cntr, depth));

            if (stmt.else_cntr) {
                if (this.scope_newline) {
                    tokens.push([TOK_WHTSPCE, '\n']);
                }

                tokens.push([TOK_WHTSPCE, p]);
                tokens.push([TOK_KEYWORD, 'else']);
                Array.prototype.push.apply(tokens, this.emit_scope(stmt.else_cntr, depth));
            }
        } else if (stmt instanceof Stmt.Return) {
            tokens.push([TOK_KEYWORD, 'return']);

            if (stmt.retval) {
                tokens.push([TOK_WHTSPCE, ' ']);
                Array.prototype.push.apply(tokens, this.emit_expression(stmt.retval));
            }
            tokens.push([TOK_PUNCT, ';']);

        } else if (stmt instanceof Stmt.While) {
            tokens.push([TOK_KEYWORD, 'while']);
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_PAREN, '(']);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            tokens.push([TOK_PAREN, ')']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
        } else {
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.expressions.pop()));
            tokens.push([TOK_PUNCT, ';']);

            stmt.expressions.forEach(function(expr) {
                tokens.push([TOK_WHTSPCE, '\n']);
                Array.prototype.push.apply(tokens, this.emit_expression(expr));
                tokens.push([TOK_PUNCT, ';']);
            }, this);
        }

        tokens.push([TOK_WHTSPCE, '\n']);

        return tokens;
    };

    /**
     * Emit a lexical scope with the appropriate indentation.
     * @param {!Stmt.Container} cntr  Container object to emit
     * @param {number} depth Nesting level
     */
    CodeGen.prototype.emit_scope = function(cntr, depth) {
        const p = this.pad(depth);
        var newline = this.scope_newline ? [] : [[TOK_WHTSPCE, '\n']];

        var opening = [
            [TOK_WHTSPCE, p],
            [TOK_PAREN, '{'],
            [TOK_WHTSPCE, '\n']
        ];

        var content = Array.prototype.concat.apply([], cntr.statements.map(function(s) {
            return this.emit_statement(s, depth + 1);
        }, this));

        var closing = [
            [TOK_WHTSPCE, p],
            [TOK_PAREN, '}'],
            [TOK_WHTSPCE, '\n']
        ];

        return Array.prototype.concat(newline, opening, content, closing);
    };

    CodeGen.prototype.emit_func = function(func) {
        var tokens = [];

        tokens.push([TOK_VARTYPE, func.rettype]);
        tokens.push([TOK_WHTSPCE, ' ']);
        tokens.push([TOK_FNNAME, func.name]);
        tokens.push([TOK_WHTSPCE, ' ']);

        tokens.push([TOK_PAREN, '(']);
        if (func.args.length === 0) {
            tokens.push([TOK_VARTYPE, 'void']);
        } else {
            var a = func.args[0];

            // handle first arg
            tokens.push([TOK_VARTYPE, a.type]);
            tokens.push([TOK_WHTSPCE, ' ']);
            tokens.push([TOK_VARNAME, a.name]);

            // handle rest of the args
            func.args.slice(1).forEach(function(a) {
                tokens.push([TOK_PUNCT, ',']);
                tokens.push([TOK_WHTSPCE, ' ']);
                tokens.push([TOK_VARTYPE, a.type]);
                tokens.push([TOK_WHTSPCE, ' ']);
                tokens.push([TOK_VARNAME, a.name]);
            });
        }
        tokens.push([TOK_PAREN, ')']);

        // TODO: this should work after ControlFlow is implemented:
        // Array.prototype.push.apply(tokens, this.emit_scope(func.entry_block.container, 0));

        // in the meantime, just emit all scopes in a consequtive order
        // <WORKAROUND>
        func.basic_blocks.forEach(function(bb) {
            Array.prototype.push.apply(tokens, this.emit_scope(bb.container, 0));
        }, this);
        // </WORKAROUND>

        return this.emit(tokens);
    };

    return CodeGen;
})();