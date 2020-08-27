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
    const Extra = require('libdec/core/extra');
    const Anno = require('libdec/annotation');
    var __debug = false;

    function _annotate_var(local, address) {
        if (Extra.is.string(local)) {
            if (local.indexOf(" ") > 0 && !local.startsWith('"')) {
                var u = local.split(" ");
                Global.context.addAnnotation(Anno.datatype(u.shift(), this.address));
                while (u.length > 1) {
                    Global.context.addAnnotation(" " + u.shift(), this.address);
                }
                Global.context.addAnnotation(" ", this.address);
                local = u[0];
            }
            if (local) {
                Global.context.addAnnotation(Anno.localvar(local, address));
            }
        } else {
            Global.context.addAnnotations(local.toAnnotation(address));
        }
    }

    function _annotate_locals(locals, address) {
        for (var i = 0; i < locals.length; i++) {
            var space = Global.context.identfy();
            if (space.length > 0) {
                Global.context.addAnnotation(space, address);
            }
            _annotate_var(locals[i], address);
            Global.context.addAnnotation(';\n', address);
        }
    }

    function _print_locals(locals, address, spaced) {
        if (Global.evars.honor.blocks) {
            return;
        }
        var a = Global.printer.auto;
        for (var i = 0; i < locals.length; i++) {
            var local = Extra.is.string(locals[i]) ? a(locals[i]) : locals[i].toString(true);
            Global.context.printLine(Global.context.identfy() + local + ';', address);
        }
        if (spaced && locals.length > 0) {
            Global.context.printLine(Global.context.identfy(), address);
        }
    }

    function _print_block_data(block) {
        if (Global.evars.honor.blocks) {
            var t = Global.printer.theme;
            var ident = Global.context.identfy();
            var addr = block.address.toString(16);
            Global.context.printLine(ident + t.comment('/* address 0x' + addr + ' */'));
        }
    }

    return {
        brace: function(address) {
            this.address = address;
            this.toString = function() {
                return '}' + (__debug ? Global.printer.theme.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                Global.context.identOut();
                if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(Global.context.identfy() + '}\n', this.address);
                    return;
                }
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString(), this.address);
            };
        },
        custom: function(address, colorname) {
            this.address = address;
            this.colorname = colorname;
            this.addAnnotation = function() {
                Global.context.addAnnotations(this.colorname.toAnnotation(this.address));
                Global.context.addAnnotation(' {\n', this.address);
            };
            this.toString = function() {
                return this.colorname + ' {' + (__debug ? Global.printer.theme.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    this.toAnnotation();
                    Global.context.identIn();
                    return;
                }
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString(), this.address);
                Global.context.identIn();
                _print_block_data(this);
            };
        },
        routine: function(address, extra) {
            this.address = address;
            this.extra = extra;
            this.addAnnotation = function() {
                var e = this.extra;
                Global.context.addAnnotations([
                    Anno.datatype(e.returns, this.address),
                    Anno.offset(' ', this.address),
                    Anno.funcname(e.routine_name, this.address),
                    Anno.offset(' (', this.address)
                ]);
                e.args.forEach(function(x, i, a) {
                    _annotate_var(x, this.address);
                    if ((i + 1) < a.length) {
                        Global.context.addAnnotation(', ', this.address);
                    }
                });
                Global.context.addAnnotation(') {\n', this.address);
            };
            this.toString = function() {
                var e = this.extra;
                var t = Global.printer.theme;
                var a = Global.printer.auto;
                return t.types(e.returns) + ' ' + t.callname(e.routine_name) + ' (' + e.args.map(function(x) {
                    return Extra.is.string(x) ? a(x) : x.toString(true);
                }).join(', ') + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    _annotate_locals(this.extra.globals, this.address);
                    this.addAnnotation();
                    Global.context.identIn();
                    _annotate_locals(this.extra.locals, this.address);
                    return;
                }
                var e = this.extra;
                var t = Global.printer.theme;
                _print_locals(e.globals, this.address, true);
                var asmname = Global.evars.honor.offsets ? Extra.align_address(this.address) : '; (fcn) ' + e.name + ' ()';
                var color = Global.evars.honor.offsets ? 'integers' : 'comment';
                var ident = Global.context.identfy(asmname.length, t[color](asmname));
                Global.context.printLine(ident + this.toString(), this.address);
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(e.locals, this.address);
            };
        },
        if: function(address, condition, locals) {
            this.address = address;
            this.condition = condition;
            this.locals = locals || [];
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy(), this.address),
                    Anno.keyword('if', this.address),
                    Anno.offset(' ( ', this.address),
                ]);
                Anno.auto(this.condition, this.address).forEach(function(x) {
                    Global.context.addAnnotation(x);
                });
                Global.context.addAnnotation(' ) {\n', this.address);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('if') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    this.addAnnotation();
                    Global.context.identIn();
                    _annotate_locals(this.locals, this.address);
                    return;
                }
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString(), this.address);
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals, this.address);
            };
        },
        else: function(address, locals) {
            this.isElse = true;
            this.address = address;
            this.locals = locals || [];
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy() + '} ', this.address),
                    Anno.keyword('else', this.address),
                    Anno.offset(' {\n', this.address),
                ]);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return '} ' + t.flow('else') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    Global.context.identOut();
                    this.addAnnotation();
                    Global.context.identIn();
                    _annotate_locals(this.locals, this.address);
                    return;
                }
                Global.context.identOut();
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString());
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals, this.address);
            };
        },
        do: function(address, locals) {
            this.address = address;
            this.locals = locals || [];
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy(), this.address),
                    Anno.keyword('do', this.address),
                    Anno.offset(' {\n', this.address),
                ]);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('do') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    this.addAnnotation();
                    Global.context.identIn();
                    _annotate_locals(this.locals, this.address);
                    return;
                }
                Global.context.printLine(Global.context.identfy() + this.toString(), this.address);
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals, this.address);
            };
        },
        while: function(address, condition, locals) {
            this.address = address;
            this.condition = condition;
            this.locals = locals || [];
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy(), this.address),
                    Anno.keyword('while', this.address),
                    Anno.offset(' (', this.address),
                ]);
                Anno.auto(this.condition, this.address).forEach(function(x) {
                    Global.context.addAnnotation(x);
                });
                Global.context.addAnnotation(' ) {\n', this.address);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('while') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    this.addAnnotation();
                    Global.context.identIn();
                    _annotate_locals(this.locals, this.address);
                    return;
                }
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString(), this.address);
                Global.context.identIn();
                _print_block_data(this);
                _print_locals(this.locals, this.address);
            };
        },
        whileEnd: function(address, condition) {
            this.address = address;
            this.condition = condition;
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy() + '} ', this.address),
                    Anno.keyword('while', this.address),
                    Anno.offset(' (', this.address),
                ]);
                Anno.auto(this.condition, this.address).forEach(function(x) {
                    Global.context.addAnnotation(x);
                });
                Global.context.addAnnotation(');\n', this.address);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return '} ' + t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                Global.context.identOut();
                if (Global.evars.extra.annotation) {
                    this.addAnnotation();
                    return;
                }
                Global.context.printLine(Global.context.identfy() + this.toString(), this.address);
            };
        },
        whileInline: function(address, condition) {
            this.address = address;
            this.condition = condition;
            this.addAnnotation = function() {
                Global.context.addAnnotations([
                    Anno.offset(Global.context.identfy(), this.address),
                    Anno.keyword('while', this.address),
                    Anno.offset(' (', this.address),
                ]);
                Anno.auto(this.condition, this.address).forEach(function(x) {
                    Global.context.addAnnotation(x);
                });
                Global.context.addAnnotation(');\n', this.address);
            };
            this.toString = function() {
                var t = Global.printer.theme;
                return t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
            };
            this.print = function() {
                if (Global.evars.extra.annotation) {
                    this.addAnnotation();
                    return;
                }
                _print_block_data(this);
                var offset = Global.evars.honor.offsets ? Extra.align_address(this.address) : '';
                Global.context.printLine(Global.context.identfy(offset.length, Global.printer.theme.integers(offset)) + this.toString(), this.address);
            };
        }
    };
});
