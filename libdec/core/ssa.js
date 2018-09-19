
module.exports = (function() {
    const Expr = require('libdec/core/ir/expressions');
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

    // collect live assignments at the end of each block
    var _ssa_phase1 = function(func, selector) {
        _contextual_iterator.call(this, func, selector);

        this.exit_context = {};

        this.traverse = function(context) {
            var seen = context.block in this.blocks_done;

            super.traverse(context);
            if (!seen) {
                this.exit_context[context.block] = context;
            }
        };
    };

    _ssa_phase1.prototype = Object.create(_contextual_iterator.prototype);

    // for each start of block, add phi statements where necessary
    var _ssa_phase2 = function(func, selector, exit_contexts) {
        _contextual_iterator.call(this, func, selector);

        this.exit_contexts = exit_contexts;
        this.index = 0;

        this.entry_contexts = function(block) {
            return block.jump_from.map(function(j) {
                return this.exit_contexts[j];
            }, this);
        };

        this.indexify = function(expr) {
            if (expr.index == undefined) {
                expr.index = this.index++;
            }

            return expr;
        };

        this.find_uninitialized = function(use) {
            var found;

            for (var i = 0; !found && (i < this.func.uninitialized.length); i++) {
                var def = this.func.uninitialized[i];

                if (use.no_index_eq(def)) {
                    found = def;
                }
            }

            return found;
        };

        this.insert_exit_definition = function(context, def) {
            var ctx = this.exit_contexts[context.block];
            var other_def = ctx.get_local_definition(def);

            if (!other_def || (other_def.parent_statement.index() < def.parent_statement.index())) {
                ctx.assign(def);
            }

            other_def = context.get_local_definition(def);
            if (!other_def) {
                context.assign(def);
            }
        };

        this.create_phi = function(context, use) {
            var pstmt = use.parent_statement;
            var block = context.block;

            var def = use.clone(true);  // TODO: check for cloning 'with definition'
            def.definition = undefined;
            def.index = undefined;
            this.indexify(def);

            var phi = new Expr.phi();
            var stmt = Stmt.make_statement(block.ea, new Expr.assign(def, phi));
            this.insert_exit_definition(context, def);

            var index = use.parent_statement.container.block === block ? pstmt.index() : 0;
            block.container.insert(index, stmt);

            return [stmt, phi];
        };

        this.create_unininitialized = function(use) {

        };
    };

    _ssa_phase2.prototype = Object.create(_contextual_iterator.prototype);


    var tagger = function() {

        this.do_tag = function() {

        };
    };

})();