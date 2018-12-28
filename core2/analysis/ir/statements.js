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
     * This module defines IR statements that are common to all architectures. Each
     * generated expression is wrapped in a Statement, and each statement belongs to
     * a Container (i.e. a logical scope).
     *
     * Class hierarchy:
     *      Statement       : generic statement base class
     *          Branch      : conditional jump; would be translted into an "If"
     *          Goto        : an unconditional jump
     *          If
     *          While
     *          DoWhile
     *          Break
     *          Continue
     *          Return
     *
     *      Container       : container (scope) class
     */

    /**
     * Statement abstract base class.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr[]} exprs List of expressions enclosed by this statement; usually just one
     * @returns {Statement}
     * @constructor
     */
    function Statement(addr, exprs) {
        var _this = this;

        /** @type {!number} */
        this.addr = addr;

        // the operands array proxy sets this as parent for all assigned expressions.
        // this comes handy when an operand is being replaced as well

        /** @type {Array>} */
        this.expressions = new Proxy([], {
            set: function(obj, idx, val) {
                val.parent = [_this, idx];

                // keep the default behavior
                obj[idx] = val;
                return true;
            }
        });

        // set this as parent for all expressions it gets
        Array.prototype.push.apply(this.expressions, exprs);

        // /** @type {Array>} */
        // this.expressions = [];
        //
        // set this as a parent to all enclosed expressions
        // exprs.forEach(this.push_expr, this);

        /** @type {Array} */
        this.statements = [];
    }

    /**
     * Get the enclosing container of `this` to replace it with `other`.
     * @param {!Statement} other Replacement statement
     */
    Statement.prototype.replace = function(other) {
        var p = this.container;
        var i = p.statements.indexOf(this);

        other.container = p;
        p.statements[i] = other;
    };

    Statement.prototype.pluck = function() {
        var p = this.container;
        var i = p.statements.indexOf(this);

        return p.statements.splice(i, 1);
    };

    // /**
    //  * Enclose an existing expression inside `this`.
    //  * @param {Expr} expr An expression instance to add
    //  */
    // Statement.prototype.push_expr = function(expr) {
    //     expr.parent = [this, this.expressions.length];
    //
    //     this.expressions.push(expr);
    // };

    /**
     * Generate a deep copy of this.
     * @returns {!Statement}
     */
    Statement.prototype.clone = function() {
        var inst = Object.create(this.constructor.prototype);
        var cloned = this.constructor.apply(inst, this.expressions.map(function(expr) { return expr.clone(); }));

        return ((cloned !== null) && (typeof cloned === 'object')) ? cloned : inst;
    };

    /**
     * Generate a string representation of this
     * @returns {!string}
     */
    Statement.prototype.toString = function() {
        var exprs = this.expressions.map(function(e) {
            return e.toString();
        }).join('\n');

        return ['0x' + this.addr.toString(16), ':', exprs].join(' ');
    };

    // ------------------------------------------------------------

    /**
     * Goto statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Val} dst Jump destination
     * @returns {Goto}
     * @constructor
     */
    function Goto(addr, dst) {
        Statement.call(this, addr, [dst]);

        this.dest = dst;
    }

    Goto.prototype = Object.create(Statement.prototype);
    Goto.prototype.constructor = Goto;

    /** @override */
    Goto.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.dest.toString()
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * Conditional jump statement.
     * This is usually replaced by an 'if' statement later on.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Expr} cond Condition expression
     * @param {Expr.Val} taken Jump destination if condition holds
     * @param {Expr.Val} not_taken Jump destination if condition does not hold
     * @returns {Branch}
     * @constructor
     */
    function Branch(addr, cond, taken, not_taken) {
        Statement.call(this, addr, [cond, taken, not_taken]);

        this.cond = cond;
        this.taken = taken;
        this.not_taken = not_taken;
    }

    Branch.prototype = Object.create(Statement.prototype);
    Branch.prototype.constructor = Branch;

    /** @override */
    Branch.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.taken.toString(),
            this.not_taken.toString()
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * Conditional statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} then_cntr The 'then' container
     * @param {Container} else_cntr The 'else' container
     * @returns {If}
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
    If.prototype.constructor = If;

    /** @override */
    If.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.then_cntr.toString(),
            this.else_cntr.toString()
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} body The loop body container
     * @returns {While}
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
    While.prototype.constructor = While;

    /** @override */
    While.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.body.toString()
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * Do While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr._expr} cond Condition expression
     * @param {Container} body The loop body container
     * @returns {DoWhile}
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
    DoWhile.prototype.constructor = DoWhile;

    /** @override */
    DoWhile.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.body.toString()
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * Break statement.
     * @param {!Long} addr Address of original assembly instruction
     * @returns {Break}
     * @constructor
     */
    function Break(addr) {
        Statement.call(this, addr, []);
    }

    Break.prototype = Object.create(Statement.prototype);
    Break.prototype.constructor = Break;

    /** @override */
    Break.prototype.toString = function() {
        return '[' + this.constructor.name + ']';
    };

    // ------------------------------------------------------------

    /**
     * Continue statement.
     * @param {!Long} addr Address of original assembly instruction
     * @returns {continue}
     * @constructor
     */
    function Continue(addr) {
        Statement.call(this, addr, []);
    }

    Continue.prototype = Object.create(Statement.prototype);
    Continue.prototype.constructor = Continue;

    /** @override */
    Continue.prototype.toString = function() {
        return '[' + this.constructor.name + ']';
    };

    // ------------------------------------------------------------

    /**
     * Return statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Expr} expr Expression returned, could be undefined
     * @returns {Return}
     * @constructor
     */
    function Return(addr, expr) {
        Statement.call(this, addr, [expr]);

        this.retval = expr;
    }

    Return.prototype = Object.create(Statement.prototype);
    Return.prototype.constructor = Return;

    /** @override */
    Return.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.retval ? this.retval.toString(): ''
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    /**
     * Container class. Encloses a list of consecutive statements that serve as one
     * logical block, e.g. a loop body or an 'if' body.
     * @param {number|Long} addr Scope starting address
     * @param {Array.<Statement>} stmts List of enclosed statements
     * @returns {Container}
     * @constructor
     */
    function Container(addr, stmts) {
        var _this = this;

        this.address = addr;

        /** @type {Array>} */
        this.statements = new Proxy([], {
            set: function(obj, idx, val) {
                val.parent = _this;

                // keep the default behavior
                obj[idx] = val;
                return true;
            }
        });

        // set this as parent for all statements it gets
        Array.prototype.push.apply(this.statements, stmts);

        // this.statements = [];
        // 
        // // set this as the container of all statements enclosed in the block
        // stmts.forEach(this.push_stmt, this);
    }

    // Container.prototype.push_stmt = function(stmt) {
    //     stmt.container = this;
    //
    //     this.statements.push(stmt);
    // };

    /**
     * Generate a deep copy of this.
     * @returns {!Container}
     */
    Container.prototype.clone = function() {
        var inst = Object.create(this.constructor.prototype);
        var cloned = this.constructor.apply(inst, this.statements.map(function(stmt) { return stmt.clone(); }));

        return ((cloned !== null) && (typeof cloned === 'object')) ? cloned : inst;
    };

    Container.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.address.toString(16)
        ].join(' ');

        return '[' + repr + ']';
    };

    // ------------------------------------------------------------

    return {
        /**
         * Turn an expression into a statement.
         * @param {!Long} addr Address of original assembly instruction
         * @param {Expr.Expr} expr Expression to turn into a statement
         * @returns {Statement}
         */
        make_statement: function(addr, expr) {
            return expr instanceof Statement ? expr : new Statement(addr, [expr]);
        },

        Statement:  Statement,

        Return:     Return,
        Goto:       Goto,
        Branch:     Branch,
        If:         If,
        While:      While,
        DoWhile:    DoWhile,
        Break:      Break,
        Continue:   Continue,

        Container:  Container
    };
})();