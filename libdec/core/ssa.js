
module.exports = (function() {
    const Expr = require('libdec/core/ir/expressions');

    var _ssa_context = function(block, parent) {
        this.block = block;
        this.parent = parent;
        this.live = [];

        // look for a similar expr that is already known to be alive
        // if not found, return undefined
        this.get_local_def = function(expr) {
            // TODO: Duktape has no "find" in Array.prototype
            var findings = this.live.filter(function(e) {
                return e.like(expr);
            });

            // return first (and only) match, or undefiend if list is empty
            return findings[0];
        };

        this.assign = function(expr) {
            var def = this.get_local_def(expr);

            // if already exist with a lower index, pop it
            if (def) {
                this.live.splice(this.live.indexOf(def), 1);
            }

            this.live.push(expr);
        };
    };

    var _contextual_iterator = function(selector) {
        this.selector = selector;
        this.done = [];

        this.defs = function(expr) {
            return expr.iter_operands().filter(function(o) {
                return (this.selector(o) && o.is_def);
            }, this);
        };

        this.uses = function(expr) {
            return expr.iter_operands().filter(function(o) {
                return (this.selector(o) && !o.is_def);
            }, this);
        };

        this.assign_defs = function(context, expr) {
            this.defs(expr).forEach(function(d) {
                context.assign(d);
            });
        };
    };

    _contextual_iterator.prototype.traverse = function(context) {
        if (this.done.indexOf(context.block) > (-1)) {
            return;
        }

        this.done.push(context.block);

        context.block.statements.forEach(function(s) {
            s.expressions.forEach(function(e) {
                    this.assign_defs(context, e);
            }, this);
        }, this);

        context.block.outbound.forEach(function(ob) {
            if (ob) {
                this.traverse(new _ssa_context(ob, context));
            }
        }, this);
    };

    var _liveness_analysis = function(selector) {
        _contextual_iterator.call(this, selector);

        this.exit_contexts = {};

        this.traverse = function(context) {
            var seen = this.done.indexOf(context.block) > (-1);

            Object.getPrototypeOf(Object.getPrototypeOf(this)).traverse.call(this, context);
            if (!seen) {
                this.exit_contexts[context.block] = context;
            }
        };
    };

    _liveness_analysis.prototype = Object.create(_contextual_iterator.prototype);

    var _tagger = function(entry_block) {
        this.entry_block = entry_block;
        this.step = 0;
        this.idx = 0;
        this.exit_contexts = [];

        this.tag = function(step, selector) {
            this.done = [];
            this.step = step;

            var p1 = new _liveness_analysis(selector);
            p1.traverse(new _ssa_context(this.entry_block));
            this.exit_contexts[this.step] = p1.exit_contexts;

            console.log(p1.toString());
            // TODO: p2
        };

        this.tag_regs = function() {
            return this.tag(1, function(e) { return e instanceof Expr.reg; });
        };
    };

    return {
        tagger: _tagger
    };
}());