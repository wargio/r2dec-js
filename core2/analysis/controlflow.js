module.exports = (function() {
    var Long = require('libdec/long');
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');
    var Logger = require('core2/logger');

    var _last_stmt = function(container) {
        return container.statements[container.statements.length - 1];
    };

    var _is_jump = function(stmt) {
        return stmt instanceof Stmt.Branch || stmt instanceof Stmt.Goto;
    };

    return {
        run: function(func) {
            var old, subcontainer;
            var all = Object.keys(func.blocks);
            for (var key in func.blocks) {
                var container = func.blocks[key].container;
                var address = container.address;
                var stmt = _last_stmt(container);
                var next = stmt.taken ? Long.fromString(stmt.taken.toString(), true, 16) : Long.MAX_UNSIGNED_VALUE;
                Logger.debug('    ' + stmt, next.toString());
                Logger.debug('    ' + (stmt instanceof Stmt.Branch ? 'Stmt.Branch' : (stmt instanceof Stmt.Goto ? 'Stmt.Goto' : '??')))
                if (stmt instanceof Stmt.Branch) {
                    if (!func.blocks[next.toString()]) {
                        Logger.debug(' >> Empty: ' + next + ' not in [' + all.join() + ']');
                        continue;
                    }
                    if (next.gt(address)) {
                        container.next = next.toString();
                        //container.statements.pop(); // removing the stmt
                    } else {
                        container.next = next.toString();
                        //container.statements.pop(); // removing the stmt
                    }
                } else if (stmt instanceof Stmt.Goto) {
                    if (!func.blocks[next.toString()]) {
                        Logger.debug(' >> Empty: ' + next + ' not in [' + all.join() + ']');
                        continue;
                    }
                    if (next.gt(address)) {
                        subcontainer = func.blocks[next.toString()].container;
                    	address = subcontainer.address;
                        container.next = next.toString();
                        old = container.statements.pop(); // removing the stmt
                        stmt = _last_stmt(func.blocks[next.toString()].container);
                        if (_is_jump(stmt) && address && next.le(address)) {
                            stmt = _last_stmt(subcontainer);
                            if (_is_jump(stmt)) {
                                old = subcontainer.statements.pop(); // removing the stmt
                                console.log('OK');
                                //subcontainer.statements = [new Stmt.While(subcontainer.address, old.cond ? old.cond : new Expr.True())];
                            }
                        }
                    } else {
                        container.next = next.toString();
                        old = container.statements.pop(); // removing the stmt
                        container.statements.push(Stmt.DoWhile(old.addr, new Expr.True()));
                    }
                }
            }
            Logger.debug('    ' + func.entry_block.container);
            //throw new Error('not implemented yet');
        }
    };
})();