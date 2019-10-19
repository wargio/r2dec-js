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

 module.exports = (function() {
    const Long = require('libdec/long');

    /**
     * This module defines IR expressions that are common to all architectures. Each
     * assembly instruction is translated into a list of one or more expressions, and
     * wrapped by a statement later on. Note that an architecture may define its own
     * dedicated expressions as well.
     *
     * Class hierarchy:
     *      Literal             : generic literal base class
     *          Value
     *          Register
     *          Variable
     *
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

    /**
     * Wraps a string with quotation marks.
     * @param {!string} s A string to wrap
     * @returns {!string} `s` wrapped by quotation marks
     */
    var quote = function(s) {
        return '"' + s + '"';
    };

    // unicode subscript digits
    const _uc_digits = [
        '\u2080',
        '\u2081',
        '\u2082',
        '\u2083',
        '\u2084',
        '\u2085',
        '\u2086',
        '\u2087',
        '\u2088',
        '\u2089'
    ];

    // returns the unicode subscript representation of a number
    var subscript = function(n) {
        var str_digit_to_uc_digit = function(d) {
            return _uc_digits[d - 0];
        };

        return n.toString().split('').map(str_digit_to_uc_digit).join('');
    };

    var detach_user = function(u) {
        if (u.def !== undefined) {
            var ulist = u.def.uses;

            // remove user from definition's users list
            ulist.splice(ulist.indexOf(u), 1);

            // detach user from definition
            u.def = undefined;
        }
    };

    // ------------------------------------------------------------

	function Literal() {
        // empty constructor
	}

    /** 
     * By definition, literals have no operands.
     * @returns {Array} An array containing a single item, which is `this`
     */
    Literal.prototype.iter_operands = function() {
        return [this];
    };

    /**
     * Have parent replace `this` literal with `other`
     * @param {(!Expr|!Literal)} other Replacement literal
     * @returns {!Literal} Replaced literal
     */
    Literal.prototype.replace = function(other) {
        var p = this.parent;
        var func = p.replace_operand || p.replace_expr;
        var args = [this, other];

        detach_user(this);

        return func.apply(p, args);
    };

    /**
     * Have parent pluck `this` literal. The plucked literal could be
     * then inserted to another parent, or simply discarded.
     * @param {boolean} detach Whether to detach `this` from users list
     * @returns {!Literal} `this`
     */
    Literal.prototype.pluck = function(detach) {
        var p = this.parent;
        var func = p.remove_operand || p.remove_expr;
        var args = [this];

        if (detach) {
			detach_user(this);
        }

        return func.apply(p, args);
    };

    /**
     * Ascend the parents tree to locate the enclosing Statement.
     * @returns {!Statement} Parent statement instance
     */
    Literal.prototype.parent_stmt = function() {
        var o = this.parent;

        while (o instanceof Expr) {
            o = o.parent;
        }

        return o;
    };

    // ------------------------------------------------------------

    /**
     * System register.
     * @param {!string} name Register name
     * @param {number} size Register size in bits
     * @constructor
     */
    function Register(name, size) {
        Literal.call(this);

        /** @type {!string} */
        this.name = name;

        /** @type {!number} */
        this.size = size || 0;

        /** @type {boolean} */
        this.is_def = false;

        /** @type {number} */
        this.idx = undefined;

        /** @type {Expr} */
        this.def = undefined;
    }

    Register.prototype = Object.create(Literal.prototype);
    Register.prototype.constructor = Register;

    /** @returns {boolean} */
    Register.prototype.equals_no_idx = function(other) {
        return ((other instanceof Register) &&
            (this.name === other.name) &&
            (this.size === other.size));
    };

    /** @returns {boolean} */
    Register.prototype.equals = function(other) {
        return (this.equals_no_idx(other) && (this.idx === other.idx));
    };

    /**
     * Generate a deep copy of `this`.
     * @param {?Array.<string>} keep A list of object properties to preserve [optional]
     * @param {?boolean} attach Whether to track the newly cloned object in def-use chain
     * @returns {!Register}
     */
    Register.prototype.clone = function(keep, attach) {
        // TODO: once Register will not be an inheritable object (i.e. when Variable
        // will no longer extend Register), the first two lines could simply become:
        //      var clone = new Register(this.name, this.size);

        // create a shallow copy of this object
        var clone = Object.create(this.constructor.prototype);

        // calling this object's constructor with cloned operands, ssa-related data is reset as a side effect
        this.constructor.apply(clone, [this.name, this.size]);

        // allow preserving specific properties
        if (keep) {
            var orig = this;

            keep.forEach(function(prop) {
                clone[prop] = orig[prop];
            });
        }

        // cloned instances are attached by default
        if (attach === undefined) {
            attach = true;
        }

        // register clone as a new use for its def
        if (attach && clone.def) {
            clone.def.uses.push(clone);
        }

        return clone;
    };

    // ssa-suitable representation; this is the same as toString but without subscript
    Register.prototype.repr = function() {
        return this.name.toString();
    };

    /** @returns {string} */
    Register.prototype.toString = function(opt) {
        var str = this.name.toString();

        if (this.idx !== undefined) {
            str += subscript(this.idx);
        }

        return str;
    };

    // ------------------------------------------------------------

    function Variable(name, size) {
        Register.call(this, name, size);
    }

    Variable.prototype = Object.create(Register.prototype);
    Variable.prototype.constructor = Variable;

    // ------------------------------------------------------------

    var _toLong = function(n) {
        return Long.isLong(n) ? n : Long.fromInt(n || 0, false);
    };

    /**
     * Literal value.
     * @param {!number|!Long} value Numeric value
     * @param {number} size Value size in bits
     * @constructor
     */
    function Value(value, size) {
        Literal.call(this);

        /** @type {!Long} */
        this.value = _toLong(value);

        /** @type {!number} */
        this.size = size || 0;
    }

    Value.prototype = Object.create(Literal.prototype);
    Value.prototype.constructor = Value;

    /** @returns {boolean} */
    Value.prototype.equals = function(other) {
        return ((other instanceof Value) &&
            (this.value.eq(other.value)) &&
            (this.size === other.size));    // TODO: should we be bothered about matching sizes?
    };

    /** @returns {!Value} */
    Value.prototype.clone = function() {
        return new Value(this.value, this.size);    // TODO: should we clone the Long object?
    };

    // /**
    //  * Get string representation of `this` in a human readable form.
    //  * @returns {string} Human readable string
    //  */
    // Value.prototype.toReadableString = function() {
    //     var n = this.value;
    //     var size = this.size;
    // 
    //     // an index or small offset?
    //     if (n < 32)
    //     {
    //         return n.toString();
    //     }
    // 
    //     // TODO: consider adding a comment next to the immediate value instead of
    //     // tranfroming it into a character - which is not always desirable
    // 
    //     // an ascii character?
    //     if ((size === 8) && (n.ge(32)) && (n.le(126))) {
    //         return "'" + String.fromCharCode(n) + "'";
    //     }
    // 
    //     // -1 ?
    //     if (((size ===  8) && (n.eq(0xff))) ||
    //         ((size === 16) && (n.eq(0xffff))) ||
    //         ((size === 32) && (n.eq(0xffffffff))) ||
    //         ((size === 64) && (n.eq(Long.MAX_UNSIGNED_VALUE)))) {
    //             return '-1';
    //     }
    // 
    //     // default: return hexadecimal representation
    //     return '0x' + n.toString(16);
    // };

    /** @returns {string} */
    Value.prototype.toString = function() {
        // TODO: this implementation serves as a temporary workaround. value
        // should be emitted according to the context it appears in

        var radix = (this.value.gt(-32) && this.value.lt(32)) ? 10 : 16;
        var is_neg = this.value.isNegative();
        var val = is_neg ? this.value.neg() : this.value;

        return (is_neg ? '-' : '') + (radix === 16 ? '0x' : '') + val.toString(radix);
    };

    Value.MAX_VAL16 = new Value(Long.fromBits(0x0000ffff, 0x00000000, true), 16);
    Value.MAX_VAL32 = new Value(Long.fromBits(0xffffffff, 0x00000000, true), 32);
    Value.MAX_VAL64 = new Value(Long.fromBits(0xffffffff, 0xffffffff, true), 64);

    // ------------------------------------------------------------

    /**
     * Expression base class.
     * This class is abstract and meant to be only inherited, not instantiated.
     * @param {Array.<(Expr|Register|Value)>} operands An array of expressions instances
     * @constructor
     */
    function Expr(operands) {
        this.parent = undefined;
        this.operands = [];

        operands.forEach(this.push_operand, this);
    }

    /**
     * Perform a deep iteratation over expression's operands, from left to right.
     * @param {boolean} depth_first Whether predecessors' operands should be emitted before this'
     * @returns {!Array.<Expr>}
     */
    Expr.prototype.iter_operands = function(depth_first) {
        // note: sadly Duktape does not support the function* and yield* keywords so
        // this is not a true generator, rather it is just a list.

        var depth = this.operands.reduce(function(agg, op) {
            return agg.concat(op.iter_operands(depth_first));
        }, []);

        return depth_first
            ? depth.concat([this])
            : [this].concat(depth);
    };

    // add an operand at the end of the operands list
    Expr.prototype.push_operand = function(op) {
        op.parent = this;
    
        this.operands.push(op);
    };

    /**
     * Remove an operand from the operands list.
     * @param {!Expr} op Operand instance to remove
     * @returns {!Expr} The removed operand instance
     */
    Expr.prototype.remove_operand = function(op) {
        this.operands.splice(this.operands.indexOf(op), 1);
        op.parent = undefined;

        return op;
    };

    Expr.prototype.replace_operand = function(old_op, new_op) {
        old_op.parent = undefined;
        new_op.parent = this;

        this.operands[this.operands.indexOf(old_op)] = new_op;

        return old_op;
    };

    /**
     * Have parent replace `this` expression with `other`.
     * @param {!Expr} other Replacement expression
     * @returns Replaced expression
     */
    Expr.prototype.replace = function(other) {
        var p = this.parent;
        var func = p.replace_operand || p.replace_expr;
        var args = [this, other];

        this.iter_operands(true).forEach(detach_user);

        return func.apply(p, args);
    };

    /**
     * Have parent pluck `this` expression. The plucked expression could be
     * then inserted to another parent, or simply discarded.
     * @param {boolean} detach Whether to detach `this` along with its operands from
     * their users list
     * @returns {!Expr} `this`
     */
    Expr.prototype.pluck = function(detach) {
        var p = this.parent;
        var func = p.remove_operand || p.remove_expr;
        var args = [this];

        if (detach) {
            this.iter_operands(true).forEach(detach_user);
        }

        return func.apply(p, args);
    };

    /**
     * Ascend the parents tree to locate `this` enclosing Statement.
     * @returns {!Statement}
     */
    Expr.prototype.parent_stmt = function() {
        var o = this;

        while (o instanceof Expr) {
            o = o.parent;
        }

        return o;
    };

    /**
     * Query whether this object equals to another.
     * @param {Expr} other Another object to compare with
     * @returns {boolean} `true` iff this and other are equal in operators and operands, `false` otherwise
     */
    Expr.prototype.equals = function(other) {
        var eq = (Object.getPrototypeOf(this) === Object.getPrototypeOf(other)) &&
            (this.operands.length === other.operands.length);

        for (var i = 0; eq && (i < this.operands.length); i++) {
            eq &= this.operands[i].equals(other.operands[i]);
        }

        return eq;
    };

    /**
     * Generate a deep copy of `this`.
     * @param {?Array.<string>} keep A list of object properties to preserve [optional]
     * @param {?boolean} attach Whether to track the newly cloned object in def-use chain
     * @returns {!Expr}
     */
    Expr.prototype.clone = function(keep, attach) {
        // create a shallow copy of this object; omitting the operands
        var clone = Object.create(this.constructor.prototype, { operands: { value: [], writable: true }});

        // calling this object's constructor with cloned operands, ssa-related data is reset as a side effect
        this.constructor.apply(clone, this.operands.map(function(op) { return op.clone(keep, attach); }));

        // allow preserving specific properties
        if (keep) {
            var orig = this;

            keep.forEach(function(prop) {
                clone[prop] = orig[prop];
            });
        }

        // cloned instances are attached by default
        if (attach === undefined) {
            attach = true;
        }

        // register clone as a new use for its def (if any)
        if (attach && clone.def) {
            clone.def.uses.push(clone);
        }

        return clone;
    };

    Expr.prototype.toString = function(opt) {
        var op = Object.getPrototypeOf(this).constructor.name;

        var args = this.operands.map(function(a) {
            return a.toString(opt);
        });

        return op + parenthesize(args.join(', '));
    };

    // ------------------------------------------------------------

    /**
     * Function call.
     * @param {Expr} callee Callee target address
     * @param {Array.<Expr>} args Array of function call arguments
     * @constructor
     */
    function Call(callee, args) {
        // this constructor may be called in two ways:
        //   o when instantiating a new fcall expr
        //   o when cloning an existing fcall expr
        //
        // on the former, callee is an expr and args is an exprs list
        // on the latter, fcall args list is passed flat where callee appears the first
        //
        // this code comes to make sure both methods are handled and normalized to one list of
        // arguments, where the callee expr is in the first index. including the callee expr in
        // the operands list is only to enable the optimizers count it in when iterating through
        // expressions and their operands

        if (args instanceof Array) {
            args.unshift(callee);
        } else {
            args = Array.prototype.slice.call(arguments);
        }

        Expr.call(this, args);
    }

    Call.prototype = Object.create(Expr.prototype);
    Call.prototype.constructor = Call;

    // ------------------------------------------------------------

    /**
     * Phi expression: used for SSA stage, and eliminated afterwards.
     * Normally would appear as a right-hand of an assignment.
     * @param {Array.<Expr>} exprs Array of possible rvalues
     * @constructor
     */
    function Phi(exprs) {
        // in case a Phi instance is cloned, its operands list is passed flat.
        // the following is to regroup the operands back into a list:
        if (!(exprs instanceof Array)) {
            exprs = Array.prototype.slice.call(arguments);
        }

        Expr.call(this, exprs);
    }

    Phi.prototype = Object.create(Expr.prototype);
    Phi.prototype.constructor = Phi;

    Phi.prototype.has = function(op) {
        var found = false;

        for (var i = 0; (i < this.operands.length) && !found; i++) {
            found = this.operands[i].equals(op);
        }

        return found;
    };

    // ------------------------------------------------------------

    /**
     * A raw assembly line. This is a phony expression since its operand is
     * a mere string and not an expression. It cannot be analyzed any further and
     * most likely to break SSA analysis.
     * @constructor
     */
    function Asm(line) {
        Expr.call(this, []);

        this.line = line;
    }

    Asm.prototype = Object.create(Expr.prototype);
    Asm.prototype.constructor = Asm;

    /** @override */
    Asm.prototype.clone = function(keep, attach) {
        var _super = Object.getPrototypeOf(Object.getPrototypeOf(this));
        var cloned = _super.clone.call(this, keep, attach);

        cloned.line = this.line;

        return cloned;
    };

    /** @override */
    Asm.prototype.toString = function() {
        var op = Object.getPrototypeOf(this).constructor.name;

        return op + parenthesize(quote(this.line));
    };

    // ------------------------------------------------------------

    /**
     * Unary expression base class.
     * @param {(Expr|Register|Value)} operand1 1st operand expression
     * @constructor
     */
    function UExpr(operand1) {
        Expr.call(this, [operand1]);
    }

    UExpr.prototype = Object.create(Expr.prototype);
    UExpr.prototype.constructor = UExpr;

    // ------------------------------------------------------------

    /**
     * Binary expression base class.
     * @param {(Expr|Register|Value)} operand1 1st operand expression
     * @param {(Expr|Register|Value)} operand2 2nd operand expression
     * @constructor
     */
    function BExpr(operand1, operand2) {
        Expr.call(this, [operand1, operand2]);
    }

    BExpr.prototype = Object.create(Expr.prototype);
    BExpr.prototype.constructor = BExpr;

    // ------------------------------------------------------------

    /**
     * Ternary expression base class.
     * @param {(Expr|Register|Value)} operand1 1st operand expression
     * @param {(Expr|Register|Value)} operand2 2nd operand expression
     * @param {(Expr|Register|Value)} operand3 3rd operand expression
     * @constructor
     */
    function TExpr(operand1, operand2, operand3) {
        Expr.call(this, [operand1, operand2, operand3]);
    }

    TExpr.prototype = Object.create(Expr.prototype);
    TExpr.prototype.constructor = TExpr;

    // ------------------------------------------------------------

    // assignment
    function Assign(lhand, rhand) {
        BExpr.call(this, lhand, rhand);

        lhand.is_def = true;
    }

    Assign.prototype = Object.create(BExpr.prototype);
    Assign.prototype.constructor = Assign;

    /** @override */
    Assign.prototype.replace_operand = function(old_op, new_op) {
        var _super = Object.getPrototypeOf(Object.getPrototypeOf(this));

        // left hand expression may be replaced with a new one, due to simplification
        // or propagation. this comes to maintain the 'is_def' property properly so ssa
        // would be able to pick it up as a definition

        if (old_op === this.operands[0]) {
            new_op.is_def = true;
        }

        // proceed with the normal replacement flow
        return _super.replace_operand.call(this, old_op, new_op);
    };

    // ------------------------------------------------------------

    // memory dereference
    function Deref(op, size) {
        UExpr.call(this, op);

        this.size = size || 0;
        this.is_def = false;    // ssa: is a definition?
        this.idx = undefined;   // ssa: subscript index
    }

    Deref.prototype = Object.create(UExpr.prototype);
    Deref.prototype.constructor = Deref;

    /** @returns {boolean} */
    Deref.prototype.equals_no_idx = function(other) {
        return ((other instanceof Deref)
            && (this.size === other.size)
            && (this.operands[0].equals(other.operands[0])));
    };

    /** @returns {boolean} */
    Deref.prototype.equals = function(other) {
        return (this.equals_no_idx(other) && (this.idx === other.idx));
    };

    Deref.prototype.clone = function(keep, attach) {
        var _super = Object.getPrototypeOf(Object.getPrototypeOf(this));
        var cloned = _super.clone.call(this, keep, attach);

        cloned.size = this.size;

        return cloned;
    };

    // ssa-suitable representation; this is the same as toString but without subscript
    Deref.prototype.repr = function() {
        var _super = Object.getPrototypeOf(Object.getPrototypeOf(this));

        return _super.toString.call(this);
    };

    /** @override */
    Deref.prototype.toString = function(opt) {
        var _super = Object.getPrototypeOf(Object.getPrototypeOf(this));
        var str = _super.toString.call(this);

        if (this.idx !== undefined) {
            str += subscript(this.idx);
        }

        return str;
    };

    // ------------------------------------------------------------

    // unary expressions
    function Not       (op) { UExpr.call(this, op); }
    function Neg       (op) { UExpr.call(this, op); }
    function AddressOf (op) { UExpr.call(this, op); }

    Not.prototype       = Object.create(UExpr.prototype);
    Neg.prototype       = Object.create(UExpr.prototype);
    AddressOf.prototype = Object.create(UExpr.prototype);

    Not.prototype.constructor = Not;
    Neg.prototype.constructor = Neg;
    AddressOf.prototype.constructor = AddressOf;

    // binary expressions
    function Add (op1, op2) { BExpr.call(this, op1, op2); }
    function Sub (op1, op2) { BExpr.call(this, op1, op2); }
    function Mul (op1, op2) { BExpr.call(this, op1, op2); }
    function Div (op1, op2) { BExpr.call(this, op1, op2); }
    function Mod (op1, op2) { BExpr.call(this, op1, op2); }
    function And (op1, op2) { BExpr.call(this, op1, op2); }
    function Or  (op1, op2) { BExpr.call(this, op1, op2); }
    function Xor (op1, op2) { BExpr.call(this, op1, op2); }
    function Shl (op1, op2) { BExpr.call(this, op1, op2); }
    function Shr (op1, op2) { BExpr.call(this, op1, op2); }

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
    function TCond (op1, op2, op3) { TExpr.call(this, op1, op2, op3); }

    TCond.prototype = Object.create(TExpr.prototype);

    // boolean expressions
    function BoolAnd (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function BoolOr  (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function BoolNot (expr) { UExpr.call(this, expr); }

    BoolAnd.prototype = Object.create(BExpr.prototype);
    BoolOr.prototype  = Object.create(BExpr.prototype);
    BoolNot.prototype = Object.create(UExpr.prototype);

    BoolAnd.prototype.constructor = BoolAnd;
    BoolOr.prototype.constructor = BoolOr;
    BoolNot.prototype.constructor = BoolNot;

    // comparisons
    function EQ (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function NE (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function GT (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function LT (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function GE (expr1, expr2) { BExpr.call(this, expr1, expr2); }
    function LE (expr1, expr2) { BExpr.call(this, expr1, expr2); }

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
        // abstract base classes: use only to define arch-specific exprs
        UExpr:  UExpr,
        BExpr:  BExpr,
        TExpr:  TExpr,
        Expr:   Expr,

        // ssa phi expression
        Phi:    Phi,

        // common expressions
        Reg:        Register,
        Var:        Variable,
        Val:        Value,
        Deref:      Deref,
        AddrOf:     AddressOf,
        Not:        Not,
        Neg:        Neg,
        Assign:     Assign,
        Add:        Add,
        Sub:        Sub,
        Mul:        Mul,
        Div:        Div,
        Mod:        Mod,
        And:        And,
        Or:         Or,
        Xor:        Xor,
        Shl:        Shl,
        Shr:        Shr,
        EQ:         EQ,
        NE:         NE,
        LT:         LT,
        GT:         GT,
        LE:         LE,
        GE:         GE,
        Call:       Call,
        TCond:      TCond,
        BoolAnd:    BoolAnd,
        BoolOr:     BoolOr,
        BoolNot:    BoolNot,
        Unknown:    Asm
    };
})();