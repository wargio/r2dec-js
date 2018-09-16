
module.exports = (function() {

    const Stmt = require('libdec/core/ir/statements');

    var _ssa_context = function(block, parent) {
        this.block = block;
        this.parent = parent;
        this.defined = [];

        this.get_local_definitions = function(expr) {
            var found = undefined;

            for (var i = 0; !found && (i < this.defined.length); i++) {
                var local = this.defined[i];

                if (local.no_index_eq(expr)) {
                    found = local;
                }
            }

            return found;
        };

        this.get_recursive_definitions = function(expr) {
            var def = this.get_local_definitions(expr);

            if (def) {
                return def;
            }

            if (this.parent) {
                return this.parent.get_recursive_definitions(expr);
            }
        };

        this.assign = function(expr) {
            var def = this.get_local_definitions(expr);

            if (def) {
                // remove def
                var idx = this.defined.indexOf(def);

                this.defined.splice(idx, 1);
            }

            this.defined.push(expr);
        };
    };

    var _contextual_iterator = function(func, selector) {
        this.func = func;
        this.selector = selector;
        this.blocks_done = [];

        this.definitions = function(expr) {
            return expr.iter_operands().filter(function(o) {
                return this.selector(o) && (o.is_def == true);
            });
        };

        this.uses = function(expr) {
            return expr.iter_operands().filter(function(o) {
                return this.selector(o) && (o.is_def == false);
            });
        };

        this.assign_definitions = function(ctx, expr) {
            this.definitions(expr).forEach(function(o) {
                ctx.assign(o);
            });
        };

        this.traverse = function(ctx) {
            if (this.blocks_done.indexOf(ctx.block) == (-1)) {
                this.blocks_done.push(ctx.block);

                ctx.block.container.statements.forEach(function(s) {
                    this.statement(ctx, s);
                });
            }
        };

        this.statement = function(ctx, stmt) {
            stmt.expressions.forEach(function(e) {
                this.assign_definitions(ctx, e);
            });

            if ((stmt instanceof Stmt.goto) && stmt.is_known() && (stmt.expr.value in this.func.blocks)) {
                var target = this.func.blocks[stmt.expr.value];

                this.traverse(new _ssa_context(target, ctx));
            } else if (stmt instanceof Stmt.branch) {
                [stmt.taken, stmt.not_taken].forEach(function(e) {
                    var target = this.func.blocks[e.value];

                    if (target) {
                        this.traverse(new _ssa_context(target, ctx));
                    }
                });
            }
        };
    };








    var tagger = function() {

        this.do_tag = function() {

        };
    };

})();