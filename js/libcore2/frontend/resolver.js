/** 
 * Copyright (C) 2019 elicn
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
    const Expr = require('js/libcore2/analysis/ir/expressions');
    const Long = require('js/libcore2/libs/long');

    /**
     * Memory helper for memory ranges checks.
     * @constructor
     */
    function MemorySection(name, begin, size) {
        this.name  = name;
        this.begin = begin;
        this.end   = this.begin.add(size || 0);
    };

    /**
     * Used to check if a memory area is inside or outside of the mem section
     * @param  {!Long}  pointer Pointer of the deref
     * @param  {number} size    Number of bits to read
     * @return {boolean}        True if read operation is inside the boundaries
     */
    MemorySection.prototype.inside = function(pointer, size) {
        return pointer && size > 0 && this.begin.ge(pointer) && pointer.add(size).le(this.end);
    };

    var _r2_get_memory_sections = function() {
        return Global.r2cmdj('iSj').filter(function(m) {
            return m.perm.indexOf('r') >= 0 && m.vsize.gt(0) && m.vaddr.ne(0);
        }).map(function(m) {
            return new MemorySection(m.name, m.vaddr, m.vsize);
        });
    };

    var _r2_get_memdata = function(addr, bytes) {
        return (Global.r2cmdj('pxj', bytes, '@', addr) || []).map(function(x) {
            x = x.toString(16);
            return x.length > 1 ? x : '0' + x;
        });
    };

    var _r2_get_fname = function(addr) {
        return Global.r2cmd('afn', '@', addr);
    };

    var _r2_get_flag = function(addr) {
        var flag = undefined;

        // do not get flag for 0; this would probably yield a register name that happens
        // to be evaluated to this number
        if ((0 | addr) !== 0) {
            var fij = Global.r2cmdj('fij', '4', '@', addr);

            if ((fij instanceof Array) && (fij.length > 0)) {
                flag = fij[0].name;
            }
        }

        return flag;
    };

    var _r2_get_string = function(addr) {
        return Global.r2cmd('Cs.', '@', addr);
    };

    var _r2_get_libs_names = function() {
        var ilj = Global.r2cmdj('ilj');

        // for some reason r2 does not keep the name in its original case
        // so we have to canonicalize it for later
        return ilj.map(function(lname) {
            return lname.toLowerCase() + '_';
        });
    };

    /**
     * Resolving helper for xreferences in decompiled function.
     * @constructor
     */
    function Resolver() {
        // prefixes that should be trimmed
        this.prefixes = [
            'sym.',
            'imp.',
            'reloc.'
        ].concat(_r2_get_libs_names());

        this.memory = _r2_get_memory_sections();

        // functions names cache
        this.fcalls = {};

        // strings cache
        this.data = {};

/*
        // prefetch all data and call references from function
        var axffj = Global.r2cmdj('axffj') || [];

        axffj.forEach(function(xref) {
            var key = xref.ref;
            var val = xref.name;

            if (xref.type === 'CALL') {
                this.fcalls[key] = this.demangle(val);
            }

            else if (xref.type === 'DATA') {
                val = _r2_get_string(val);

                this.data[key] = this.demangle(val);
            }
        }, this);
*/
    }

    Resolver.prototype.demangle = function(name) {
        var trimmed = name;

        if (trimmed) {
            this.prefixes.forEach(function(pref) {
                if (trimmed.toLowerCase().startsWith(pref)) {
                    trimmed = trimmed.substring(pref.length);
                }
            });
        }

        return trimmed;
    };

    /**
     * Resolve a callee function name
     * @param {Expr.Val} val Value expression of callee target address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_fname = function(val) {
        var key = val.value.toString();

        // if not cached, retrieve it from r2
        if (!(key in this.fcalls)) {
            this.fcalls[key] = this.demangle(_r2_get_fname(key) || _r2_get_flag(key));
        }

        return this.fcalls[key];
    };

    /**
     * Resolve a data reference
     * @param {Expr.Val} val Value expression of data address
     * @returns {string|undefined}
     */
    Resolver.prototype.resolve_data = function(val, resolve_flags) {
        var key = val.value.toString();

        // if not cached, retrieve it from r2
        if (!(key in this.data)) {
            this.data[key] = this.demangle(_r2_get_string(key) || (resolve_flags && _r2_get_flag(key)));
        }

        return this.data[key];
    };

    /**
     * Verifies if a pointer reference is inside a readable memory
     * @param  {!Long}  pointer Pointer of the deref
     * @param  {number} size    Number of bits to read
     * @returns {boolean}
     */
    Resolver.prototype.verify_deref = function(pointer, size) {
        if (!pointer instanceof Expr.Deref) {
            return false;
        }
        return this.memory.some(function(m) {
            return m.inside(pointer.value, size);
        })
    };

    /**
     * Verifies if a pointer reference is inside a readable memory
     * @param  {!Long}  pointer Pointer of the deref
     * @param  {number} size    Number of bits to read
     * @returns {boolean}
     */
    Resolver.prototype.read_deref = function(pointer, size, big_endian) {
        if (!pointer instanceof Expr.Deref) {
            throw Error("pointer is not a Expr.Deref value");
        }
        var data = _r2_get_memdata(pointer.value.toString(16), size);
        if (!big_endian) {
            data = data.reverse();
        }
        return Long.fromString(data.join(''), false, 16);
    };

    return Resolver;
});