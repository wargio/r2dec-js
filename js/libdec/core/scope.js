// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import Extra from './extra.js';
var __debug = false;

function _print_locals(locals, address, spaced) {
	if (Global().evars.honor.blocks) {
		return;
	}
	var a = Global().printer.auto;
	for (var i = 0; i < locals.length; i++) {
		var local = Extra.is.string(locals[i]) ? a(locals[i]) : locals[i].toString(true);
		Global().context.printLine(Global().context.identfy() + local + ';', address);
	}
	if (spaced && locals.length > 0) {
		Global().context.printLine(Global().context.identfy(), address);
	}
}

function _print_block_data(block) {
	if (Global().evars.honor.blocks) {
		var t = Global().printer.theme;
		var ident = Global().context.identfy();
		var addr = block.address.toString(16);
		Global().context.printLine(ident + t.comment('/* address 0x' + addr + ' */'), block.address);
	}
}

export default {
	brace: function(address) {
		this.address = address;
		this.toString = function() {
			return '}' + (__debug ? Global().printer.theme.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			Global().context.identOut();
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
		};
	},
	custom: function(address, colorname) {
		this.address = address;
		this.colorname = colorname;
		this.toString = function() {
			return this.colorname + ' {' + (__debug ? Global().printer.theme.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
		};
	},
	routine: function(address, extra) {
		this.address = address;
		this.extra = extra;
		this.toString = function() {
			var e = this.extra;
			var t = Global().printer.theme;
			var a = Global().printer.auto;
			return t.types(e.returns) + ' ' + t.callname(e.routine_name) + ' (' + e.args.map(function(x) {
				return Extra.is.string(x) ? a(x) : x.toString(true);
			}).join(', ') + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			var e = this.extra;
			var t = Global().printer.theme;
			_print_locals(e.globals, this.address, true);
			var asmname = Global().evars.honor.offsets ? Extra.align_address(this.address) : '; (fcn) ' + e.name + ' ()';
			var color = Global().evars.honor.offsets ? 'integers' : 'comment';
			var ident = Global().context.identfy(asmname.length, t[color](asmname));
			Global().context.printLine(ident + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
			_print_locals(e.locals, this.address);
		};
	},
	if: function(address, condition, locals) {
		this.address = address;
		this.condition = condition;
		this.locals = locals || [];
		this.toString = function() {
			var t = Global().printer.theme;
			return t.flow('if') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
			_print_locals(this.locals, this.address);
		};
	},
	else: function(address, locals) {
		this.isElse = true;
		this.address = address;
		this.locals = locals || [];
		this.toString = function() {
			var t = Global().printer.theme;
			return '} ' + t.flow('else') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			Global().context.identOut();
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
			_print_locals(this.locals, this.address);
		};
	},
	do: function(address, locals) {
		this.address = address;
		this.locals = locals || [];
		this.toString = function() {
			var t = Global().printer.theme;
			return t.flow('do') + ' {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			Global().context.printLine(Global().context.identfy() + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
			_print_locals(this.locals, this.address);
		};
	},
	while: function(address, condition, locals) {
		this.address = address;
		this.condition = condition;
		this.locals = locals || [];
		this.toString = function() {
			var t = Global().printer.theme;
			return t.flow('while') + ' (' + this.condition + ') {' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
			Global().context.identIn();
			_print_block_data(this);
			_print_locals(this.locals, this.address);
		};
	},
	whileEnd: function(address, condition) {
		this.address = address;
		this.condition = condition;
		this.toString = function() {
			var t = Global().printer.theme;
			return '} ' + t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			Global().context.identOut();
			Global().context.printLine(Global().context.identfy() + this.toString(), this.address);
		};
	},
	whileInline: function(address, condition) {
		this.address = address;
		this.condition = condition;
		this.toString = function() {
			var t = Global().printer.theme;
			return t.flow('while') + ' (' + this.condition + ');' + (__debug ? t.comment(' // 0x' + this.address.toString(16)) : '');
		};
		this.print = function() {
			_print_block_data(this);
			var offset = Global().evars.honor.offsets ? Extra.align_address(this.address) : '';
			Global().context.printLine(Global().context.identfy(offset.length, Global().printer.theme.integers(offset)) + this.toString(), this.address);
		};
	}
};
