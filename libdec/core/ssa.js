
module.exports = (function() {
    const Expr = require('libdec/core/ir/expressions');

    var _context_iterator = function() {
        this.done = [];
        this.defs = [];
        this.index = 1;

        this.tag = function(expr) {
            if (expr.is_def) {
                if (!(expr in this.defs)) {
                    expr.idx = this.index++;

                    this.defs.push(expr);
                }
            } else {
                //use 
            }

        };

        this.iterate = function(context, selector) {
            if (!(context in this.done)) {
                context.statements.forEach(function(s) {
                    s.expressions.forEach(function(e) {
                        e.iter_operands().filter(selector).forEach(this.tag, this);
                    }, this);
                }, this);

                this.done.push(context);
            }

            context.jump_to.concat(context.falls_into).forEach(function(next) {
                if (next) {
                    this.iterate(next, selector);
                }
            }, this);
        };

    };

    return {
        tag_regs : function(context) {
            var it = new _context_iterator();

            it.iterate(context, function(e) { return e instanceof Expr.reg; });
        }
    };
}());