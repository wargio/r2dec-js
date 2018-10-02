
module.exports = (function() {
    var Expr = require('core2/analysis/ir/expressions');
    var Stmt = require('core2/analysis/ir/statements');

    var _get_statament_by_addr = function(containers, addr) {
        console.log('looking for', addr.toString(16));
        
        return statements.filter(function(s) {
            return s.addr.eq(addr);
        })[0];
    };

    var _run = function(func) {
        for (var j = 0; j < func.containers.length; j++) {
            var cntr = func.containers[j];

            for (var i = 0; i < cntr.statements.length; i++) {
                var stmt = cntr.statements[i];

                if (stmt instanceof Stmt.branch) {
                    var cntr_taken = _get_statament_by_addr(func.containers, stmt.taken.value);
                    var cntr_not_taken = _get_statament_by_addr(func.containers, stmt.not_taken.value);

                    console.log('t:', cntr_taken);
                    console.log('f:', cntr_not_taken);

                    // TODO: pluck containers from their parents so they wont appear twice

                    stmt.replace(new Stmt.if(stmt.cond, cntr_taken.container, cntr_not_taken.container));
                }
            }
        }
    };

    return {
        run: _run
    };
})();