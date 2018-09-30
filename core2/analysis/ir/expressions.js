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

    // --------------- helper functions ---------------

    /**
     * Wraps a string with parenthesis.
     * @param {!string} s A string to wrap
     * @returns {!string} `s` wrapped by parenthesis
     */
    var parenthesize = function(s) {
        return '(' + s + ')';
    };

    /**
     * Wraps a string with parenthesis only if it is complex.
     * @param {string} s A string to wrap
     * @returns {string} `s` wrapped by parenthesis if `s` is a complex string, and `s` otherwise
     */
    var autoParen = function(s) {
        return (s.indexOf(' ') > (-1) ? parenthesize(s) : s);
    };

    // --------------- classes ---------------

    /**
     * System register.
     *
     * @param {!string} name Register name
     * @param {number} size Register size in bits
     * @constructor
     */
    var _register = function(name, size) {
        /** @type {!string} */
        this.name = name;

        /** @type {!number} */
        this.size = size || 0;

        /** @returns {Array} */
        this.iter_operands = function() {
            return [];
        };

        /** @returns {boolean} */
        this.equals = function(other) {
            return ((other instanceof _register) &&
                (this.name === other.name) &&
                (this.size === other.size) &&   // TODO: ax == eax == rax
                (this.idx === other.idx));
        };

        /** @returns {boolean} */
        this.like = function(other) {
            return ((other instanceof _register) &&
                (this.name === other.name) &&
                (this.size === other.size));   // TODO: ax == eax == rax
        };

        /** @returns {!_register} */
        this.clone = function() {
            return Object.create(this);
        };

        /** @returns {string} */
        this.toString = function(opt) {
            var subscript = this.idx == undefined ? '' : '.' + this.idx.toString(10);

            return this.name.toString() + subscript;
        };
    };

    /**
     * Literal value.
     *
     * @param {!number} value Numeric value
     * @param {number} size Value size in bits
     * @constructor
     */
    var _value = function(value, size) {
        /** @type {!number} */
        this.value = value;

        /** @type {!number} */
        this.size = size || 0;

        /** @returns {Array} */
        this.iter_operands = function() {
            return [];
        };

        /** @returns {boolean} */
        this.equals = function(other) {
            return ((other instanceof _value) &&
                (this.value === other.value) &&
                (this.size === other.size));    // TODO: should we be bothered about matching sizes?
        };

        /** @returns {!_value} */
        this.clone = function() {
            return Object.create(this);
        };

        /**
         * Get string representation of `this` in a human readable form.
         * @returns {string} Human readable string
         */
        this.toReadableString = function() {
            var n = this.value;
            var size = this.size;

            // TODO: adjust comparisons to Long's?

            // an index or small offset?
            if (n < 32)
            {
                return n.toString();
            }

            // TODO: consider adding a comment next to the immediate value instead of
            // tranfroming it into a character - which is not always desirable

            // an ascii character?
            if ((size == 8) && (n >= 32) && (n <= 126)) {
                return "'" + String.fromCharCode(n) + "'";
            }

            // -1 ?
            if (((size ==  8) && (n == 0xff)) ||
                ((size == 16) && (n == 0xffff)) ||
                ((size == 32) && (n == 0xffffffff)) ||
                ((size == 64) && (n == Long.MAX_UNSIGNED_VALUE))) {
                    return '-1';
            }

            // default: return hexadecimal representation
            return '0x' + n.toString(16);
        };

        /** @returns {string} */
        this.toString = function(opt) {
            if (opt && opt.human_readable) {
                return this.toReadableString();
            }

            return this.value.toString(opt);
        };
    };

    /**
     * Expression base class.
     * This class is abstract and meant to be only inherited, not instantiated.
     * 
     * @param operator {string} An operator token
     * @param operands {Array} An array of expressions instances
     * @constructor
     */
    var _expr = function(operator, operands) {
        this.operator = operator;
        this.operands = operands || [];

        // set parent for every operand we got
        this.operands.forEach(function(o, i) {
            o.parent = [this, i];
        }, this);

        this.is_def = false;
        this.idx = undefined;
        this.parent = [undefined, undefined];

        /**
         * Perform a deep iteratation over expression's operands, from left to right.
         * @param {boolean} depth_first Whether predecessors' operands should be emitted before this'
         * @returns {!Array<_expr>}
         */
        this.iter_operands = function(depth_first) {
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

        /*
        this.push_operand = function(op) {
            op.parent = [this, this.operands.length];

            this.operands.push(op);
        };

        this.remove_operand = function(op) {
            var i = this.operands.indexOf(op);

            return (i > (-1) ? this.operands.splice(i, 1) : null);
        };

        this.pluck = function() {
            return this.parent.remove_operand(this);
        };
        */

        /**
         * Have parent replace `this` expression with `other`
         * @param {!_expr} other Replacement expression
         */
        this.replace = function(other) {
            var p = this.parent[0]; // parent object
            var i = this.parent[1]; // operand index at parent's
    
            other.parent = this.parent;
            p.operands[i] = other;
        };

        /**
         * Query whether this object equals to another.
         * @param {_expr} other Another object to compare with
         * @returns {boolean} `true` iff this and other are equal in operators and operands, `false` otherwise
         */
        this.equals = function(other) {
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
         * @returns {!_expr}
         */
        this.clone = function() {
            return Object.create(this, {
                'operands': {
                    value: this.operands.map(function(o) { return o.clone(); })
                }
            });
        };

        /** [!] This abstract method must be implemented by the inheriting class */
        this.toString = undefined;
    };

    var _fcall = function(name, args) {
        _expr.call(this, name, args);

        // TODO: callee name stored in this.operator is in fact an expr, and not
        // a plain string, like everywhere else. callee name should be resolved

        this.toString = function(opt) {
            var args = this.operands.map(function(a) {
                return a.toString(opt);
            });

            return this.operator + parenthesize(args.join(', '));
        };
    };

    _fcall.prototype = Object.create(_expr.prototype);

    var _phi = function() {
        _expr.call(this, 'phi', Array.from(arguments));

        this.toString = function(opt) {
            var args = this.operands.map(function(a) {
                return a.toString(opt);
            });

            return this.operator + parenthesize(args.join(', '));
        };
    };

    _phi.prototype = Object.create(_expr.prototype);

    /**
     * Unary expression base class.
     * 
     * @param operator {string} An operator token
     * @param operand1 {Object} First operand expression
     * @constructor
     */
    var _uexpr = function(operator, operand1) {
        _expr.call(this, operator, [operand1]);

        /** @returns {!string} */
        this.toString = function(opt) {
            return this.operator + this.operands[0].toString(opt);
        };
    };

    _uexpr.prototype = Object.create(_expr.prototype);

    /**
     * Unary expression with postfix notation
     *
     * @constructor
    */
    var _uexpr_pf = function(operator, operand) {
        _uexpr.call(this, operator, operand);

        /** @returns {!string} */
        this.toString = function(opt) {
            return this.operands[0].toString(opt) + this.operator;
        };
    };

    _uexpr_pf.prototype = Object.create(_uexpr.prototype);

    /**
     * Binary expression base class.
     * 
     * @param operator {string} An operator token
     * @param operand1 {Object} First operand expression
     * @param operand2 {Object} Second operand expression
     * @constructor
     */
    var _bexpr = function(operator, operand1, operand2) {
        _expr.call(this, operator, [operand1, operand2]);

        /** @returns {!string} */
        this.toString = function(opt) {
            return [
                this.operands[0].toString(opt),
                this.operator,
                this.operands[1].toString(opt)
            ].join(' ');
        };
    };

    _bexpr.prototype = Object.create(_expr.prototype);

    /**
     * Ternary expression base class.
     * 
     * @param operator1 {string} First operator token
     * @param operator2 {string} Second operator token
     * @param operand1 {Object} First operand expression
     * @param operand2 {Object} Second operand expression
     * @param operand3 {Object} Third operand expression
     * @constructor
     */
    var _texpr = function(operator1, operator2, operand1, operand2, operand3) {
        _expr.call(this, [operator1, operator2], [operand1, operand2, operand3]);

        /** @returns {!string} */
        this.toString = function(opt) {
            return [
                this.operands[0].toString(opt),
                this.operator[0],
                this.operands[1].toString(opt),
                this.operator[1],
                this.operands[2].toString(opt)
            ].join(' ');
        };
    };

    _texpr.prototype = Object.create(_expr.prototype);

    var _asm = function(line) {
        this.line = line;

        this.toString = function() {
            return '__asm ("' + this.line + '")';
        };
    };

    // assignment
    var _assign = function(lhand, rhand) {
        _bexpr.call(this, '=', lhand, rhand);

        lhand.is_def = true;
        /*
        this.toString = function(opt) {
            // "x = x op y" --> "x op= y"
            if ((rhand instanceof _bexpr) && (lhand == rhand.operands[0])) {
                return [
                    this.operands[0].toString(opt),
                    rhand.operator + this.operator,
                    rhand.operands[1].toString(opt)
                ].join(' ');
            }

            // return parent's toString result
            // TODO: buggy? it turns all _bexpr's subclasses toString method to undefined
            return Object.getPrototypeOf(_assign.prototype).toString.call(this, opt);
        };
        */
    };

    _assign.prototype = Object.create(_bexpr.prototype);

    // unary expressions
    var _not    = function(op) { _uexpr.call(this, '-', op); };
    var _neg    = function(op) { _uexpr.call(this, '~', op); };
    var _deref  = function(op) { _uexpr.call(this, '*', op); };
    var _addrof = function(op) { _uexpr.call(this, '&', op); };

    _not.prototype    = Object.create(_uexpr.prototype);
    _neg.prototype    = Object.create(_uexpr.prototype);
    _deref.prototype  = Object.create(_uexpr.prototype);
    _addrof.prototype = Object.create(_uexpr.prototype);

    // postfix unary expression
    var _inc = function(op) { _uexpr_pf.call(this, '++', op); };
    var _dec = function(op) { _uexpr_pf.call(this, '--', op); };
    
    _inc.prototype = Object.create(_uexpr_pf.prototype);
    _dec.prototype = Object.create(_uexpr_pf.prototype);

    // binary expressions
    var _add = function(op1, op2) { _bexpr.call(this, '+',  op1, op2); };
    var _sub = function(op1, op2) { _bexpr.call(this, '-',  op1, op2); };
    var _mul = function(op1, op2) { _bexpr.call(this, '*',  op1, op2); };
    var _div = function(op1, op2) { _bexpr.call(this, '/',  op1, op2); };
    var _mod = function(op1, op2) { _bexpr.call(this, '%',  op1, op2); };
    var _and = function(op1, op2) { _bexpr.call(this, '&',  op1, op2); };
    var _or  = function(op1, op2) { _bexpr.call(this, '|',  op1, op2); };
    var _xor = function(op1, op2) { _bexpr.call(this, '^',  op1, op2); };
    var _shl = function(op1, op2) { _bexpr.call(this, '<<', op1, op2); };
    var _shr = function(op1, op2) { _bexpr.call(this, '>>', op1, op2); };

    _add.prototype = Object.create(_bexpr.prototype);
    _sub.prototype = Object.create(_bexpr.prototype);
    _mul.prototype = Object.create(_bexpr.prototype);
    _div.prototype = Object.create(_bexpr.prototype);
    _mod.prototype = Object.create(_bexpr.prototype);
    _and.prototype = Object.create(_bexpr.prototype);
    _or.prototype  = Object.create(_bexpr.prototype);
    _xor.prototype = Object.create(_bexpr.prototype);
    _shl.prototype = Object.create(_bexpr.prototype);
    _shr.prototype = Object.create(_bexpr.prototype);

    // ternary expressions
    var _tcond = function(op1, op2, op3) { _texpr.call(this, '?', ':', op1, op2, op3); };

    _tcond.prototype = Object.create(_texpr.prototype);

    // boolean expressions
    var _bool_and = function(expr1, expr2) { _bexpr.call(this, '&&', expr1, expr2); };
    var _bool_or  = function(expr1, expr2) { _bexpr.call(this, '||', expr1, expr2); };
    var _bool_not = function(expr) { _uexpr.call(this, '!', expr); };

    _bool_and.prototype = Object.create(_bexpr.prototype);
    _bool_or.prototype  = Object.create(_bexpr.prototype);
    _bool_not.prototype = Object.create(_uexpr.prototype);

    // comparisons
    var _eq = function(expr1, expr2) { _bexpr.call(this, '==', expr1, expr2); };
    var _ne = function(expr1, expr2) { _bexpr.call(this, '!=', expr1, expr2); };
    var _gt = function(expr1, expr2) { _bexpr.call(this, '>',  expr1, expr2); };
    var _lt = function(expr1, expr2) { _bexpr.call(this, '<',  expr1, expr2); };
    var _ge = function(expr1, expr2) { _bexpr.call(this, '>=', expr1, expr2); };
    var _le = function(expr1, expr2) { _bexpr.call(this, '<=', expr1, expr2); };

    _eq.prototype = Object.create(_bexpr.prototype);
    _ne.prototype = Object.create(_bexpr.prototype);
    _gt.prototype = Object.create(_bexpr.prototype);
    _lt.prototype = Object.create(_bexpr.prototype);
    _ge.prototype = Object.create(_bexpr.prototype);
    _le.prototype = Object.create(_bexpr.prototype);

    return {
        _uexpr: _uexpr,
        _bexpr: _bexpr,
        _texpr: _texpr,

        reg:        _register,
        val:        _value,
        assign:     _assign,
        deref:      _deref,
        address_of: _addrof,

        not:        _not,
        neg:        _neg,
        inc:        _inc,
        dec:        _dec,
        add:        _add,
        sub:        _sub,
        mul:        _mul,
        div:        _div,
        mod:        _mod,
        and:        _and,
        or:         _or,
        xor:        _xor,
        shl:        _shl,
        shr:        _shr,
        cmp_eq:     _eq,
        cmp_ne:     _ne,
        cmp_lt:     _lt,
        cmp_gt:     _gt,
        cmp_le:     _le,
        cmp_ge:     _ge,
        fcall:      _fcall,
        tcond:      _tcond,
        bool_and:   _bool_and,
        bool_or:    _bool_or,
        bool_not:   _bool_not,
        unknown:    _asm
    };
})();