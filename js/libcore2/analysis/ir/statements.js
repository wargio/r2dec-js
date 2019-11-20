/* 
 * Copyright (C) 2018-2019 elicn
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

 (function(){

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
     */

    /**
     * Statement abstract base class.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr[]} exprs List of expressions enclosed by this statement; usually just one
     * @param {Container[]} cntrs List of containers enclosed by this statement; may be empty
     * @returns {Statement}
     * @constructor
     */
    function Statement(addr, exprs, cntrs) {
        this.address = addr;
        this.parent = null;

        this.expressions = [];
        // this.statements = [];
        this.containers = [];

        exprs.forEach(this.push_expr, this);
        cntrs.forEach(this.push_cntr, this);
    }

    /**
     * Get the enclosing container of `this` to replace it with `other`.
     * @param {!Statement} other Replacement statement
     */
    Statement.prototype.replace = function(other) {
        var p = this.parent;
        var i = p.statements.indexOf(this);

        other.parent = p;
        p.statements[i] = other;
    };

    Statement.prototype.pluck = function(detach) {
        var p = this.parent;
        var i = p.statements.indexOf(this);

        if (detach) {
            this.containers.forEach(function(cntr) {
                cntr.pluck(detach);
            });
        }

        return p.statements.splice(i, 1);
    };

    /**
     * Enclose an existing expression inside `this`.
     * @param {Expr} expr An expression instance to add
     */
    Statement.prototype.push_expr = function(expr) {
        expr.parent = this;

        this.expressions.push(expr);
    };

    Statement.prototype.push_expr_after = function(expr, existing) {
        var idx = this.expressions.indexOf(existing);

        if (idx !== (-1)) {
            expr.parent = this;

            this.expressions.splice(idx, 0, expr);
        }
    };

    /**
     * Remove an expression from the expressions list.
     * @param {!Expr} expr Expression instance to remove
     * @returns {!Expr} The removed expression instance
     */
    Statement.prototype.remove_expr = function(expr) {
        this.expressions.splice(this.expressions.indexOf(expr), 1);
        expr.parent = undefined;

        if (this.expressions.length === 0) {
            this.pluck();
        }

        return expr;
    };

    Statement.prototype.replace_expr = function(old_expr, new_expr) {
        old_expr.parent = undefined;
        new_expr.parent = this;

        this.expressions[this.expressions.indexOf(old_expr)] = new_expr;

        return old_expr;
    };

    Statement.prototype.push_cntr = function(cntr) {
        if (cntr) {
            cntr.parent = this;
        
            this.containers.push(cntr);
        }
    };

    /**
     * Generate a deep copy of this.
     * @returns {!Statement}
     */
    Statement.prototype.clone = function() {
        var array_clone = function(arr) {
            return arr.map(function(elem) { return elem.clone(); });
        };

        var inst = Object.create(this.constructor.prototype);
        var cloned = this.constructor.apply(inst, [
            array_clone(this.expressions),
            array_clone(this.containers)
        ]);

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

        return ['0x' + this.address.toString(16), ':', exprs].join(' ');
    };

    // each Statement.* class defines its own accessors to the expressions it
    // contains: e.g. Statement.Return has a 'retval' accessor, that others do
    // not.
    // to be able to iterate over the included expressions regardless of the
    // specific instance of Statement, we use the 'expressions' member. to keep
    // the named accessors available, we map them to their corresponding elements
    // in the 'expressions' array. note that the included expressions may be
    // replaced (during simplification or propagations), so the accessors cannot
    // just return the expressions that were assigned to the object instance on
    // construction - they have to fetch them every time.
    //
    // this is a generic getter descriptor for the i-th expressions
    /**
     * 
     * @param {Object} obj Object to assign the accessor
     * @param {string} accname Accessor name
     * @param {number} i Corresponding index of the expression
     */
    var define_expr_property = function(obj, accname, i) {
        Object.defineProperty(obj, accname, {
            enumerable: true,
            get: function() {
                return this.expressions[i];
            }
        });
    };

    var define_cntr_property = function(obj, accname, i) {
        Object.defineProperty(obj, accname, {
            enumerable: true,
            get: function() {
                return this.containers[i];
            }
        });
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
        Statement.call(this, addr, [dst], []);

        define_expr_property(this, 'dest', 0);
    }

    Goto.prototype = Object.create(Statement.prototype);
    Goto.prototype.constructor = Goto;

    Goto.prototype.terminating = true;

    /** @override */
    Goto.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.dest.toString()
        ];

        return '[' + repr.join(' ') + ']';
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
        Statement.call(this, addr, [cond, taken, not_taken], []);

        define_expr_property(this, 'cond', 0);
        define_expr_property(this, 'taken', 1);
        define_expr_property(this, 'not_taken', 2);
    }

    Branch.prototype = Object.create(Statement.prototype);
    Branch.prototype.constructor = Branch;

    Branch.prototype.terminating = true;
    Branch.prototype.conditional = true;

    /** @override */
    Branch.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.taken.toString(),
            this.not_taken.toString()
        ];

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    /**
     * Conditional statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Expr} cond Condition expression
     * @param {Container} then_cntr The 'then' container
     * @param {Container} else_cntr The 'else' container
     * @returns {If}
     * @constructor
     */
    function If(addr, cond, then_cntr, else_cntr) {
        Statement.call(this, addr, [cond], [then_cntr, else_cntr]);

        define_expr_property(this, 'cond', 0);
        define_cntr_property(this, 'then_cntr', 0);
        define_cntr_property(this, 'else_cntr', 1);
    }

    If.prototype = Object.create(Statement.prototype);
    If.prototype.constructor = If;

    If.prototype.terminating = true;
    If.prototype.conditional = true;

    /** @override */
    If.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.then_cntr.toString()
        ];

        if (this.else_cntr) {
            repr.push(this.else_cntr.toString());
        }

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    /**
     * While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Expr} cond Condition expression
     * @param {Container} body The loop body container
     * @returns {While}
     * @constructor
     */
    function While(addr, cond, body) {
        Statement.call(this, addr, [cond], [body]);

        define_expr_property(this, 'cond', 0);
        define_cntr_property(this, 'body', 0);
    }

    While.prototype = Object.create(Statement.prototype);
    While.prototype.constructor = While;

    While.prototype.conditional = true;

    /** @override */
    While.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.body.toString()
        ];

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    /**
     * Do While-loop statement.
     * @param {!Long} addr Address of original assembly instruction
     * @param {Expr.Expr} cond Condition expression
     * @param {Container} body The loop body container
     * @returns {DoWhile}
     * @constructor
     */
    function DoWhile(addr, cond, body) {
        Statement.call(this, addr, [cond], [body]);

        define_expr_property(this, 'cond', 0);
        define_cntr_property(this, 'body', 0);
    }

    DoWhile.prototype = Object.create(Statement.prototype);
    DoWhile.prototype.constructor = DoWhile;

    DoWhile.prototype.conditional = true;

    /** @override */
    DoWhile.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.cond.toString(),
            this.body.toString()
        ];

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    /**
     * Break statement.
     * @param {!Long} addr Address of original assembly instruction
     * @returns {Break}
     * @constructor
     */
    function Break(addr) {
        Statement.call(this, addr, [], []);
    }

    Break.prototype = Object.create(Statement.prototype);
    Break.prototype.constructor = Break;

    Break.prototype.terminating = true;

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
        Statement.call(this, addr, [], []);
    }

    Continue.prototype = Object.create(Statement.prototype);
    Continue.prototype.constructor = Continue;

    Continue.prototype.terminating = true;

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
        Statement.call(this, addr, [expr], []);

        define_expr_property(this, 'retval', 0);
    }

    Return.prototype = Object.create(Statement.prototype);
    Return.prototype.constructor = Return;

    Return.prototype.terminating = true;

    /** @override */
    Return.prototype.toString = function() {
        var repr = [
            this.constructor.name
        ];

        if (this.retval) {
            repr.push(this.retval.toString());
        }

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    return {
        /**
         * Wrap an expression with a statement.
         * @param {!Long} addr Address of original assembly instruction
         * @param {Expr.Expr} expr Expression to wrap
         * @returns {Statement}
         */
        make_statement: function(addr, expr) {
            return expr instanceof Statement ? expr : new Statement(addr, [expr], []);
        },

        Return:     Return,
        Goto:       Goto,
        Branch:     Branch,
        If:         If,
        While:      While,
        DoWhile:    DoWhile,
        Break:      Break,
        Continue:   Continue
    };
});