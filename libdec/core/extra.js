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


(function() { // lgtm [js/useless-expression]
    const _call_common = require('libdec/db/macros');
    const Long = require('libdec/long');

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

    const _magic_math_values = {
        "0x069c16bd": 'if there is a right shift of 0, then it\'s a division by 665/25756',
        "0x10624dd3": 'if there is a right shift of 4, then it\'s a division by 1/250',
        "0x2aaaaaab": 'if there is a right shift of 0, then it\'s a division by 1/6',
        "0x30c30c31": 'if there is a right shift of 3, then it\'s a division by 1/42',
        "0x38e38e39": 'if there is a right shift of 1, then it\'s a division by 1/9',
        "0x4ec4ec4f": 'if there is a right shift of 3, then it\'s a division by 1/26',
        "0x51eb851f": 'if there is a right shift of 5, then it\'s a division by 1/100',
        "0x55555556": 'if there is a right shift of 0, then it\'s a division by 1/3',
        "0x66666667": 'if there is a right shift of 1, then it\'s a division by 1/5',
        "0x6bca1af3": 'if there is a right shift of 5, then it\'s a division by 1/76',
        "0x88888889": 'if there is a right shift of 8, then it\'s a division by 1/480',
        "0x92492493": 'if there is a right shift of 3, then it\'s a division by 1/14',
        "0xa0a0a0a1": 'if there is a right shift of 7, then it\'s a division by 1/204',
        "0xaaaaaaab": 'if there is a right shift of 1, then it\'s a division by 1/3',
        "0xae147ae1": 'if there is a right shift of 5, then it\'s a division by 17/800',
        "0xb21642c9": 'if there is a right shift of 5, then it\'s a division by 1/46',
        "0xb60b60b7": 'if there is a right shift of 5, then it\'s a division by 1/45',
        "0xba2e8ba3": 'if there is a right shift of 3, then it\'s a division by 1/11',
        "0xea0ea0eb": 'if there is a right shift of 0, then it\'s a division by 32/35',
    };

    var _align_address = function(x) {
        var zeros32 = '00000000';
        var c = x.toString(16);
        if (c.length > zeros32.length) {
            return '0x' + c;
        }
        return '0x' + zeros32.substr(c.length, zeros32.length) + c;
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
                return _call_common[name].required;
            } else if (Global.argdb) {
                var db = Global.argdb;
                for (var k in db) {
                    if (_replace.call(db[k].name.replace(/^_+/, '')) == name) {
                        return parseInt(db[k].count.toString());
                    }
                }
            }
            return -1;
        },
        call_additional: function(name) {
            name = _replace.call(name);
            if (_call_common[name]) {
                return !!_call_common[name].varargs;
            }
            return false;
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
                name = name.substring('sym.imp.'.length).replace(/^_+/, '');
            } else if (name.startsWith('sym.')) {
                name = name.substring('sym.'.length).replace(/^_+/, '');
            } else if (name.startsWith('imp.')) {
                name = name.substring('imp.'.length).replace(/^_+/, '');
                //} else if (name.startsWith('fcn.')) {
                //    name = name.substring('fcn.'.length);
                //} else if (name.startsWith('func.')) {
                //    name = name.substring('func.'.length);
            }
            if (name.startsWith('reloc.')) {
                name = name.substring('reloc.'.length).replace(/^_+/, '');
            }
            name = name.replace(/^sub\./, '');
            if (name.match(/^[\w]+\.dll_/)) {
                name = name.replace(/[\w]+\.dll_/, '');
            }
            name = name.replace(/[Mm][Ss][Vv][Cc][Rr][Tt]\.[Dd][Ll][Ll]_/, '');
            name = name.replace(/\./g, '_');
            return name.replace(/(\w|^):(\w|$)/g, '$1_$2').replace(/_+/g, '_');
        },
        object: function(name) {
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
            if (name.startsWith('L') || name.startsWith('[L')) {
                // java object
                name = name.replace(/\.<init>\(.+$|\(.+$|\._init_.+V$|_L.+$/, '');
                name = name.substr(name.startsWith('L') ? 1 : 2).replace(/\/|;->/g, '.').replace(/\s.+$|;$/, '');
                if (name.indexOf('_L') > 0) {
                    name = name.substring(0, name.indexOf('_L'));
                }
            }
            return name;
        }
    };

    const _tryas = {
        int: function(x) {
            try {
                return Long.fromString(x.trim(), false, (x.trim().indexOf('0x') == 0 ? 16 : 10));
            } catch (e) {}
            return x;
        }
    };

    /**
     * Extra object
     * @return {Function} - Extra object
     */
    return {
        tryas: _tryas,
        is: _is,
        to: _to,
        find: _find,
        replace: _replace,
        align_address: _align_address,
        magic_math: function(address) {
            if (typeof address != 'string') {
                address = '0x' + address.toString(16);
            }
            return _magic_math_values[address];
        }
    };
});