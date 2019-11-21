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

(function() {
    /**
     * Container class. Encloses a list of consecutive statements that serve as one
     * logical block, e.g. a loop body or an 'if' body.
     * @param {number|Long} addr Scope starting address
     * @param {Array.<Statement>} stmts List of enclosed statements
     * @returns {Container}
     * @constructor
     */
    function Container(addr, stmts) {
        this.address = addr;
        this.parent = null;         // parent statement this container is assigned to
        this.fallthrough = null;    // another container which this container falls-through to
        this.locals = [];           // a list of local variables declared in this scope
        this.statements = [];       // contained statements

        // set this as the container of all statements enclosed in the block
        stmts.forEach(this.push_stmt, this);
    }

    Container.prototype.push_stmt = function(stmt) {
        stmt.parent = this;

        this.statements.push(stmt);
    };

    Container.prototype.unshift_stmt = function(stmt) {
        stmt.parent = this;

        // TODO: also update statement address to container address?

        this.statements.unshift(stmt);
    };

    Container.prototype.set_fallthrough = function(cntr) {
        if (cntr) {
            cntr.parent = this;
        }

        this.fallthrough = cntr;
    };

    Container.prototype.terminator = function() {
        // normally a terminator would appear as the last statement of the block,
        // but this is not necessarily the case for all architectures
        for (var i = this.statements.length - 1; i >= 0; i--) {
            var stmt = this.statements[i];

            if (Object.getPrototypeOf(stmt).terminating) {
                return stmt;
            }
        }

        return null;
    };

    Container.prototype.pluck = function(detach) {
        var p = this.parent;
        var i = p.containers.indexOf(this);

        if (detach) {
            this.statements.forEach(function(stmt) {
                stmt.pluck(detach);
            });
        }

        // statements refer their child containers (if there are any) by their position, so removing a container
        // must preserve other containers' position.

        return p.containers[i] = null;
    };

    // /**
    //  * Generate a deep copy of this.
    //  * @returns {!Container}
    //  */
    // Container.prototype.clone = function() {
    //     var inst = Object.create(this.constructor.prototype);
    //     var cloned = this.constructor.apply(inst, this.statements.map(function(stmt) { return stmt.clone(); }));
    //
    //     return ((cloned !== null) && (typeof cloned === 'object')) ? cloned : inst;
    // };

    Container.prototype.toString = function() {
        var repr = [
            this.constructor.name,
            this.address.toString(16)
        ];

        return '[' + repr.join(' ') + ']';
    };

    // ------------------------------------------------------------

    return {
        Container: Container
    };
});