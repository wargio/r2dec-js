/* 
 * Copyright (C) 2018 deroad
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

(function() { // lgtm [js/useless-expression]
    const Anno = require('libdec/annotation');
    const Long = require('libdec/long');
    const Condition = require('libdec/core/condition');
    const Extra = require('libdec/core/extra');

    var _printable = function(instr) {
        return instr.valid && instr.code && instr.code.toString().length > 0;
    };

    var _conditional = function(cond) {
        return (new Condition.convert(cond.a, cond.b, cond.type, false)).toString();
    };

    var _asm_r2_view = function(instr, ascodeline) {
        var s = '';
        if (instr.label) {
            s = instr.label.name + ":\n";
        }
        if (instr.code && instr.code.composed) {
            if (instr.cond && instr.jump) {
                s += (instr.jump.gt(instr.location) ? "if" : "while") + " (" + _conditional(instr.cond) + ") {\n";
            }
            for (var i = 0; i < instr.code.composed.length; i++) {
                s += instr.code.composed[i] + '\n';
            }
            if (instr.cond && instr.jump) {
                s += "}\n";
            }
        } else if (_printable(instr)) {
            if (instr.cond && instr.jump) {
                s += "if (" + _conditional(instr.cond) + ") " + instr.code + "\n";
            } else {
                s += instr.code + "\n";
            }
        } else if (instr.cond && !_printable(instr) && instr.jump) {
            s += "if (" + _conditional(instr.cond) + ") goto 0x" + instr.jump.toString(16);
        }

        if (ascodeline) {
            Global.evars.add_code_line(s.trim(), instr.location);
        } else {
            Global.evars.add_comment(s.trim(), instr.location);
        }
    };

    var _asm_view = function(instr) {
        var i, t, b, s, addr;
        if (Global.evars.honor.blocks) {
            return;
        }
        if (Global.evars.honor.offsets) {
            t = Global.printer.theme;
            addr = Extra.align_address(instr.location);
            if (instr.code && instr.code.composed) {
                Global.context.printLine(Global.context.identfy(addr.length, t.integers(addr)) + instr.code.composed[0] + ';', instr.location);
                for (i = 1; i < instr.code.composed.length; i++) {
                    Global.context.printLine(Global.context.identfy(addr.length, t.integers(addr)) + instr.code.composed[i] + ';', instr.location);
                }
            } else if (_printable(instr)) {
                Global.context.printLine(Global.context.identfy(addr.length, t.integers(addr)) + instr.code + ';', instr.location);
            }
        } else if (Global.evars.honor.assembly) {
            t = Global.printer.theme;
            b = Global.printer.auto;
            addr = Extra.align_address(instr.location);
            s = 1 + addr.length + instr.simplified.length;
            if (instr.code && instr.code.composed) {
                Global.context.printLine(Global.context.identfy(s, t.integers(addr) + ' ' + b(instr.simplified)) + instr.code.composed[0] + ';', instr.location);
                for (i = 1; i < instr.code.composed.length; i++) {
                    Global.context.printLine(Global.context.identfy() + instr.code.composed[i] + ';', instr.location);
                }
            } else {
                Global.context.printLine(Global.context.identfy(s, t.integers(addr) + ' ' + b(instr.simplified)) + (_printable(instr) ? (instr.code + ';') : ''), instr.location);
            }
        } else {
            if (instr.code && instr.code.composed) {
                for (i = 0; i < instr.code.composed.length; i++) {
                    if (Global.evars.extra.annotation) {
                        Global.context.addAnnotation(Global.context.identfy(), instr.location);
                        Global.context.addAnnotations(Anno.auto(instr.code.composed[i], instr.location));
                        Global.context.addAnnotation(';\n', instr.location);
                    } else {
                        Global.context.printLine(Global.context.identfy() + instr.code.composed[i] + ';', instr.location);
                    }
                }
            } else if (_printable(instr)) {
                if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(Global.context.identfy(), instr.location);
                    Global.context.addAnnotations(Anno.auto(instr.code, instr.location));
                    Global.context.addAnnotation(';\n', instr.location);
                } else {
                    Global.context.printLine(Global.context.identfy() + instr.code + ';', instr.location);
                }
            }
        }
    };

    var _instruction = function(data, arch, marker) {
        this.code = null;
        this.marker = marker;
        this.valid = true;
        this.jump = data.jump;
        this.type = data.type;
        this.pointer = (data.ptr && Long.ZERO.lt(data.ptr)) ? data.ptr : null;
        this.location = data.offset;
        this.assembly = data.disasm || data.opcode;
        this.simplified = data.opcode;
        this.parsed = arch.parse(this.assembly, this.simplified);
        this.string = null;
        this.symbol = null;
        this.klass  = null;
        this.callee = null;
        this.label = null;
        this.cond = null;
        this.customflow = null;
        this.xrefs = data.xrefs ? data.xrefs.slice() : [];
        this.refs = data.refs ? data.refs.slice() : [];
        this.comments = data.comment ? [new TextDecoder().decode(Duktape.dec('base64', data.comment))] : [];
        if (Global.evars.honor.xrefs) {
            for (var i = 0; i < this.xrefs.length; i++) {
                var e = 'XREF ' + this.xrefs[i].type + ": 0x" + this.xrefs[i].addr.toString(16);
                this.comments.push(e);
            }
        }

        this.conditional = function(a, b, type) {
            if (type) {
                this.cond = {
                    a: a,
                    b: b,
                    type: type
                };
            }
        };

        this.setBadJump = function() {
            this.jump = null;
        };

        this.print = function() {
            var t = Global.printer.theme;
            var empty = Global.context.identfy();
            if (this.comments.length == 1) {
                if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(empty, this.location);
                    Global.context.addAnnotation(Anno.comment('/* ' + this.comments[0] + ' */\n', this.location));
                } else {
                    Global.context.printLine(empty + t.comment('/* ' + this.comments[0] + ' */', this.location));
                }
            } else if (this.comments.length > 1) {
                if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(empty, this.location);
                    Global.context.addAnnotation(Anno.comment('/* ' + this.comments[0] + '\n', this.location));
                } else {
                    Global.context.printLine(empty + t.comment('/* ' + this.comments[0]), this.location);
                }
                for (var i = 1; i < this.comments.length; i++) {
                    var comment = ' * ' + this.comments[i] + (i == this.comments.length - 1 ? ' */' : '');
                    if (Global.evars.extra.annotation) {
                        Global.context.addAnnotation(empty, this.location);
                        Global.context.addAnnotation(Anno.comment(comment + '\n', this.location));
                    } else {
                        Global.context.printLine(empty + t.comment(comment), this.location);
                    }
                }
            }
            if (this.label) {
                if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(Global.context.identfy(null, null, true), this.location);
                    Global.context.addAnnotation(Anno.keyword(this.label + ':\n', this.location));
                } else {
                    Global.context.printLine(Global.context.identfy(null, null, true) + this.label + ':', this.location);
                }
            }
            _asm_view(this);
        };
        this.ascomment = function() {
            _asm_r2_view(this, false);
        };
        this.ascodeline = function() {
            _asm_r2_view(this, true);
        };
    };

    _instruction.swap = function(instructions, index_a, index_b) {
        var a = instructions[index_a];
        var b = instructions[index_b];
        instructions[index_b] = a;
        instructions[index_a] = b;

        var a_loc = a.location;

        a.location = b.location;
        b.location = a_loc;


        if (a.jump && b.location.eq(a.jump)) {
            a.jump = a.location;
        } else if (b.jump && a.location.eq(b.jump)) {
            b.jump = b.location;
        }
    };

    return _instruction;
});