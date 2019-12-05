
(function() {
    var Expr = require('js/libcore2/analysis/ir/expressions');
    var Stmt = require('js/libcore2/analysis/ir/statements');

    // coloring tokens enumeration
    const TOK_RESET   =  0; // color reset
    const TOK_WHTSPCE =  1; // whitespace
    const TOK_KEYWORD =  2; // reserved keyword
    const TOK_PAREN   =  3; // parenthesis
    const TOK_PUNCT   =  4; // punctuation
    const TOK_OPRTOR  =  5; // operator
    const TOK_NUMBER  =  6; // number literal
    const TOK_STRING  =  7; // string literal
    const TOK_FNCALL  =  8; // function name [func call]
    const TOK_FNNAME  =  9; // function name [func prototype]
    const TOK_VARTYPE = 10; // data type
    const TOK_VARNAME = 11; // variable name
    const TOK_COMMENT = 12; // comment
    const TOK_OFFSET  = 13; // instruction address
    const TOK_INVALID = 14; // unknown

    var _wrap = function(esccode) {
        return esccode ? '\033[' + esccode + 'm' : '';
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

	// theme based on vscode dark+
    function DarkPlusPalette() {
        var colormap = [
            null,               // TOK_RESET -- placeholder
            '',                 // TOK_WHTSPCE
            [197, 134, 192],    // TOK_KEYWORD	+ [this color is for cflow; other kwords: [ 86, 156, 214])
            [212, 212, 212],    // TOK_PAREN
            [212, 212, 212],    // TOK_PUNCT
            [212, 212, 212],    // TOK_OPERATOR
            [181, 206, 168],    // TOK_NUMBER	+
            [206, 145, 120],    // TOK_STRING	+
            [220, 220, 170],    // TOK_FNCALL
            [220, 220, 170],    // TOK_FNNAME	+
            [ 78, 201, 176],    // TOK_VARTYPE	+
            [156, 220, 254],    // TOK_VARNAME	+ 
            [106, 153,  85],    // TOK_COMMENT	+
            [131, 148, 150],    // TOK_OFFSET
            [244,  71,  71]     // TOK_INVALID	+
        ].map(function(key) { return _wrap(_rgb_to_esccode(key)); });

        Palette.call(this, colormap);
    }

    DarkPlusPalette.prototype = Object.create(Palette.prototype);
    DarkPlusPalette.prototype.constructor = DarkPlusPalette;

    // highlight syntax according to r2 theme
    function ThemePalette(ecj) {
        // map TOK indices to r2 theme color keys and then turn them
        // into their corresponding rgb entries

        var colormap = [
            null,               // TOK_RESET -- placeholder
            '',                 // TOK_WHTSPCE
            'ret',              // TOK_KEYWORD
            '',                 // TOK_PAREN
            '',                 // TOK_PUNCT
            'math',             // TOK_OPERATOR
            'num',              // TOK_NUMBER
            'btext',            // TOK_STRING
            'call',             // TOK_FNCALL
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

    // a monochrome palette that does no syntax highlighting
    // useful when stdout is not a tty (i.e. a pipe to file or process)
    function MonoPalette() {
        var colormap = Object.freeze(Array(TOK_INVALID + 1).fill(''));

        Palette.call(this, colormap);
    }

    MonoPalette.prototype = Object.create(Palette.prototype);
    MonoPalette.prototype.constructor = MonoPalette;

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

    // <DEBUG>
    // var subscript = function(n) {
    //     const uc_digits = [
    //         '\u2080',
    //         '\u2081',
    //         '\u2082',
    //         '\u2083',
    //         '\u2084',
    //         '\u2085',
    //         '\u2086',
    //         '\u2087',
    //         '\u2088',
    //         '\u2089'
    //     ];
    //
    //     var str_digit_to_uc_digit = function(d) {
    //         return uc_digits[d - 0];
    //     };
    //
    //     return n.toString().split('').map(str_digit_to_uc_digit).join('');
    // };
    // </DEBUG>

    function CodeGen(resolver, conf) {
        var colorful = 0 | Global.r2cmd('e', 'scr.color');

        // let r2 to decide whether there would be syntax highlighting
        this.palette = colorful ?
            new DarkPlusPalette() :
            // new ThemePalette(Global.r2cmdj('ecj')) :
            new MonoPalette();

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

    CodeGen.prototype.emit_expression = function(expr, opt) {
        const SPACE = [TOK_WHTSPCE, ' '];

        var tname = Object.getPrototypeOf(expr).constructor.name;

        opt = opt || {};

        // emit a generic unary expression
        var _emit_uexpr = function(uexpr, op) {
            // // a temporary method to display pointers as indexed arrays
            // if (uexpr instanceof Expr.Deref) {
            //     var operand = uexpr.operands[0];
            //
            //     if (operand instanceof Expr.Add) {
            //         var ptr = operand.operands[0];
            //         var idx = operand.operands[1];
            //
            //         if (ptr instanceof Expr.Var) {
            //             var cast = {
            //                 8: 'char*',
            //                16: 'short*',
            //                32: 'int*',
            //                64: 'long long*'
            //             }[uexpr.size];
            //
            //             // omit casting if variable size matches the dereference size
            //             var cast_tok = (ptr.size === uexpr.size) ?
            //                 [] :
            //                 [[TOK_PAREN, '('], [TOK_VARTYPE, cast], [TOK_PAREN, ')'], SPACE];
            //
            //             // adjust index according to pointer arithmetic
            //             if (idx instanceof Expr.Val) {
            //                 idx.value = idx.value.div(uexpr.size / 8);
            //             }
            //
            //             return Array.prototype.concat(
            //                 cast_tok,
            //                 this.emit_expression(ptr),
            //                 [[TOK_PAREN, '[']], this.emit_expression(idx), [[TOK_PAREN, ']']]
            //             );
            //         }
            //     }
            // }

            return Array.prototype.concat(
                [op],
                auto_paren(this.emit_expression(uexpr.operands[0]))
            );
        };

        // emit a generic binary expression
        var _emit_bexpr = function(bexpr, op) {
            var p = bexpr.parent;
            var lhand = bexpr.operands[0];
            var rhand = bexpr.operands[1];

            var lhand_opt = {};
            var rhand_opt = {};

            // most likely a bitmask, show right argument as hex
            if (['And', 'Or', 'Xor'].indexOf(tname) !== (-1)) {
                rhand_opt.radix = 16;
            }

            var elements = Array.prototype.concat(
                this.emit_expression(lhand, lhand_opt),
                [SPACE, op, SPACE],
                this.emit_expression(rhand, rhand_opt)
            );

            if ((p instanceof Expr.Expr) && !(p instanceof Expr.Assign)) {
                elements = auto_paren(elements);
            }

            return elements;
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
            var str = this.xrefs.resolve_data(expr,
                (expr.parent instanceof Expr.Deref) ||
                (expr.parent instanceof Expr.Call));

            if (str) {
                return [[TOK_STRING, str]];
            }

            // TODO: emit value in the appropriate format: dec, hex, signed, unsigned, ...
            return [[TOK_NUMBER, expr.toString(opt)]];
        }

        else if (expr instanceof Expr.Reg) {
            return [[TOK_VARNAME, expr.toString()]];
        }

        else if (expr instanceof Expr.UExpr) {
            var _uexpr_op = {
                'Deref'     : [TOK_OPRTOR, '*'],
                'AddressOf' : [TOK_OPRTOR, '&'],
                'Not'       : [TOK_OPRTOR, '~'],
                'Neg'       : [TOK_OPRTOR, '-'],
                'BoolNot'   : [TOK_OPRTOR, '!']
            }[tname] || [TOK_INVALID, expr.operator || tname];

            return _emit_uexpr.call(this, expr, _uexpr_op);
        }

        else if (expr instanceof Expr.BExpr) {
            var _bexpr_op = {
                'Assign' : [TOK_OPRTOR, '='],
                'Add'    : [TOK_OPRTOR, '+'],
                'Sub'    : [TOK_OPRTOR, '-'],
                'Mul'    : [TOK_OPRTOR, '*'],
                'Div'    : [TOK_OPRTOR, '/'],
                'Mod'    : [TOK_OPRTOR, '%'],
                'And'    : [TOK_OPRTOR, '&'],
                'Or'     : [TOK_OPRTOR, '|'],
                'Xor'    : [TOK_OPRTOR, '^'],
                'Shl'    : [TOK_OPRTOR, '<<'],
                'Shr'    : [TOK_OPRTOR, '>>'],
                'EQ'     : [TOK_OPRTOR, '=='],
                'NE'     : [TOK_OPRTOR, '!='],
                'LT'     : [TOK_OPRTOR, '<'],
                'GT'     : [TOK_OPRTOR, '>'],
                'LE'     : [TOK_OPRTOR, '<='],
                'GE'     : [TOK_OPRTOR, '>='],
                'BoolAnd': [TOK_OPRTOR, '&&'],
                'BoolOr' : [TOK_OPRTOR, '||']
            }[tname] || [TOK_INVALID, expr.operator || tname];

            // check whether this is an assignment special case
            if (expr instanceof Expr.Assign) {
                var lhand = expr.operands[0];
                var rhand = expr.operands[1];

                // there are three special cases where assignments should be displayed diffreently:
                //   1. x = x op y  -> x op= y
                //   2. x = x + 1   -> x++
                //   3. x = x - 1   -> x--

                if (rhand instanceof Expr.BExpr) {
                    var inner_lhand = rhand.operands[0];
                    var inner_rhand = rhand.operands[1];

                    // "x = x op y"
                    if (lhand.equals(inner_lhand)) {
                        var inner_tname = Object.getPrototypeOf(rhand).constructor.name;

                        var _inner_op = {
                            'Add' : '+',
                            'Sub' : '-',
                            'Mul' : '*',
                            'Div' : '/',
                            'Mod' : '%',
                            'And' : '&',
                            'Or'  : '|',
                            'Xor' : '^',
                            'Shl' : '<<',
                            'Shr' : '>>'
                        }[inner_tname];

                        // x = x +/- 1
                        if (((rhand instanceof Expr.Add) || (rhand instanceof Expr.Sub)) && inner_rhand.equals(new Expr.Val(1, lhand.size))) {
                            // "x++" / "x--"
                            return Array.prototype.concat(
                                this.emit_expression(lhand),
                                [[TOK_OPRTOR, _inner_op.repeat(2)]]
                            );
                        }
    
                        // "x op= y"
                        return Array.prototype.concat(
                            this.emit_expression(lhand),
                            [SPACE, [TOK_OPRTOR, _inner_op + '='], SPACE],
                            this.emit_expression(inner_rhand)
                        );
                    }
                }

                // not a special case; stay with default token
            }

            return _emit_bexpr.call(this, expr, _bexpr_op);
        }

        else if (expr instanceof Expr.TExpr) {
            var _texpr_ops = {
                'TCond': [[TOK_OPRTOR, '?'], [TOK_OPRTOR, ':']]
            }[tname] || [[TOK_INVALID, expr.operator[0]], [TOK_INVALID, expr.operator[1]]];

            return _emit_texpr.call(this, expr, _texpr_ops[0], _texpr_ops[1]);
        }

        else if (expr instanceof Expr.Call) {
            var fname = expr.operands[0];
            var args = expr.operands.slice(1);
            var fcall;

            // calling indirectly or through relocation table
            if (fname instanceof Expr.Deref) {
                fname = fname.operands[0];
            }

            if (fname instanceof Expr.Val) {
                fname = this.xrefs.resolve_fname(fname);

                fcall = [[TOK_FNCALL, fname.toString()]];
            } else {
                fcall = this.emit_expression(fname);
            }

            return Array.prototype.concat(fcall, _emit_expr_list.call(this, args));
        }

        else if (expr instanceof Expr.Unknown) {
            var asm_line = [TOK_STRING, '"' + expr.line + '"'];

            return [[TOK_KEYWORD, '__asm'], SPACE].concat(parenthesize([asm_line]));
        }

        // else if (expr instanceof Expr.Phi) {
        //     return Array.prototype.concat([[TOK_INVALID, '\u03a6']], _emit_expr_list.call(this, expr.operands));
        // }

        return [[TOK_INVALID, expr ? expr.toString() : expr]];
    };

    /**
     * Emit a statement with the appropriate indentation.
     * @param {!Stmt.Statement} stmt  Statement object to emit
     */
    CodeGen.prototype.emit_statement = function(stmt) {
        const SPACE = [TOK_WHTSPCE, ' '];
        const SEMIC = [TOK_PUNCT, ';'];

        var addr_str = '0x' + stmt.address.toString(16);

        // a list of lists: each element in `lines` is a line of output made of list of tokens
        var lines = [];

        // note: all Branch stataments are supposed to be replaced by conditions and loops
        // this is left here just in case
        if (stmt instanceof Stmt.Branch) {
            lines.push(Array.prototype.concat(
                [[TOK_KEYWORD, 'branch'], SPACE],
                this.emit_expression(stmt.cond),
                [SPACE, [TOK_PUNCT, '?'], SPACE],
                this.emit_expression(stmt.taken),
                [SPACE, [TOK_PUNCT, ':'], SPACE],
                this.emit_expression(stmt.not_taken),
                [SEMIC]));
        }

        else if (stmt instanceof Stmt.Break) {
            lines.push([[TOK_KEYWORD, 'break'], SEMIC]);
        }

        else if (stmt instanceof Stmt.Continue) {
            lines.push([[TOK_KEYWORD, 'continue'], SEMIC]);
        }

        else if (stmt instanceof Stmt.DoWhile) {
            var do_body = this.emit_scope(stmt.body);
            var do_cond = this.emit_expression(stmt.cond);

            lines.push([[TOK_KEYWORD, 'do']].concat(this.scope_newline ? [] : [SPACE, do_body.shift()[1][0]]));
            Array.prototype.push.apply(lines, do_body);
            lines.push([[TOK_KEYWORD, 'while'], SPACE].concat(parenthesize(do_cond)).concat([SEMIC]));
        }

        else if (stmt instanceof Stmt.Goto) {
            var goto_dest = this.emit_expression(stmt.dest);

            lines.push([[TOK_KEYWORD, 'goto'], SPACE].concat(goto_dest).concat([SEMIC]));
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

            lines.push([[TOK_KEYWORD, 'return']].concat(retval).concat([SEMIC]));
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
                return this.emit_expression(expr).concat([SEMIC]);
            }, this);
        }

        lines[0] = [[TOK_OFFSET, addr_str], lines[0]];

        return lines;
    };

    /**
     * Emit a lexical scope with the appropriate indentation.
     * @param {!Cntr.Container} cntr  Container object to emit
     * @param {boolean} stripped Strip off curly braces
     */
    CodeGen.prototype.emit_scope = function(cntr, stripped) {
        if (!cntr) { return; }
        // console.assert(cntr);

        const INDENT = [TOK_OFFSET, this.guide + ' '.repeat(this.tabsize - 1)];
        const addr_str = '0x' + cntr.address.toString(16);

        var lines = [];

        if (!stripped) {
            lines.push([[TOK_OFFSET, addr_str], [[TOK_PAREN, '{']]]);
        }

        Array.prototype.push.apply(lines, cntr.locals.map(function(vitem) {
            return [
                [TOK_OFFSET, ' '.repeat(addr_str.length)],
                [
                    INDENT,
                    [TOK_VARTYPE, vitem.type],
                    [TOK_WHTSPCE, ' '],
                    [TOK_VARNAME, vitem.name],
                    [TOK_PUNCT, ';']
                ]
            ];
        }));

        cntr.statements.forEach(function(s) {
            var stmt_lines = this.emit_statement(s);

            // indent child statements
            stmt_lines.forEach(function(l) {
                l[1].unshift(INDENT);
            });

            Array.prototype.push.apply(lines, stmt_lines);
        }, this);

        // emit fall-through container
        if (cntr.fallthrough) {
            Array.prototype.push.apply(lines, this.emit_scope(cntr.fallthrough, true));
        }

        if (!stripped) {
            lines.push([[TOK_OFFSET, ' '.repeat(addr_str.length)], [[TOK_PAREN, '}']]]);
        }

        return lines;
    };

    CodeGen.prototype.emit_func = function(func) {
        const SPACE = [TOK_WHTSPCE, ' '];

        var _emit_func_decl = function(func) {
            var arglist = [];

            if (func.args.length === 0) {
                arglist = [[TOK_VARTYPE, 'void']];
            } else {
                var a = func.args[0];

                // handle first arg
                arglist.push([TOK_VARTYPE, a.type]);
                arglist.push(SPACE);
                arglist.push([TOK_VARNAME, a.name]);
    
                // handle rest of the args
                func.args.slice(1).forEach(function(a) {
                    arglist.push([TOK_PUNCT, ',']);
                    arglist.push(SPACE);
                    arglist.push([TOK_VARTYPE, a.type]);
                    arglist.push(SPACE);
                    arglist.push([TOK_VARNAME, a.name]);
                });
            }
  
            var func_decl = Array.prototype.concat([
                [TOK_VARTYPE, func.rettype],
                SPACE,
                [TOK_FNNAME, func.name],
                [TOK_PAREN, '(']],
                arglist,
                [[TOK_PAREN, ')']]
            );

            return [
                [[TOK_OFFSET, '0x' + func.address.toString(16)], func_decl]
            ];
        };

        var func_decl = _emit_func_decl(func);

        func.entry_block.container.locals = func.vars;

        // emit containers recursively
        var func_body = this.emit_scope(func.entry_block.container);

        // if no scope newline, pull opening bracket from function body to function decl
        if (!(this.scope_newline)) {
            // pulling out first token of first body line
            var obrace = func_body.shift()[1][0];

            func_decl[0][1].push(SPACE);
            func_decl[0][1].push(obrace);
        }

        return this.emit(Array.prototype.concat(func_decl, func_body));
    };

    return CodeGen;
});
