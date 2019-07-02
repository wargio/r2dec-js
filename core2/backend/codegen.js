
module.exports = (function() {
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');

    // coloring tokens enumeration
    const TOK_RESET   =  0; // color reset
    const TOK_WHTSPCE =  1; // whitespace
    const TOK_KEYWORD =  2; // language keyword
    const TOK_PAREN   =  3; // parenthesis
    const TOK_PUNCT   =  4; // punctuation
    const TOK_ARITH   =  5; // arithmetic operator
    const TOK_BITWISE =  6; // bitwise operator
    const TOK_COMPARE =  7; // comparison operator
    const TOK_NUMBER  =  8; // number literal
    const TOK_STRING  =  9; // string literal
    const TOK_FNCALL  = 10; // function name [func call]
    const TOK_ASSIGN  = 11; // assignment operator
    const TOK_FNNAME  = 12; // function name [func prototype]
    const TOK_VARTYPE = 13; // data type
    const TOK_VARNAME = 14; // variable name
    const TOK_COMMENT = 15; // comment
    const TOK_OFFSET  = 16; // offset
    const TOK_INVALID = 17; // unknown

    var _wrap = function(esccode) {
        return '\033[' + esccode + 'm';
    };

    var _rgb_to_esccode = function(rgb) {
        if (!rgb) {
            return '';
        }

        var r = rgb[0];
        var g = rgb[1];
        var b = rgb[2];

        return ['38', '2', r, g, b].join(';');
    };

    function Palette(colormap) {
        colormap[TOK_RESET] = _wrap('0');

        this.colormap = colormap;
    }

    Palette.prototype.colorize = function(token) {
        var tag = token[0];  // coloring tag
        var txt = token[1];  // text to color

        return this.colormap[tag] + txt + this.colormap[TOK_RESET];
    };

    function ThemePalette(ecj) {
        // map TOK indices to r2 theme color keys and then turn them
        // into their corresponding rgb entries

        var colormap = [
            null,               // TOK_RESET -- placeholder
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
        ].map(function(key) { return _wrap(_rgb_to_esccode(ecj[key])); });

        Palette.call(this, colormap);
    }

    ThemePalette.prototype = Object.create(Palette.prototype);
    ThemePalette.prototype.constructor = ThemePalette;

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

    function CodeGen(ecj, resolver, conf) {
        this.palette = new ThemePalette(ecj);
        this.xrefs = resolver;

        this.tabstop = conf.tabsize;
        this.scope_newline = conf.newline;

        // TODO: scope guidelines
        //  o regular: '\u2506', '\u250a', '\u254e'
        //  o bold:    '\u2507', '\u250b', '\u254f'
    }

    CodeGen.prototype.emit = function(tokens) {
        var colorized = tokens.map(this.palette.colorize, this.palette);

        return colorized.join('');
    };

    CodeGen.prototype.pad = function(depth) {
        return ' '.repeat(this.tabstop).repeat(depth);
    };

    CodeGen.prototype.emit_expression = function(expr) {
        // declare some frequently used tokens
        const SPACE  = [TOK_WHTSPCE, ' '];
        const RPAREN = [TOK_PAREN, '('];
        const LPAREN = [TOK_PAREN, ')'];

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
                [SPACE, op, SPACE],
                this.emit_expression(bexpr.operands[1])
            );
        };

        // emit a generic ternary expression
        var _emit_texpr = function(texpr, op1, op2) {
            return Array.prototype.concat(
                this.emit_expression(texpr.operands[0]),
                [SPACE, op1, SPACE],
                this.emit_expression(texpr.operands[1]),
                [SPACE, op2, SPACE],
                this.emit_expression(texpr.operands[2])
            );
        };

        // emit a list delimited by a comma
        var _emit_list = function(arr) {
            var elements = [];

            if (arr.length > 0) {
                Array.prototype.push.apply(elements, arr[0]);

                for (var i = 1; i < arr.length; i++) {
                    Array.prototype.push.apply(elements, [[TOK_PUNCT, ','], SPACE]);
                    Array.prototype.push.apply(elements, arr[i]);
                }
            }

            return Array.prototype.concat([RPAREN], elements, [LPAREN]);
        };

        if (expr instanceof Expr.Val) {
            var str = this.xrefs.resolve_data(expr);
            
            if (str) {
                return [[TOK_STRING, str]];
            }

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

            if (rhand instanceof Expr.BExpr) {
                var inner_lhand = rhand.operands[0];
                var inner_rhand = rhand.operands[1];

                // "x = x op y"
                if (lhand.equals(inner_lhand)) {
                    // x = x +/- 1
                    if (((rhand instanceof Expr.Add) || (rhand instanceof Expr.Sub)) && inner_rhand.equals(new Expr.Val(1, lhand.size))) {
                        // "x++" / "x--"
                        return Array.prototype.concat(
                            this.emit_expression(lhand),
                            [[TOK_ARITH, rhand.operator.repeat(2)]]
                        );
                    }

                    // "x op= y"
                    return Array.prototype.concat(
                        this.emit_expression(lhand),
                        [SPACE, [TOK_ASSIGN, rhand.operator + '='], SPACE],
                        this.emit_expression(rhand.operands[1])
                    );
                }
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
            var args = expr.operands.map(this.emit_expression, this);
            var fname = this.xrefs.resolve_fname(expr.operator) || expr.operator;

            return Array.prototype.concat([[TOK_FNCALL, fname.toString()]], _emit_list(args));
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

        // generic invalid uexpr
        else if (expr instanceof Expr.UExpr) {
            return _emit_uexpr.call(this, expr, [TOK_INVALID, expr.operator]);
        }

        // generic invalid bexpr
        else if (expr instanceof Expr.BExpr) {
            return _emit_bexpr.call(this, expr, [TOK_INVALID, expr.operator]);
        }

        return [[TOK_INVALID, expr ? expr.toString() : expr]];
    };

    /**
     * Emit a statement with the appropriate indentation.
     * @param {!Stmt.Statement} stmt  Statement object to emit
     * @param {number} depth Nesting level
     */
    CodeGen.prototype.emit_statement = function(stmt, depth) {
        const INDENT = [TOK_WHTSPCE, this.pad(depth)];
        var tokens = [];

        // <DEBUG>
        tokens.push([TOK_OFFSET, '0x' + stmt.address.toString(16)]);
        // </DEBUG>

        tokens.push(INDENT);

        // TODO: a Branch is meant to be replaced by an 'If'; it is here only for dev purpose
        if (stmt instanceof Stmt.Branch) {
            Array.prototype.push.apply(tokens, [[TOK_KEYWORD, 'branch'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.cond));
            Array.prototype.push.apply(tokens, [[TOK_WHTSPCE, ' '], [TOK_PUNCT, '?'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.taken));
            Array.prototype.push.apply(tokens, [[TOK_WHTSPCE, ' '], [TOK_PUNCT, ':'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.not_taken));
            tokens.push([TOK_PUNCT, ';']);
        }

        else if (stmt instanceof Stmt.Break) {
            tokens.push([TOK_KEYWORD, 'break']);
            tokens.push([TOK_PUNCT, ';']);
        }

        else if (stmt instanceof Stmt.Continue) {
            tokens.push([TOK_KEYWORD, 'continue']);
            tokens.push([TOK_PUNCT, ';']);
        }

        else if (stmt instanceof Stmt.DoWhile) {
            tokens.push([TOK_KEYWORD, 'do']);
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
            Array.prototype.push.apply(tokens, [[TOK_KEYWORD, 'while'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, parenthesize(this.emit_expression(stmt.cond)));
        }

        else if (stmt instanceof Stmt.Goto) {
            Array.prototype.push.apply(tokens, [[TOK_KEYWORD, 'goto'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, this.emit_expression(stmt.dest));
            tokens.push([TOK_PUNCT, ';']);
        }

        else if (stmt instanceof Stmt.If) {
            Array.prototype.push.apply(tokens, [[TOK_KEYWORD, 'if'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, parenthesize(this.emit_expression(stmt.cond)));
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.then_cntr, depth));

            if (stmt.else_cntr) {
                if (this.scope_newline) {
                    tokens.push([TOK_WHTSPCE, '\n']);
                    // <DEBUG>
                    tokens.push([TOK_OFFSET, ' '.repeat(stmt.address.toString(16).length + 2)]);
                    // </DEBUG>
                    tokens.push(INDENT);
                } else {
                    tokens.push([TOK_WHTSPCE, ' ']);
                }

                tokens.push([TOK_KEYWORD, 'else']);
                Array.prototype.push.apply(tokens, this.emit_scope(stmt.else_cntr, depth));
            }
        }

        else if (stmt instanceof Stmt.Return) {
            tokens.push([TOK_KEYWORD, 'return']);

            if (stmt.retval) {
                tokens.push([TOK_WHTSPCE, ' ']);
                Array.prototype.push.apply(tokens, auto_paren(this.emit_expression(stmt.retval)));
            }
            tokens.push([TOK_PUNCT, ';']);

        }

        else if (stmt instanceof Stmt.While) {
            Array.prototype.push.apply(tokens, [[TOK_KEYWORD, 'while'], [TOK_WHTSPCE, ' ']]);
            Array.prototype.push.apply(tokens, parenthesize(this.emit_expression(stmt.cond)));
            Array.prototype.push.apply(tokens, this.emit_scope(stmt.body, depth));
        }

        // generic statement
        else {
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
     * @param {boolean} stripped Strip off curly braces
     */
    CodeGen.prototype.emit_scope = function(cntr, depth, stripped) {
        console.assert(cntr);

        const INDENT = [TOK_WHTSPCE, this.pad(depth)];

        var tokens = [];

        if (!stripped) {
            if (this.scope_newline) {
                tokens.push([TOK_WHTSPCE, '\n']);

                // <DEBUG>
                tokens.push([TOK_OFFSET, '0x' + cntr.address.toString(16)]);
                // </DEBUG>

                tokens.push(INDENT);
            } else {
                tokens.push([TOK_WHTSPCE, ' ']);
            }

            tokens.push([TOK_PAREN, '{']);
        }

        tokens.push([TOK_WHTSPCE, '\n']);

        var content = [];
        content = Array.prototype.concat.apply(content, cntr.statements.map(function(s) {
            return this.emit_statement(s, depth + 1);
        }, this));

        // emit fall-through container
        if (cntr.fallthrough) {
            Array.prototype.push.apply(content, this.emit_scope(cntr.fallthrough, depth, true));
        }

        var closing = [];

        if (!stripped) {
            // <DEBUG>
            closing.push([TOK_OFFSET, ' '.repeat(cntr.address.toString(16).length + 2)]);
            // </DEBUG>

            closing.push(INDENT);
            closing.push([TOK_PAREN, '}']);
        }

        return Array.prototype.concat(tokens, content, closing);
    };

    CodeGen.prototype.emit_func = function(func) {
        var tokens = [];

        // <DEBUG>
        tokens.push([TOK_OFFSET, ' '.repeat(func.entry_block.container.address.toString(16).length + 2)]);
        // </DEBUG>

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

        // emit containers recursively
        Array.prototype.push.apply(tokens, this.emit_scope(func.entry_block.container, 0, false));

        return this.emit(tokens);
    };

    return CodeGen;
})();