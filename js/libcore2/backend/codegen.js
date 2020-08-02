/* 
 * Copyright (C) 2018-2020 elicn
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

(function() {
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Stmt = require('js/libcore2/analysis/ir/statements');
    const Tag = require('js/libcore2/backend/tags');

    /**
     * Subscriptable code listing object that maps containers addresses to scopes.
     * Function's entry scope is accessed by the 'entry' key
     * @typedef {Object<string,CodeScopeRepr>} CodeListingRepr
     * @inner
     */

    /**
     * Subscriptable scope object that lists scope's lines
     * @typedef {Object} CodeScopeRepr
     * @property {string} address Scope starting address in hexadecimal form
     * @property {Array.<CodeLineRepr>} lines Code lines
     * @property {string} [next] Scope address this scope continues to
     * @inner
     */

    /**
     * Subscriptable scope object that contain a single line information
     * @typedef {Object} CodeLineRepr
     * @property {string} address Line address in hexadecimal form
     * @property {Array.<Token>} line Array of syntax tokens
     * @property {Array.<string>} sub Array of sub-scopes attached to this line
     * @inner
     */

    /**
     * Syntax token: a pair of color tag and a string
     * @typedef {[number,string]} Token
     * @inner
     */

    /**
     * Listing object: holds decompilation data of the entire function
     * @constructor
     */
    function CodeListing() {
        /** @type {Array<string>} */
        this.keys = [];

        /** @type {Array<CodeScope>} */
        this.vals = [];
    }

    /**
     * Registers a new scope object to the listing, and returns it
     * @param {string} address Scope address
     * @param {?string} next Scope address to which this scope falls through (optional)
     * @returns {CodeScope} Newly created scope instance
     */
    CodeListing.prototype.makeScope = function(address, next) {
        // address coming from a FakeContainer would contain a dotted suffix which
        // should remain in scope key, but not in the scope address
        var scope = new CodeScope(address.split('.')[0], next);

        this.keys.push(address);
        this.vals.push(scope);

        return scope;
    };

    /**
     * Get JSON-friendly object represenation
     * @returns {CodeListingRepr}
     */
    CodeListing.prototype.repr = function() {
        var listing = {};

        for (var i = 0; i < this.keys.length; i++) {
            var key = this.keys[i];
            var val = this.vals[i];

            listing[key] = val.repr();
        }

        return listing;
    };

    // ------------------------------------------------------------

    /**
     * Scope object: holds decompilation information of a single scope
     * To be called only by the `makeScope` method
     * @param {string} address Scope address
     * @param {?string} next Scope address to which this scope falls through (optional)
     * @constructor
     */
    function CodeScope(address, next) {
        /** @type {string} */
        this.address = address;

        /** @type {Array<CodeLine>} */
        this.lines = [];

        /** @type {string} */
        this.next = next;
    }

    /**
     * Registers a new line object to the scope, and returns it
     * @param {string} address Line (statement) address
     * @param {?Array.<string>} sub Sub scopes: scopes addresses to which this line continues (optional)
     * @returns {CodeLine} Newly created line instance
     */
    CodeScope.prototype.makeLine = function(address, sub) {
        var line = new CodeLine(address, sub);

        this.lines.push(line);

        return line;
    };

    /**
     * Get JSON-friendly object represenation
     * @returns {CodeScopeRepr}
     */
    CodeScope.prototype.repr = function() {
        return {
            'address' : this.address,
            'lines' : this.lines.map(function(l) { return l.repr(); }),
            'next' : this.next
        };
    };

    // ------------------------------------------------------------

    /**
     * Line object: holds decompilation information of a single line / statement
     * To be called only by the `makeLine` method
     * @param {string} address Line (statement) address
     * @param {?Array.<string>} sub Sub scopes: scopes addresses to which this line continues (optional)
     * @constructor
     */
    function CodeLine(address, sub) {
        /** @type {string} */
        this.address = address;

        /** @type {Array<Token>} */
        this.line = [];

        /** @type {Array<string>} */
        this.sub = sub || [];
    }

    /**
     * Append a syntax token to the line.
     * @param {Token} token Syntax token to add
     */
    CodeLine.prototype.append = function(token) {
        this.line.push(token);
    };

    /**
     * Append multiple syntax tokens to the line.
     * @param {Array.<Token>} tokens List of syntax tokens to add
     */
    CodeLine.prototype.extend = function(tokens) {
        tokens.forEach(this.append, this);
    };

    /**
     * Get JSON-friendly object represenation
     * @returns {CodeLineRepr}
     */
    CodeLine.prototype.repr = function() {
        return {
            'address' : this.address,
            'line' : this.line,
            'sub' : this.sub.map(addrOf)
        };
    };

    // ------------------------------------------------------------

    /**
     * Code generator object: transforms IR to code tokens
     * @param {*} resolver Resolver instance to handle resolving of r2 flags
     * @constructor
     */
    function CodeGen(resolver) {
        this.xrefs = resolver;
    }

    // common tokens
    const COMMA  = [Tag.PUNCT,   ','];
    const SPACE  = [Tag.WHTSPCE, ' '];
    const LPAREN = [Tag.PAREN,   '('];
    const RPAREN = [Tag.PAREN,   ')'];
    const SEMIC  = [Tag.PUNCT,   ';'];

    var addrOf = function(o) {
        return '0x' + o.address.toString(16);
    };

    var blanks = function(o) {
        return ' '.repeat(addrOf(o).length);
    };

    var parenthesize = function(s) {
        return Array.prototype.concat([LPAREN], s, [RPAREN]);
    };

    var _is_token = function(a) {
        return (a instanceof Array) && (a.length === 2);
    };

    var _is_lparen = function(a) {
        return _is_token(a) && (a[0] === LPAREN[0]) && (a[1] === LPAREN[1]);
    };

    var _is_rparen = function(a) {
        return _is_token(a) && (a[0] === RPAREN[0]) && (a[1] === RPAREN[1]);
    };

    var auto_paren = function(s) {
        var complex = s.length > 1;
        var has_paren = _is_lparen(s[0]) && _is_rparen(s[s.length - 1]);

        return (complex && !has_paren) ? parenthesize(s) : s;
    };

    // const uc_digits = [
    //     '\u2080',
    //     '\u2081',
    //     '\u2082',
    //     '\u2083',
    //     '\u2084',
    //     '\u2085',
    //     '\u2086',
    //     '\u2087',
    //     '\u2088',
    //     '\u2089'
    // ];
    //
    // var subscript = function(n) {
    //     var str_digit_to_uc_digit = function(d) {
    //         return uc_digits[d - 0];
    //     };
    //
    //     return n.toString().split('').map(str_digit_to_uc_digit).join('');
    // };

    /**
     * Transform an expression into a list of code tokens
     * @param {Expr} expr Expression to transform
     * @param {Expr} opt Conext-aware info (optional)
     * @returns {Array.<Token>} List of code tokens representing `expr`
     */
    CodeGen.prototype.emitExpression = function(expr, opt) {
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
            //             var cast_tok = [];
            //
            //             // prepend casting if variable size does not match the dereference size
            //             if (ptr.size !== uexpr.size) {
            //                 var cast = {
            //                     8: 'char*',
            //                    16: 'short*',
            //                    32: 'int*',
            //                    64: 'long long*'
            //                 }[uexpr.size];
            //
            //                 cast_tok = [LPAREN, [Tag.VARTYPE, cast], RPAREN, SPACE];
            //             }
            //
            //             // adjust index according to pointer arithmetic
            //             if (idx instanceof Expr.Val) {
            //                 idx.value = idx.value.div(uexpr.size / 8);
            //             }
            //
            //             return Array.prototype.concat(
            //                 cast_tok,
            //                 this.emitExpression(ptr),
            //                 [[Tag.PAREN, '[']], this.emitExpression(idx), [[Tag.PAREN, ']']]
            //             );
            //         }
            //     }
            // }

            return Array.prototype.concat(
                [op],
                auto_paren(this.emitExpression(uexpr.operands[0]))
            );
        };

        // emit a generic binary expression
        var _emit_bexpr = function(bexpr, op) {
            var p = bexpr.parent;
            var lhand = bexpr.operands[0];
            var rhand = bexpr.operands[1];

            var elements = Array.prototype.concat(
                this.emitExpression(lhand),
                [SPACE, op, SPACE],
                this.emitExpression(rhand)
            );

            if ((p instanceof Expr.Expr) && !(p instanceof Expr.Assign)) {
                elements = auto_paren(elements);
            }

            return elements;
        };

        // emit a generic ternary expression
        var _emit_texpr = function(texpr, op1, op2) {
            return Array.prototype.concat(
                this.emitExpression(texpr.operands[0]),
                [SPACE, op1, SPACE],
                this.emitExpression(texpr.operands[1]),
                [SPACE, op2, SPACE],
                this.emitExpression(texpr.operands[2])
            );
        };

        // emit a list of expressions delimited by a comma
        var _emit_expr_list = function(exprs) {
            var elements = [];

            if (exprs.length > 0) {
                Array.prototype.push.apply(elements, this.emitExpression(exprs[0]));

                for (var i = 1; i < exprs.length; i++) {
                    Array.prototype.push.apply(elements, [COMMA, SPACE]);
                    Array.prototype.push.apply(elements, this.emitExpression(exprs[i]));
                }
            }

            return parenthesize(elements);
        };

        if (expr instanceof Expr.Val) {
            var _p = expr.parent;

            // TODO: this causes even pointer displacements to be attempted for resolving.
            // need to find a better way to filter what needs to be resolved (derefs and fcall args..?)
            var str = this.xrefs.resolve_data(expr,
                (_p instanceof Expr.Deref) ||
                (_p instanceof Expr.Call));

            if (str) {
                return [[Tag.STRING, str]];
            }

            // most likely this is a mask value, display as hex
            if ((_p instanceof Expr.And) ||
                (_p instanceof Expr.Or) ||
                (_p instanceof Expr.Xor)) {
                opt.radix = 16;
            }

            // TODO: emit value in the appropriate format: dec, hex, signed, unsigned, ...
            return [[Tag.NUMBER, expr.toString(opt)]];
        }

        else if (expr instanceof Expr.Reg) {
            return [[Tag.VARNAME, expr.toString()]];
        }

        else if (expr instanceof Expr.UExpr) {
            var _uexpr_op = {
                'Deref'     : [Tag.OPRTOR, '*'],
                'AddressOf' : [Tag.OPRTOR, '&'],
                'Not'       : [Tag.OPRTOR, '~'],
                'Neg'       : [Tag.OPRTOR, '-'],
                'BoolNot'   : [Tag.OPRTOR, '!']
            }[tname] || [Tag.INVALID, expr.operator || tname];

            return _emit_uexpr.call(this, expr, _uexpr_op);
        }

        else if (expr instanceof Expr.BExpr) {
            var _bexpr_op = {
                'Assign' : [Tag.OPRTOR, '='],
                'Add'    : [Tag.OPRTOR, '+'],
                'Sub'    : [Tag.OPRTOR, '-'],
                'Mul'    : [Tag.OPRTOR, '*'],
                'Div'    : [Tag.OPRTOR, '/'],
                'Mod'    : [Tag.OPRTOR, '%'],
                'And'    : [Tag.OPRTOR, '&'],
                'Or'     : [Tag.OPRTOR, '|'],
                'Xor'    : [Tag.OPRTOR, '^'],
                'Shl'    : [Tag.OPRTOR, '<<'],
                'Shr'    : [Tag.OPRTOR, '>>'],
                'EQ'     : [Tag.OPRTOR, '=='],
                'NE'     : [Tag.OPRTOR, '!='],
                'LT'     : [Tag.OPRTOR, '<'],
                'GT'     : [Tag.OPRTOR, '>'],
                'LE'     : [Tag.OPRTOR, '<='],
                'GE'     : [Tag.OPRTOR, '>='],
                'BoolAnd': [Tag.OPRTOR, '&&'],
                'BoolOr' : [Tag.OPRTOR, '||']
            }[tname] || [Tag.INVALID, expr.operator || tname];

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
                                this.emitExpression(lhand),
                                [[Tag.OPRTOR, _inner_op.repeat(2)]]
                            );
                        }
    
                        // "x op= y"
                        return Array.prototype.concat(
                            this.emitExpression(lhand),
                            [SPACE, [Tag.OPRTOR, _inner_op + '='], SPACE],
                            this.emitExpression(inner_rhand)
                        );
                    }
                }

                // not a special case; stay with default token
            }

            return _emit_bexpr.call(this, expr, _bexpr_op);
        }

        else if (expr instanceof Expr.TExpr) {
            var _texpr_ops = {
                'TCond': [[Tag.OPRTOR, '?'], [Tag.OPRTOR, ':']]
            }[tname] || [[Tag.INVALID, expr.operator[0]], [Tag.INVALID, expr.operator[1]]];

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
                fname = this.xrefs.resolve_fname(fname) || fname;

                fcall = [[Tag.FNCALL, fname.toString()]];
            } else {
                fcall = this.emitExpression(fname);
            }

            return Array.prototype.concat(fcall, _emit_expr_list.call(this, args));
        }

        // Phi expressions are not expected here since SSA was already transfromed out, but this is here
        // for debugging and testing purposes
        else if (expr instanceof Expr.Phi) {
            return Array.prototype.concat([[Tag.INVALID, '\u03a6']], _emit_expr_list.call(this, expr.operands));
        }

        else if (expr instanceof Expr.Unknown) {
            var asm_line = [Tag.STRING, '"' + expr.line + '"'];

            return [[Tag.KEYWORD, '__asm'], SPACE].concat(parenthesize([asm_line]));
        }

        return [[Tag.INVALID, expr ? expr.toString() : expr]];
    };

    /**
     * Transform a statement and resiter it as a new line in the specified scope
     * @param {Statement} s Statement to transform
     * @param {CodeScope} scope Scope instance to add the new line to
     * @returns {CodeLine} Newly created line instance
     */
    CodeGen.prototype.emitStatement = function(s, scope) {
        console.assert(s);

        const addr = addrOf(s);
        var line;

        if (s instanceof Stmt.Branch) {
            line = scope.makeLine(addr);
            line.append([Tag.CFLOW, 'if']);
            line.append(SPACE);
            line.extend(this.emitExpression(s.cond));

            // line.append([Tag.CFLOW, 'branch']);            line.append(SPACE);
            // line.extend(this.emitExpression(s.cond));      line.append(SPACE);
            // line.append([Tag.PUNCT, '?']);                 line.append(SPACE);
            // line.extend(this.emitExpression(s.taken));     line.append(SPACE);
            // line.append([Tag.PUNCT, ':']);                 line.append(SPACE);
            // line.extend(this.emitExpression(s.not_taken)); line.append(SEMIC);
        }

        else if (s instanceof Stmt.Break) {
            line = scope.makeLine(addr);
            line.append([Tag.CFLOW, 'break']);
            line.append(SEMIC);
        }

        else if (s instanceof Stmt.Continue) {
            line = scope.makeLine(addr);
            line.append([Tag.CFLOW, 'continue']);
            line.append(SEMIC);
        }

        else if (s instanceof Stmt.DoWhile) {
            line = scope.makeLine(addr, [s.body]);
            line.append([Tag.CFLOW, 'do']);

            line = scope.makeLine(null);
            line.append([Tag.CFLOW, 'while']);                      line.append(SPACE);
            line.extend(parenthesize(this.emitExpression(s.cond))); line.append(SEMIC);
        }

        else if (s instanceof Stmt.Goto) {
            line = scope.makeLine(addr);
            line.append([Tag.CFLOW, 'goto']);         line.append(SPACE);
            line.extend(this.emitExpression(s.dest)); line.append(SEMIC);
        }

        else if (s instanceof Stmt.If) {
            line = scope.makeLine(addr, [s.then_cntr]);
            line.append([Tag.CFLOW, 'if']);
            line.append(SPACE);
            line.extend(parenthesize(this.emitExpression(s.cond)));

            if (s.else_cntr) {
                line = scope.makeLine(null, [s.else_cntr]);
                line.append([Tag.CFLOW, 'else']);
            }
        }

        else if (s instanceof Stmt.Return) {
            line = scope.makeLine(addr);
            line.append([Tag.CFLOW, 'return']);

            if (s.retval) {
                line.append(SPACE);
                line.extend(this.emitExpression(s.retval));
            }

            line.append(SEMIC);
        }

        else if (s instanceof Stmt.While) {
            line = scope.makeLine(addr, [s.body]);
            line.append([Tag.CFLOW, 'while']);
            line.append(SPACE);
            line.extend(parenthesize(this.emitExpression(s.cond)));
        }

        // generic statement
        else {
            s.expressions.forEach(function(expr) {
                line = scope.makeLine(addr);
                line.extend(this.emitExpression(expr));
                line.append(SEMIC);
            }, this);
        }

        return line;
    };

    /**
     * Transform a container and resiter it as a new scope in the specified listing
     * @param {Container} c Container to transform
     * @param {CodeListing} listing Listing instance to add the new scope to
     * @returns {CodeScope} Newly created scope instance
     */
    CodeGen.prototype.emitContainer = function(c, listing) {
        console.assert(c);

        var next = c.fallthrough && addrOf(c.fallthrough);
        var scope = listing.makeScope(addrOf(c), next);

        c.locals.forEach(function(v) {
            var vdecl = scope.makeLine(null);

            vdecl.extend([
                [Tag.VARTYPE, v.type], SPACE,
                [Tag.VARNAME, v.name], SEMIC
            ]);
        });

        c.statements.forEach(function(s) {
            this.emitStatement(s, scope);
        }, this);

        return scope;
    };

    /**
     * Transform function declaration info and register it in a special scope named 'entry'
     * @param {Function} f Function to transform
     * @param {CodeListing} listing Listing instance to add the 'entry' scope to
     * @returns {CodeLine} Newly created declaration line
     */
    CodeGen.prototype.emitDecl = function(f, listing) {
        var entry = listing.makeScope('entry');
        var decl = entry.makeLine(blanks(f), [f]);

        // emit function return type and name
        decl.extend([
            [Tag.VARTYPE, f.rettype], SPACE,
            [Tag.FNNAME, f.name]
        ]);

        decl.append(LPAREN);

        // emit arguments list
        if (f.args.length === 0) {
            decl.append([Tag.KEYWORD, 'void']);
        } else {
            var a = f.args[0];

            // handle first arg
            decl.extend([
                [Tag.VARTYPE, a.type], SPACE,
                [Tag.VARNAME, a.name]
            ]);

            // handle rest of the args
            f.args.slice(1).forEach(function(a) {
                decl.extend([
                    COMMA,                 SPACE,
                    [Tag.VARTYPE, a.type], SPACE,
                    [Tag.VARNAME, a.name]
                ]);
            });
        }

        decl.append(RPAREN);

        return decl;
    };

    /**
     * Transform a decompiled function IR into a JSON-friendly representation.
     * To produce readable output, use a Printer object of your choice
     * @param {Function} f Function to transform
     * @returns {Object} Subscriptable code listing object that indexes function's scopes
     * by their addresses. Function's entry scope is accessed by the 'entry' key
     */
    CodeGen.prototype.emitFunction = function(f) {
        console.assert(f);

        var listing = new CodeListing();

        this.emitDecl(f, listing);

        f.entry_block.container.locals = f.vars;

        f.containers.forEach(function(container) {
            this.emitContainer(container, listing);
        }, this);

        return listing.repr();
    };

    return CodeGen;
});
