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
     * This module defines IR expressions that are common to all architectures. Each
     * assembly instruction is translated into a list of one or more expressions, and
     * wrapped by a statement later on. Note that an architecture may define its own
     * dedicated expressions as well.
     *
     * Class hierarchy:
     *      Number              : a number literal
     *      Register            : a register literal
     *      Expr                : generic expression base class
     *          Asm
     *          Call
     *          Phi
     *
     *          UExpr           : unary expression base class
     *              Deref
     *              AddressOf
     *              Not
     *              Neg
     *
     *          BExpr           : binary expression base class
     *              Assign
     *              Add
     *              Sub
     *              Mul
     *              Div
     *              Mod
     *              And
     *              Or
     *              Xor
     *              Shl
     *              Shr
     *              EQ
     *              NE
     *              LT
     *              GT
     *              LE
     *              GE
     *              BoolAnd
     *              BoolOr
     *              BoolNot
     *
     *          TExpr           : ternary expression base class
     *              TCond
     */

    /**
     * Wraps a string with parenthesis.
     * @param {!string} s A string to wrap
     * @returns {!string} `s` wrapped by parenthesis
     */
    var parenthesize = function(s) {
        return '(' + s + ')';
    };

    // /**
    //  * Wraps a string with parenthesis only if it is complex.
    //  * @param {string} s A string to wrap
    //  * @returns {string} `s` wrapped by parenthesis if `s` is a complex string, and `s` otherwise
    //  */
    // var autoParen = function(s) {
    //     return (s.indexOf(' ') > (-1) ? parenthesize(s) : s);
    // };

    // ------------------------------------------------------------

    /**
     * System register.
     * @param {!string} name Register name
     * @param {number} size Register size in bits
     * @constructor
     */
    function Register(name, size) {
        // TODO: registers should be denoted by an enumeration rather than a name, since some
        // registers contain other, e.g. ax == eax == rax

        /** @type {!string} */
        this.name = name;

        /** @type {!number} */
        this.size = size || 0;

        /** @type {number} */
        this.idx = undefined;
    }

    /** @returns {Array} */
    Register.prototype.iter_operands = function() {
        return [];
    };

    /** @returns {boolean} */
    Register.prototype.equals = function(other) {
        return ((other instanceof Register) &&
            (this.name === other.name) &&
            (this.size === other.size) &&
            (this.idx === other.idx));
    };

    /** @returns {boolean} */
    Register.prototype.like = function(other) {
        return ((other instanceof Register) &&
            (this.name === other.name) &&
            (this.size === other.size));
    };

    /** @returns {!Register} */
    Register.prototype.clone = function() {
        return Object.create(this);
    };

    /** @returns {string} */
    Register.prototype.toString = function(opt) {
        var subscript = this.idx == undefined ? '' : '.' + this.idx.toString(10);

        return this.name.toString() + subscript;
    };

    // ------------------------------------------------------------

    /**
     * Literal value.
     * @param {!number|!Long} value Numeric value
     * @param {number} size Value size in bits
     * @constructor
     */
    function Value(value, size) {
        /** @type {!number} */
        this.value = value;

        /** @type {!number} */
        this.size = size || 0;
    }

    /** @returns {Array} */
    Value.prototype.iter_operands = function() {
        return [];
    };

    /** @returns {boolean} */
    Value.prototype.equals = function(other) {
        return ((other instanceof Value) &&
            (this.value == other.value) &&
            (this.size === other.size));    // TODO: should we be bothered about matching sizes?
    };

    /** @returns {!Value} */
    Value.prototype.clone = function() {
        return Object.create(this);
    };

    // /**
    //  * Get string representation of `this` in a human readable form.
    //  * @returns {string} Human readable string
    //  */
    // Value.prototype.toReadableString = function() {
    //     var n = this.value;
    //     var size = this.size;

    //     // TODO: adjust comparisons to Long's?

    //     // an index or small offset?
    //     if (n < 32)
    //     {
    //         return n.toString();
    //     }

    //     // TODO: consider adding a comment next to the immediate value instead of
    //     // tranfroming it into a character - which is not always desirable

    //     // an ascii character?
    //     if ((size == 8) && (n >= 32) && (n <= 126)) {
    //         return "'" + String.fromCharCode(n) + "'";
    //     }

    //     // -1 ?
    //     if (((size ==  8) && (n == 0xff)) ||
    //         ((size == 16) && (n == 0xffff)) ||
    //         ((size == 32) && (n == 0xffffffff)) ||
    //         ((size == 64) && (n == Long.MAX_UNSIGNED_VALUE))) {
    //             return '-1';
    //     }

    //     // default: return hexadecimal representation
    //     return '0x' + n.toString(16);
    // };

    /** @returns {string} */
    Value.prototype.toString = function() {
        // TODO: this implementation serves as a temporary workaround. value
        // should be emitted according to the context it appears in
        var radix;

        if (typeof(this.value) === 'number') {
            radix = (this.value > (-32) && this.value < 32) ? 10 : 16;
        } else {
            radix = (this.value.gt(-32) && this.value.lt(32)) ? 10 : 16;
        }

        return (radix === 16? '0x' : '') + this.value.toString(radix);
    };

    // ------------------------------------------------------------

    /**
     * Expression base class.
     * This class is abstract and meant to be only inherited, not instantiated.
     * @param {string} operator An operator token
     * @param {Array.<Expr|Register|Value>} operands An array of expressions instances
     * @constructor
     */
    function Expr(operator, operands) {
        this.operator = operator;
        this.operands = [];

        // set this as parent for all operands it got
        operands.forEach(this.push_operand, this);

        this.is_def = false;    // ssa: is a definition?
        this.idx = undefined;   // ssa: subscript index

        this.parent = [undefined, undefined];
    }

    /**
     * Perform a deep iteratation over expression's operands, from left to right.
     * @param {boolean} depth_first Whether predecessors' operands should be emitted before this'
     * @returns {!Array<Expr>}
     */
    Expr.prototype.iter_operands = function(depth_first) {
        // TODO: sadly Duktape does not support the function* and yield* keywords so
        // this is not a true generator, rather it is just a list.

        var depth = this.operands.map(function(o) {
            return o.iter_operands(depth_first);
        });

        return Array.prototype.concat.apply([],
            depth_first
            ? depth.concat(this.operands)
            : this.operands.concat(depth));
    };

    Expr.prototype.push_operand = function(op) {
        op.parent = [this, this.operands.length];

        this.operands.push(op);
    };

    /**
     * Have parent replace `this` expression with `other`
     * @param {!Expr} other Replacement expression
     */
    Expr.prototype.replace = function(other) {
        var p = this.parent[0]; // parent object
        var i = this.parent[1]; // operand index at parent's

        other.parent = this.parent;
        p.operands[i] = other;  // TODO: 'operands' when parent is expr, but 'expressions' when parent is stmt
    };

    /**
     * Query whether this object equals to another.
     * @param {Expr} other Another object to compare with
     * @returns {boolean} `true` iff this and other are equal in operators and operands, `false` otherwise
     */
    Expr.prototype.equals = function(other) {
        var eq = (other &&
            (this.operator === other.operator) &&
            (this.operands.length === other.operands.length));

        for (var i = 0; eq && (i < this.operands.length); i++) {
            eq &= (this.operands[i].equals(other.operands[i]));
        }

        return eq;
    };

    /**
     * Generate a deep copy of `this`.
     * @returns {!Expr}
     */
    Expr.prototype.clone = function() {
        var inst = Object.create(this.constructor.prototype);
        var cloned = this.constructor.apply(inst, this.operands.map(function(op) { return op.clone(); }));

        return ((cloned !== null) && (typeof cloned === 'object')) ? cloned : inst;
    };

    /** [!] This abstract method must be implemented by the inheriting class */
    Expr.prototype.toString = function() {
        throw new Error('not implemented');
    };

    // ------------------------------------------------------------

    /**
     * Function call.
     * @param {Expr} name Callee name
     * @param {Array.<Expr>} args Array of function call arguments
     * @constructor
     */
    function Call(name, args) {
        Expr.call(this, name, args);

        // TODO: callee name stored in this.operator is in fact an expr, and not
        // a plain string, like everywhere else. callee name should be resolved
    }

    Call.prototype = Object.create(Expr.prototype);
    Call.prototype.constructor = Call;

    Call.prototype.toString = function(opt) {
        var args = this.operands.map(function(a) {
            return a.toString(opt);
        });

        return this.operator + parenthesize(args.join(', '));
    };

    // ------------------------------------------------------------

    /**
     * Phi expression: used for SSA stage, and eliminated afterwards.
     * @constructor
     */
    function Phi() {
        Expr.call(this, '\u03a6', Array.from(arguments));
    }

    Phi.prototype = Object.create(Expr.prototype);
    Phi.prototype.constructor = Phi;

    Phi.prototype.toString = function(opt) {
        var args = this.operands.map(function(a) {
            return a.toString(opt);
        });

        return this.operator + parenthesize(args.join(', '));
    };

    // ------------------------------------------------------------

    /**
     * A raw assembly line. This is a phony expression since its operand is
     * a mere string and not an expression. It cannot be analyzed any further and
     * most likely to break SSA analysis.
     * @constructor
     */
    function Asm(line) {
        Expr.call(this, '__asm', []);

        this.line = line;
    }

    Asm.prototype = Object.create(Expr.prototype);
    Asm.prototype.constructor = Asm;

    Asm.prototype.toString = function() {
        return '__asm ("' + this.line + '")';
    };

    // ------------------------------------------------------------

    /**
     * Unary expression base class.
     * @param {string} operator An operator token
     * @param {Expr|Register|Value} operand1 1st operand expression
     * @constructor
     */
    function UExpr(operator, operand1) {
        Expr.call(this, operator, [operand1]);
    }

    UExpr.prototype = Object.create(Expr.prototype);
    UExpr.prototype.constructor = UExpr;

    /** @override */
    UExpr.prototype.toString = function(opt) {
        return this.operator + this.operands[0].toString(opt);
    };

    // ------------------------------------------------------------

    /**
     * Binary expression base class.
     * @param {string} operator An operator token
     * @param {Expr|Register|Value} operand1 1st operand expression
     * @param {Expr|Register|Value} operand2 2nd operand expression
     * @constructor
     */
    function BExpr(operator, operand1, operand2) {
        Expr.call(this, operator, [operand1, operand2]);
    }

    BExpr.prototype = Object.create(Expr.prototype);
    BExpr.prototype.constructor = BExpr;

    /** @override */
    BExpr.prototype.toString = function(opt) {
        return [
            this.operands[0].toString(opt),
            this.operator,
            this.operands[1].toString(opt)
        ].join(' ');
    };

    // ------------------------------------------------------------

    /**
     * Ternary expression base class.
     * @param {string} operator1 1st operator token
     * @param {string} operator2 2nd operator token
     * @param {Expr|Register|Value} operand1 1st operand expression
     * @param {Expr|Register|Value} operand2 2nd operand expression
     * @param {Expr|Register|Value} operand3 3rd operand expression
     * @constructor
     */
    function TExpr(operator1, operator2, operand1, operand2, operand3) {
        Expr.call(this, [operator1, operator2], [operand1, operand2, operand3]);
    }

    TExpr.prototype = Object.create(Expr.prototype);
    TExpr.prototype.constructor = TExpr;

    /** @override */
    TExpr.prototype.toString = function(opt) {
        return [
            this.operands[0].toString(opt),
            this.operator[0],
            this.operands[1].toString(opt),
            this.operator[1],
            this.operands[2].toString(opt)
        ].join(' ');
    };

    // ------------------------------------------------------------

    // assignment
    function Assign(lhand, rhand) {
        BExpr.call(this, '=', lhand, rhand);

        lhand.is_def = true;
    }

    Assign.prototype = Object.create(BExpr.prototype);
    Assign.prototype.constructor = Assign;

    /** @override */
    Assign.prototype.toString = function(opt) {
        var lhand = this.operands[0];
        var rhand = this.operands[1];

        // there are three special cases where assignments should be displayed diffreently:
        //  x = x op y  -> x op= y
        //  x = x + 1   -> x++
        //  x = x - 1   -> x--

        // "x = x op y"
        if ((rhand instanceof BExpr) && (lhand.equals(rhand.operands[0]))) {
            // "x = x op 1"
            if (rhand.operands[1].equals(new Value(1, lhand.size))) {
                // x = x +/- 1
                if ((rhand instanceof Add) || (rhand instanceof Sub)) {
                    // x++ / x--
                    return lhand.toString() + rhand.operator.repeat(2);
                }
            }

            // "x op= y"
            return [
                this.operands[0].toString(opt),
                rhand.operator + this.operator,
                rhand.operands[1].toString(opt)
            ].join(' ');
        }

        // not a speaicl case? use super's toString result
        return Object.getPrototypeOf(Object.getPrototypeOf(this)).toString.call(this, opt);
    };

    // ------------------------------------------------------------

    // unary expressions
    function Not       (op) { UExpr.call(this, '-', op); }
    function Neg       (op) { UExpr.call(this, '~', op); }
    function Deref     (op) { UExpr.call(this, '*', op); }
    function AddressOf (op) { UExpr.call(this, '&', op); }

    Not.prototype       = Object.create(UExpr.prototype);
    Neg.prototype       = Object.create(UExpr.prototype);
    Deref.prototype     = Object.create(UExpr.prototype);
    AddressOf.prototype = Object.create(UExpr.prototype);

    Not.prototype.constructor = Not;
    Neg.prototype.constructor = Neg;
    Deref.prototype.constructor = Deref;
    AddressOf.prototype.constructor = AddressOf;

    // binary expressions
    function Add (op1, op2) { BExpr.call(this, '+',  op1, op2); }
    function Sub (op1, op2) { BExpr.call(this, '-',  op1, op2); }
    function Mul (op1, op2) { BExpr.call(this, '*',  op1, op2); }
    function Div (op1, op2) { BExpr.call(this, '/',  op1, op2); }
    function Mod (op1, op2) { BExpr.call(this, '%',  op1, op2); }
    function And (op1, op2) { BExpr.call(this, '&',  op1, op2); }
    function Or  (op1, op2) { BExpr.call(this, '|',  op1, op2); }
    function Xor (op1, op2) { BExpr.call(this, '^',  op1, op2); }
    function Shl (op1, op2) { BExpr.call(this, '<<', op1, op2); }
    function Shr (op1, op2) { BExpr.call(this, '>>', op1, op2); }

    Add.prototype = Object.create(BExpr.prototype);
    Sub.prototype = Object.create(BExpr.prototype);
    Mul.prototype = Object.create(BExpr.prototype);
    Div.prototype = Object.create(BExpr.prototype);
    Mod.prototype = Object.create(BExpr.prototype);
    And.prototype = Object.create(BExpr.prototype);
    Or.prototype  = Object.create(BExpr.prototype);
    Xor.prototype = Object.create(BExpr.prototype);
    Shl.prototype = Object.create(BExpr.prototype);
    Shr.prototype = Object.create(BExpr.prototype);

    Add.prototype.constructor = Add;
    Sub.prototype.constructor = Sub;
    Mul.prototype.constructor = Mul;
    Div.prototype.constructor = Div;
    Mod.prototype.constructor = Mod;
    And.prototype.constructor = And;
    Or.prototype.constructor  = Or;
    Xor.prototype.constructor = Xor;
    Shl.prototype.constructor = Shl;
    Shr.prototype.constructor = Shr;

    // ternary expressions
    function TCond (op1, op2, op3) { TExpr.call(this, '?', ':', op1, op2, op3); }

    TCond.prototype = Object.create(TExpr.prototype);

    // boolean expressions
    function BoolAnd (expr1, expr2) { BExpr.call(this, '&&', expr1, expr2); }
    function BoolOr  (expr1, expr2) { BExpr.call(this, '||', expr1, expr2); }
    function BoolNot (expr) { UExpr.call(this, '!', expr); }

    BoolAnd.prototype = Object.create(BExpr.prototype);
    BoolOr.prototype  = Object.create(BExpr.prototype);
    BoolNot.prototype = Object.create(UExpr.prototype);

    BoolAnd.prototype.constructor = BoolAnd;
    BoolOr.prototype.constructor = BoolOr;
    BoolNot.prototype.constructor = BoolNot;

    // comparisons
    function EQ (expr1, expr2) { BExpr.call(this, '==', expr1, expr2); }
    function NE (expr1, expr2) { BExpr.call(this, '!=', expr1, expr2); }
    function GT (expr1, expr2) { BExpr.call(this, '>',  expr1, expr2); }
    function LT (expr1, expr2) { BExpr.call(this, '<',  expr1, expr2); }
    function GE (expr1, expr2) { BExpr.call(this, '>=', expr1, expr2); }
    function LE (expr1, expr2) { BExpr.call(this, '<=', expr1, expr2); }

    EQ.prototype = Object.create(BExpr.prototype);
    NE.prototype = Object.create(BExpr.prototype);
    GT.prototype = Object.create(BExpr.prototype);
    LT.prototype = Object.create(BExpr.prototype);
    GE.prototype = Object.create(BExpr.prototype);
    LE.prototype = Object.create(BExpr.prototype);

    EQ.prototype.constructor = EQ;
    NE.prototype.constructor = NE;
    GT.prototype.constructor = GT;
    LT.prototype.constructor = LT;
    GE.prototype.constructor = GE;
    LE.prototype.constructor = LE;

    return {
        // abstract base classes: use only to define arch-spoecific exprs
        UExpr:  UExpr,
        BExpr:  BExpr,
        TExpr:  TExpr,

        // ssa phi instruction
        Phi:    Phi,

        // common expressions
        Reg:    Register,
        Val:    Value,
        Deref:  Deref,
        AddrOf: AddressOf,
        Not:     Not,
        Neg:     Neg,
        Assign: Assign,
        Add:     Add,
        Sub:     Sub,
        Mul:     Mul,
        Div:     Div,
        Mod:     Mod,
        And:     And,
        Or:      Or,
        Xor:     Xor,
        Shl:     Shl,
        Shr:     Shr,
        EQ:      EQ,
        NE:      NE,
        LT:      LT,
        GT:      GT,
        LE:      LE,
        GE:      GE,
        Call:    Call,
        TCond:   TCond,
        BoolAnd: BoolAnd,
        BoolOr:  BoolOr,
        BoolNot: BoolNot,
        Unknown: Asm
    };
})();