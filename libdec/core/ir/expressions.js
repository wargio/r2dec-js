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
    /** @constructor */
    var _register = function(name, size) {
        /** @type {!string} */
        this.name = name;

        /** @type {!number} */
        this.size = size;

        this.iter_operands = function() {
            return [];
        };

        /** @returns {boolean} */
        this.equals = function(other) {
            return (other &&
                (this.name === other.name) &&
                (this.size === other.size));
        };

        /** @returns {!Register} */
        this.clone = function() {
            return Object.create(this);
        };

        /** @returns {string} */
        this.toString = function() {
            return this.name.toString();
        };
    };

    /** @constructor */
    var _value = function(value, size) {
        /** @type {!number} */
        this.value = value;

        /** @type {!number} */
        this.size = size;

        this.iter_operands = function() {
            return [];
        };

        /** @returns {boolean} */
        this.equals = function(other) {
            return (other &&
                (this.value === other.value) &&
                (this.size === other.size));    // TODO: should we be bothered about matching sizes?
        };

        /** @returns {!Value} */
        this.clone = function() {
            return Object.create(this);
        };

        /** @returns {string} */
        this.toString = function(opt) {
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

        /** @type {Array} */
        this.operands = operands.map(function(o) {
            // mimic "push_operand" for every operand we got
            o._parent = this;
            return o;
        }, this);

        this.is_def = false;

        /**
         * Perform a deep iteratation over expression's operands, from left to right.
         * @param {boolean} depth_first Whether predecessors' operands should be emitted before this'
         * @returns {!Array<_expr>}
         */
        this.iter_operands = function(depth_first) {
            // TODO: sadly Duktape does not support function* and yield* keywords. so
            // this is not a true generator, rather it is just a long list.

            var ops = [];

            if (depth_first) {
                Array.prototype.push.apply(ops, this.operands);
            }

            this.operands.forEach(function(o) {
                if (o instanceof _expr) {
                    Array.prototype.push.apply(ops, o.iter_operands(depth_first));
                }
            });

            if (!depth_first) {
                Array.prototype.push.apply(ops, this.operands);
            }

            return ops;
        };

        this.push_operand = function(op) {
            op._parent = this;

            this.operands.push(op);
        };

        this.remove_operand = function(op) {
            var i = this.operands.indexOf(op);

            return (i > (-1) ? this.operands.splice(i, 1) : null);
        };

        this.pluck = function() {
            return this._parent.remove_operand(this);
        };

        this.overwrite = function(other) {
            var i = this._parent.operands.indexOf(this);

            other._parent = this._parent;
            other._parent.operands[i] = other;
        };

        /**
         * Query whether this object equals to another.
         * @param {_expr} other Another object to compare with
         * @returns {boolean} `true` iff this and other are equal in operators and operands, `false` otherwise
         */
        this.equals = function(other) {
            var eq = other &&
                (this.operator === other.operator) &&
                (this.operands.length === other.operands.length);

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

        /**
         * Generate a string representation of this, currently in a form of prefix notation (LISP-like)
         * @returns {!string}
         */
        this.toString = function(opt) {
            return '(' + [this.operator].concat(this.operands.map(function(e){ return e.toString(opt); })).join(' ') + ')';
        };
    };

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

    // TODO: _pfuexpr for postfix _uexpr (++, --)

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

    var _call = function(name, args) {
        this.name = name;
        this.args = args || [];

        this.toString = function() {
            return this.name + '(', args.join(', ') + ')';
        };
    };

    var _nop = function() {
        this.toString = function() {
            return '';
        };
    };

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
    };

    // unary expressions
    var _not    = function(op) { _uexpr.call(this, '-', op); };
    var _neg    = function(op) { _uexpr.call(this, '~', op); };
    var _deref  = function(op) { _uexpr.call(this, '*', op); };
    var _addrof = function(op) { _uexpr.call(this, '&', op); };

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

    // ternary expressions
    var _tcond = function(op1, op2, op3) { _texpr.call(this, '?', ':', op1, op2, op3); };

    // boolean expressions
    var _bool_and = function(expr1, expr2) { _bexpr.call(this, '&&', expr1, expr2); };
    var _bool_or  = function(expr1, expr2) { _bexpr.call(this, '||', expr1, expr2); };
    var _bool_not = function(expr) { _uexpr.call(this, '!', expr); };

    // comparisons
    var _eq = function(expr1, expr2) { _bexpr.call(this, '==', expr1, expr2); };
    var _ne = function(expr1, expr2) { _bexpr.call(this, '!=', expr1, expr2); };
    var _gt = function(expr1, expr2) { _bexpr.call(this, '>',  expr1, expr2); };
    var _lt = function(expr1, expr2) { _bexpr.call(this, '<',  expr1, expr2); };
    var _ge = function(expr1, expr2) { _bexpr.call(this, '>=', expr1, expr2); };
    var _le = function(expr1, expr2) { _bexpr.call(this, '<=', expr1, expr2); };

    _assign.prototype = Object.create(_bexpr.prototype);

    _not.prototype    = Object.create(_uexpr.prototype);
    _neg.prototype    = Object.create(_uexpr.prototype);
    _deref.prototype  = Object.create(_uexpr.prototype);
    _addrof.prototype = Object.create(_uexpr.prototype);

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

    _tcond.prototype = Object.create(_texpr.prototype);

    _bool_and.prototype = Object.create(_bexpr.prototype);
    _bool_or.prototype  = Object.create(_bexpr.prototype);
    _bool_not.prototype = Object.create(_uexpr.prototype);

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

        reg:    _register,
        val:    _value,
        assign:     _assign,
        deref:      _deref,
        address_of: _addrof,
        not:        _not,
        neg:        _neg,
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
        call:       _call,
        tcond:      _tcond,
        bool_and:   _bool_and,
        bool_or:    _bool_or,
        bool_not:   _bool_not,
        nop:        _nop,
        unknown:    _asm
    };
})();