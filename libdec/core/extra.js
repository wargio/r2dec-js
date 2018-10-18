/* 
 * Copyright (c) 2018, Giovanni Dante Grazioli <deroad@libero.it>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */


module.exports = (function() {
    const _call_common = require('libdec/db/macros');

    /**
     * Types size
     * @type {Object}
     */
    const _standard_types = {
        'void': 0,
        'char': 8,
        'short': 16,
        'long': 32,
        'float': 32,
        'long long': 64,
        'double': 64,
    };

    /**
     * Is helpers
     * @type {Object}
     */
    const _is = {
        string: function(s) {
            return typeof s == 'string';
        },
        number: function(s) {
            return typeof s == 'number';
        },
        array: function(s) {
            return Array.isArray(s);
        },
        inObject: function(object, value) {
            for (var k in object) {
                if (object[k] == value) {
                    return true;
                }
            }
            return false;
        },
    };

    /**
     * To helpers
     * @type {Object}
     */
    const _to = {
        type: function(bits, signed) {
            if (bits == 0 || !bits) {
                return 'void';
            }
            return (signed ? 'int' : 'uint') + bits + '_t';
        },
        bits: function(type) {
            var bits = Global.evars.archbits;
            type = type.replace(/[un]?signed\s?/, '');
            if (type.length == 0) {
                type = bits < 32 ? 'int16_t' : 'int32_t';
            }
            if (_standard_types[type]) {
                return _standard_types[type];
            }
            if (type == 'int') {
                return bits < 32 ? 16 : 32;
            }
            return parseInt(type.replace(/[intu_]/g, ''));
        },
        array: function(object) {
            var a = [];
            for (var key in object) {
                a.push(object[key]);
            }
            return a;
        },
    };

    /**
     * Find helpers
     * @type {Object}
     */
    const _find = {
        arguments_number: function(name) {
            name = _replace.call(name);
            if (_call_common[name]) {
                return _call_common[name].args;
            } else if (Global.argdb){
                var db  = Global.argdb;
                for(var k in db) {
                    if (db[k].name == name) {
                        return parseInt(db[k].count);
                    }
                }
            }
            return -1;
        }
    };

    /**
     * Replace helpers
     * @type {Object}
     */
    const _replace = {
        call: function(name) {
            if (typeof name != 'string' || name.startsWith('0x')) {
                return name;
            }
            if (name.startsWith('sym.imp.')) {
                name = name.substring('sym.imp.'.length);
            } else if (name.startsWith('sym.')) {
                name = name.substring('sym.'.length);
            } else if (name.startsWith('imp.')) {
                name = name.substring('imp.'.length);
                //} else if (name.startsWith('fcn.')) {
                //    name = name.substring('fcn.'.length);
                //} else if (name.startsWith('func.')) {
                //    name = name.substring('func.'.length);
            } else if (name.startsWith('reloc.')) {
                name = name.substring('reloc.'.length);
            }
            name = name.replace(/\./g, '_');
            return name.replace(/(\w|^):(\w|$)/g, '$1_$2').replace(/_+/g, '_');
        }
    };

    /**
     * Extra object
     * @return {Function} - Extra object
     */
    return {
        is: _is,
        to: _to,
        find: _find,
        replace: _replace
    };
})();
