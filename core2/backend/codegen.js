
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
        return Array.prototype.concat([[TOK_PAREN, '(']], s, [[TOK_PAREN, ')']]);
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
        // TODO: do not use colors if 'scr.color' is set to 0
        this.palette = new ThemePalette(ecj);
        this.xrefs = resolver;

        this.tabsize = conf.tabsize;
        this.scope_newline = conf.newline;

        // see alternate guides here: http://unicode-search.net/unicode-namesearch.pl?term=VERTICAL
        var guides = [
            ' ',        // none
            '\uffe8',   // solid line
            '\uffe4'    // dashed line
        ];

        if (conf.guides >= guides.length) {
            conf.guides = 0;
        }

        this.guide = guides[conf.guides];
    }

    // <DEBUG>
    // var array_toString = function(seq) {
    //     var elems = seq.map(function(elem) {
    //         return elem instanceof Array ? array_toString(elem) : elem && elem.toString();
    //     }).join(', ');
    //
    //     return '[' + elems + ']';
    // };
    // </DEBUG>

    CodeGen.prototype.emit = function(lines) {
        const INDENT = [TOK_WHTSPCE, ' '.repeat(this.tabsize)];

        var colorized = lines.map(function(l) {
            // return array_toString(l);

            var addr = l[0];
            var tokens = l[1];

            tokens.unshift(INDENT);
            tokens.unshift(addr);

            return tokens.map(this.palette.colorize, this.palette).join('');
        }, this);

        return colorized.join('\n');
    };

    CodeGen.prototype.emit_expression = function(expr) {
        const SPACE = [TOK_WHTSPCE, ' '];

        var tname = Object.getPrototypeOf(expr).constructor.name;

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

        // emit a list of expressions delimited by a comma
        var _emit_expr_list = function(exprs) {
            var elements = [];

            if (exprs.length > 0) {
                Array.prototype.push.apply(elements, this.emit_expression(exprs[0]));

                for (var i = 1; i < exprs.length; i++) {
                    Array.prototype.push.apply(elements, [[TOK_PUNCT, ','], SPACE]);
                    Array.prototype.push.apply(elements, this.emit_expression(exprs[i]));
                }
            }

            return parenthesize(elements);
        };

        if (expr instanceof Expr.Val) {
            // TODO: this causes even pointer displacements to be attempted for resolving.
            // need to find a better way to filter what needs to be resolved (derefs and fcall args..?)
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

        else if (expr instanceof Expr.UExpr) {
            var _uexpr_op = {
                'Deref'  : [TOK_PUNCT, '*'],
                'AddrOf' : [TOK_PUNCT, '&'],
                'Not'    : [TOK_BITWISE, '~'],
                'Neg'    : [TOK_BITWISE, '-'],
                'BoolNot': [TOK_COMPARE, '!']
            }[tname] || [TOK_INVALID, expr.operator];

            // <DEBUG>
            if (expr instanceof Expr.Deref) {
                return [[TOK_PUNCT, expr.toString()]];
            }
            // </DEBUG>

            return _emit_uexpr.call(this, expr, _uexpr_op);
        }

        else if (expr instanceof Expr.BExpr) {
            var _bexpr_op = {
                'Assign' : [TOK_ASSIGN, '='],
                'Add'    : [TOK_ARITH, '+'],
                'Sub'    : [TOK_ARITH, '-'],
                'Mul'    : [TOK_ARITH, '*'],
                'Div'    : [TOK_ARITH, '/'],
                'Mod'    : [TOK_ARITH, '%'],
                'And'    : [TOK_BITWISE, '&'],
                'Or'     : [TOK_BITWISE, '|'],
                'Xor'    : [TOK_BITWISE, '^'],
                'Shl'    : [TOK_BITWISE, '<<'],
                'Shr'    : [TOK_BITWISE, '>>'],
                'EQ'     : [TOK_COMPARE, '=='],
                'NE'     : [TOK_COMPARE, '!='],
                'LT'     : [TOK_COMPARE, '<'],
                'GT'     : [TOK_COMPARE, '>'],
                'LE'     : [TOK_COMPARE, '<='],
                'GE'     : [TOK_COMPARE, '>='],
                'BoolAnd': [TOK_COMPARE, '&&'],
                'BoolOr' : [TOK_COMPARE, '||']
            }[tname] || [TOK_INVALID, expr.operator];

            // check whether this is an assignment special case
            if (expr instanceof Expr.Assign) {
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

                // not a special case; stay with default token
            }

            return _emit_bexpr.call(this, expr, _bexpr_op);
        }

        else if (expr instanceof Expr.TExpr) {
            var _texpr_ops = {
                'TCond': [[TOK_PUNCT, '?'], [TOK_PUNCT, ':']]
            }[tname] || [[TOK_INVALID, expr.operator[0]], [TOK_INVALID, expr.operator[1]]];

            return _emit_texpr.call(this, expr, _texpr_ops[0], _texpr_ops[1]);
        }

        else if (expr instanceof Expr.Call) {
            var args = expr.operands;
            var fname = expr.operator;

            // calling indirectly or through relocation table
            if (fname instanceof Expr.Deref) {
                fname = fname.operands[0];
            }

            // attempt to resolve function name; fallback to called expression
            fname = this.xrefs.resolve_fname(fname) || expr.operator;

            return Array.prototype.concat([[TOK_FNCALL, fname.toString()]], _emit_expr_list.call(this, args));
        }

        return [[TOK_INVALID, expr ? expr.toString() : expr]];
    };

    /**
     * Emit a statement with the appropriate indentation.
     * @param {!Stmt.Statement} stmt  Statement object to emit
     */
    CodeGen.prototype.emit_statement = function(stmt) {
        const SPACE = [TOK_WHTSPCE, ' '];

        var addr_str = '0x' + stmt.address.toString(16);

        // a list of lists: each element in `lines` is a line of output made of list of tokens
        var lines = [];

        // TODO: a Branch is meant to be replaced by an 'If'; it is here only for dev purpose
        if (stmt instanceof Stmt.Branch) {
            lines.push(Array.prototype.concat(
                [[TOK_KEYWORD, 'branch'], SPACE],
                this.emit_expression(stmt.cond),
                [SPACE, [TOK_PUNCT, '?'], SPACE],
                this.emit_expression(stmt.taken),
                [SPACE, [TOK_PUNCT, ':'], SPACE],
                this.emit_expression(stmt.not_taken),
                [[TOK_PUNCT, ';']]));
        }

        else if (stmt instanceof Stmt.Break) {
            lines.push([[TOK_KEYWORD, 'break'], [TOK_PUNCT, ';']]);
        }

        else if (stmt instanceof Stmt.Continue) {
            lines.push([[TOK_KEYWORD, 'continue'], [TOK_PUNCT, ';']]);
        }

        else if (stmt instanceof Stmt.DoWhile) {
            var do_body = this.emit_scope(stmt.body);
            var do_cond = this.emit_expression(stmt.cond);

            lines.push([[TOK_KEYWORD, 'do']].concat(this.scope_newline ? [] : [SPACE, do_body.shift()[1][0]]));
            Array.prototype.push.apply(lines, do_body);
            lines.push([[TOK_KEYWORD, 'while'], SPACE].concat(parenthesize(do_cond)).concat([[TOK_PUNCT, ';']]));
        }

        else if (stmt instanceof Stmt.Goto) {
            var goto_dest = this.emit_expression(stmt.dest);

            lines.push([[TOK_KEYWORD, 'goto'], SPACE].concat(goto_dest).concat([[TOK_PUNCT, ';']]));
        }

        else if (stmt instanceof Stmt.If) {
            var if_cond = this.emit_expression(stmt.cond);
            var if_true = this.emit_scope(stmt.then_cntr);
            var if_true_o = this.scope_newline ? [] : [SPACE, if_true.shift()[1][0]];

            var if_true_c = [];
            var if_false = [];
            var if_false_o = [];

            if (stmt.else_cntr) {
                if_false = this.emit_scope(stmt.else_cntr);

                if (!this.scope_newline) {
                    if_true_c = [if_true.pop()[1][0], SPACE];
                    if_false_o = [SPACE, if_false.shift()[1][0]];
                }
            }

            lines.push([[TOK_KEYWORD, 'if'], SPACE].concat(parenthesize(if_cond)).concat(if_true_o));
            Array.prototype.push.apply(lines, if_true);

            if (stmt.else_cntr) {
                lines.push([[TOK_OFFSET, ' '.repeat(addr_str.length)], if_true_c.concat([[TOK_KEYWORD, 'else']]).concat(if_false_o)]);
                Array.prototype.push.apply(lines, if_false);
            }
        }

        else if (stmt instanceof Stmt.Return) {
            var retval = stmt.retval ? [SPACE].concat(auto_paren(this.emit_expression(stmt.retval))) : [];

            lines.push([[TOK_KEYWORD, 'return']].concat(retval).concat([[TOK_PUNCT, ';']]));
        }

        else if (stmt instanceof Stmt.While) {
            var while_cond = this.emit_expression(stmt.cond);
            var while_body = this.emit_scope(stmt.body);
            
            lines.push([[TOK_KEYWORD, 'while'], SPACE].concat(parenthesize(while_cond)).concat(this.scope_newline ? [] : [SPACE, while_body.shift()[1][0]]));
            Array.prototype.push.apply(lines, while_body);
        }

        // generic statement
        else {
            lines = stmt.expressions.map(function(expr) {
                return this.emit_expression(expr).concat([[TOK_PUNCT, ';']]);
            }, this);
        }

        lines[0] = [[TOK_OFFSET, addr_str], lines[0]];

        return lines;
    };

    /**
     * Emit a lexical scope with the appropriate indentation.
     * @param {!Stmt.Container} cntr  Container object to emit
     * @param {boolean} stripped Strip off curly braces
     */
    CodeGen.prototype.emit_scope = function(cntr, stripped) {
        if (!cntr) { return; }
        // console.assert(cntr);

        const INDENT = [TOK_OFFSET, this.guide + ' '.repeat(this.tabsize - 1)];

        var lines = [];

        if (!stripped) {
            lines.push([[TOK_OFFSET, '0x' + cntr.address.toString(16)], [[TOK_PAREN, '{']]]);
        }

        cntr.statements.map(function(s) {
            var stmt_lines = this.emit_statement(s);

            stmt_lines.forEach(function(l) {
                lines.push([l[0], [INDENT].concat(l[1])]);
            });
        }, this);

        // emit fall-through container
        if (cntr.fallthrough) {
            Array.prototype.push.apply(lines, this.emit_scope(cntr.fallthrough, true));
        }

        if (!stripped) {
            lines.push([[TOK_OFFSET, ' '.repeat(('0x' + cntr.address.toString(16)).length)], [[TOK_PAREN, '}']]]);
        }

        return lines;
    };

    CodeGen.prototype.emit_func = function(func) {
        const SPACE = [TOK_WHTSPCE, ' '];

        var fdecl = [];

        fdecl.push([TOK_VARTYPE, func.rettype]);
        fdecl.push(SPACE);
        fdecl.push([TOK_FNNAME, func.name]);

        fdecl.push([TOK_PAREN, '(']);
        if (func.args.length === 0) {
            fdecl.push([TOK_VARTYPE, 'void']);
        } else {
            var a = func.args[0];

            // handle first arg
            fdecl.push([TOK_VARTYPE, a.type]);
            fdecl.push(SPACE);
            fdecl.push([TOK_VARNAME, a.name]);

            // handle rest of the args
            func.args.slice(1).forEach(function(a) {
                fdecl.push([TOK_PUNCT, ',']);
                fdecl.push(SPACE);
                fdecl.push([TOK_VARTYPE, a.type]);
                fdecl.push(SPACE);
                fdecl.push([TOK_VARNAME, a.name]);
            });
        }
        fdecl.push([TOK_PAREN, ')']);

        // emit containers recursively
        var func_body = this.emit_scope(func.entry_block.container);

        if (!this.scope_newline) {
            fdecl.push(SPACE);
            fdecl.push(func_body.shift()[1][0]);
        }

        return this.emit([[[TOK_OFFSET, '0x' + func.address.toString(16)], fdecl]].concat(func_body));
    };

    return CodeGen;
})();