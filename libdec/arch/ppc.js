/* 
 * Copyright (C) 2017 deroad
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
    return {
        instructions: {
            invalid: function() {
                return null;
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            var mem = '';
            if (asm.match(/\[.+\]/)) {
                mem = asm.match(/\[.+\]/)[0];
            }
            var ret = asm.replace(/\[.+\]/g, '{#}').replace(/,/g, ' ');
            ret = ret.replace(/\s+/g, ' ').trim().split(' ');
            return ret.map(function(a) {
                return a == '{#}' ? mem : a;
            });
        },
        context: function() {
            return {
                cond: {
                    cr0: {
                        a: null,
                        b: null
                    },
                    cr1: {
                        a: null,
                        b: null
                    },
                    cr2: {
                        a: null,
                        b: null
                    },
                    cr3: {
                        a: null,
                        b: null
                    },
                    cr4: {
                        a: null,
                        b: null
                    },
                    cr5: {
                        a: null,
                        b: null
                    },
                    cr6: {
                        a: null,
                        b: null
                    },
                    cr7: {
                        a: null,
                        b: null
                    },
                }
                vars: []
            }
        }
    };
})();