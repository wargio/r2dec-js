/* 
 * Copyright (C) 2018 elicn
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

module.exports = (function() {
    /**
     * Statement abstract base class.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Array} exprs List of expressions enclosed by this statement; usually just one
     * @constructor
     */
    function Statement(addr, exprs) {
        /** @type {!number} */
        this.addr = addr;

        /** @type {Array>} */
        this.expressions = exprs || [];

        // set this as a parent to all enclosed expressions
        this.expressions.forEach(function(e, i) {
            e.parent = [this, i];
        }, this);

        /** @type {Array} */
        this.statements = [];
    }

    /**
     * Generate a deep copy of this.
     * @returns {!Statement}
     */
    Statement.prototype.clone = function() {
        return Object.create(this, {
            'expressions': {
                value: this.expressions.map(function(e) { return e.clone(); })
            }
        });
    };

    /**
     * Generate a string representation of this
     * @returns {!string}
     */
    Statement.prototype.toString = function(opt) {
        var exprs = this.expressions.map(function(e) {
            return e.toString(opt);
        }).join('\n');

        return ['0x' + this.addr.toString(16), ':', exprs].join(' ');
    };

    // ------------------------------------------------------------

    /**
     * Goto statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.val} dst Jump destination
     * @constructor
     */
    function Goto(addr, dst) {
        Statement.call(this, addr, [dst]);

        this.dest = dst;
    }

    Goto.prototype = Object.create(Statement.prototype);

    Goto.prototype.toString = function(opt) {
        return ['goto', this.dest.toString(opt)].join(' ');
    };

    // ------------------------------------------------------------

    /**
     * Conditional jump statement.
     * This is usually replaced by an 'if' statement later on.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Expr.val} taken Jump destination if condition holds
     * @param {Expr.val} not_taken Jump destination if condition does not hold
     * @constructor
     */
    function Branch(addr, cond, taken, not_taken) {
        Statement.call(this, addr, [cond, taken, not_taken]);

        this.cond = cond;
        this.taken = taken;
        this.not_taken = not_taken;
    }

    Branch.prototype = Object.create(Statement.prototype);

    Branch.prototype.toString = function(opt) {
        return [
            'if', this.cond.toString(opt),
            'goto', this.taken.toString(opt),
            'else',
            'goto', this.not_taken.toString(opt)
        ].join(' ');
    };

    // ------------------------------------------------------------

    /**
     * Conditional statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} then_cntr The 'then' container
     * @param {Container} else_cntr The 'else' container
     * @constructor
     */
    function If(addr, cond, then_cntr, else_cntr) {
        Statement.call(this, addr, [cond]);

        this.cond = cond;
        this.then_cntr = then_cntr;
        this.else_cntr = else_cntr;

        this.statements = Array.prototype.concat(
                this.then_cntr.statements,
                this.else_cntr
                    ? this.else_cntr.statements
                    : []);

        this.containers = Array.prototype.concat(
            [this.then_cntr],
            this.else_cntr
                ? [this.else_cntr]
                : []);
    }

    If.prototype = Object.create(Statement.prototype);

    If.prototype.toString = function(opt) {
        var cond = ['if', '(' + this.cond_expr.toString(opt) + ')'].join(' ');
        var then_blk = ['{', this.then_cntr.toString(opt), '}'].join('\n');
        var else_blk = this.else_cntr
            ? ['else', '{', this.else_cntr.toString(opt), '}'].join('\n')
            : '';
        return [cond, then_blk, else_blk].join('\n');
    };

    // ------------------------------------------------------------

    /**
     * While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} body The loop body container
     * @constructor
     */
    function While(addr, cond, body) {
        Statement.call(this, addr, [cond]);

        this.cond = cond;
        this.body = body;

        this.statements = body.statements;
        this.containers = [body];
    }

    While.prototype = Object.create(Statement.prototype);

    While.prototype.toString = function(opt) {
        // TODO: implement this
    };

    // ------------------------------------------------------------

    /**
     * Do While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} body The loop body container
     * @constructor
     */
    function DoWhile(addr, cond, body) {
        Statement.call(this, addr, [cond]);

        this.cond = cond;
        this.body = body;

        this.statements = body.statements;
        this.containers = [body];
    }

    DoWhile.prototype = Object.create(Statement.prototype);

    DoWhile.prototype.toString = function(opt) {
        // TODO: implement this
    };

    // ------------------------------------------------------------

    /**
     * Break statement.
     * @param {!Long} addr Address of original assembly instruction
     * @constructor
     */
    function Break(addr) {
        Statement.call(this, addr, []);
    }

    Break.prototype = Object.create(Statement.prototype);

    Break.prototype.toString = function() {
        return 'break';
    };

    // ------------------------------------------------------------

    /**
     * Continue statement.
     * @param {!Long} addr Address of original assembly instruction
     * @constructor
     */
    function Continue(addr) {
        Statement.call(this, addr, []);
    }

    Continue.prototype = Object.create(Statement.prototype);

    Continue.prototype.toString = function() {
        return 'continue';
    };

    // ------------------------------------------------------------

    /**
     * Return statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} expr Expression returned
     * @constructor
     */
    function Return(addr, expr) {
        Statement.call(this, addr, [expr]);
    }

    Return.prototype = Object.create(Statement.prototype);

    Return.prototype.toString = function(opt) {
        return ['return', this.expressions[0].toString(opt)].join(' ').trim();
    };

    // ------------------------------------------------------------

    /**
     * Container class. Encloses a list of consecutive statements that serve as once
     * logical block, e.g. a loop body or an 'if' body.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} expr Expression returned
     * @constructor
     */
    function Container(block, stmts) {
        this.block = block;
        this.statements = stmts || [];

        // set this as the container of all statements enclosed in the block
        this.statements.forEach(function(stmt) {
            stmt.container = this;
        }, this);
    }

    /**
     * Generate a deep copy of this.
     * @returns {!Container}
     */
    Container.prototype.clone = function() {
        return Object.create(this, {
            'statements': {
                value: this.statements.map(function(s) { return s.clone(); })
            }
        });
    };

    // ------------------------------------------------------------

    return {
        /**
         * Turn an expression into a statement.
         * @param {!Long} addr Address of original assembly instruction
         * @param {Expr._expr} expr Expression to turn into a statement
         * @returns {Statement}
         */
        make_statement: function(addr, expr) {
            return expr instanceof Statement ? expr : new Statement(addr, [expr]);
        },

        Container:  Container,
        Return:     Return,
        Goto:       Goto,
        Branch:     Branch,
        If:         If,
        While:      While,
        DoWhile:    DoWhile,
        Break:      Break,
        Continue:   Continue,
    };
})();