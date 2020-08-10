/* 
 * Copyright (C) 2020 elicn
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
    var r2types = null;

    var load_r2types = function() {
        var tj = Global.r2cmdj('tj');
        var tobj = {};

        tj.forEach(function(o) {
            tobj[o.type] = o.size.toInt() / 8;
        });

        return tobj;
    };

    function BaseType(eobj) {
        this.elems = Array.prototype.concat(eobj.stors, eobj.quals, eobj.sign, eobj.types);
        this.signed = (eobj.sign[0] !== 'unsigned');
        this.size = undefined;
    }

    function Primitive(eobj) {
        BaseType.call(this, eobj);

        var tname = eobj.types.join(' ');

        if (tname.endsWith('int')) {
            tname = tname.slice(0, -4);
        }

        this.size = r2types[tname || 'int'] || (-1);
    }

    Primitive.prototype = Object.create(BaseType.prototype);
    Primitive.prototype.constructor = Primitive;

    function UserDefined(eobj) {
        this.identifier = eobj.types.pop();

        BaseType.call(this, eobj);

        this.size = r2types[this.identifier] || (-1);
    }

    UserDefined.prototype = Object.create(BaseType.prototype);
    UserDefined.prototype.constructor = UserDefined;

    function Arr(i, n) {
        this.itype = i;
        this.nitems = n || 0;
    }

    Arr.prototype.update_nitems = function(size) {
        var isize = this.itype.size;

        this.nitems = (typeof isize === 'number' ? size / isize : '?');
    };

    function Pointer(p) {
        this.ptype = p;
        this.size = r2types['void *'];
    }

    const stors = ['register', 'static', 'extern'];
    const quals = ['const', 'volatile'];
    const signs = ['signed', 'unsigned'];
    const types = ['void', 'char', 'short', 'int', 'long', 'float', 'double'];
    const comps = ['struct', 'union'];

    return {
        Primitive   : Primitive,
        UserDef     : UserDefined,
        Arr         : Arr,
        Ptr         : Pointer,

        make_type: function(typestr) {
            r2types = r2types || load_r2types();

            // split type string elements, detaching '*' and '[]' notations
            var elems = typestr.replace(/(\*|\[\])/g, ' $1').split(' ').filter(Boolean);

            var eobj = {
                stors: [],  // storage elements
                quals: [],  // qualifier elements
                sign:  [],  // sign element
                types: []   // datatype and compound elements
            };

            var clss = Primitive;
            var type = null;

            elems.forEach(function(e) {
                // storage class: basically irrelevant
                if (stors.indexOf(e) !== (-1)) {
                    eobj.stors.push(e);
                }

                // qualifier: basically irrelevant
                else if (quals.indexOf(e) !== (-1)) {
                    eobj.types.push(e);
                }

                else if (signs.indexOf(e) !== (-1)) {
                    if (e !== 'signed') {
                        eobj.sign.push(e);
                    }
                }

                // primitive data type
                else if (types.indexOf(e) !== (-1)) {
                    eobj.types.push(e);
                }

                // compound
                else if (comps.indexOf(e) !== (-1)) {
                    eobj.types.push(e);
                }

                // a pointer
                else if (e === '*') {
                    type = new Pointer(type || new clss(eobj));
                }

                // an array
                else if (e === '[]') {
                    type = new Arr(type || new clss(eobj), undefined);
                }

                else {
                    clss = UserDefined;

                    eobj.types.push(e);
                }
            });

            return type || new clss(eobj);
        }
    };
});
