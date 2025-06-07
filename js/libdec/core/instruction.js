// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import Condition from './condition.js';
import Extra from './extra.js';
import Long from '../long.js';

var _printable = function(instr) {
	return instr.valid && instr.code && instr.code.toString().length > 0;
};

var _conditional = function(cond) {
	return (new Condition.convert(cond.a, cond.b, cond.type, false)).toString();
};

var _asm_radare2_view = function(instr, ascodeline) {
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
		Global().evars.add_code_line(s.trim(), instr.location);
	} else {
		Global().evars.add_comment(s.trim(), instr.location);
	}
};

var _asm_view = function(instr) {
	var i, t, b, s, addr;
	if (Global().evars.honor.blocks) {
		return;
	}
	if (Global().evars.honor.offsets) {
		t = Global().printer.theme;
		addr = Extra.align_address(instr.location);
		if (instr.code && instr.code.composed) {
			Global().context.printLine(Global().context.identfy(addr.length, t.integers(addr)) + instr.code.composed[0] + ';', instr.location);
			for (i = 1; i < instr.code.composed.length; i++) {
				Global().context.printLine(Global().context.identfy(addr.length, t.integers(addr)) + instr.code.composed[i] + ';', instr.location);
			}
		} else if (_printable(instr)) {
			Global().context.printLine(Global().context.identfy(addr.length, t.integers(addr)) + instr.code + ';', instr.location);
		}
	} else if (Global().evars.honor.assembly) {
		t = Global().printer.theme;
		b = Global().printer.auto;
		addr = Extra.align_address(instr.location);
		s = 1 + addr.length + instr.simplified.length;
		if (instr.code && instr.code.composed) {
			Global().context.printLine(Global().context.identfy(s, t.integers(addr) + ' ' + b(instr.simplified)) + instr.code.composed[0] + ';', instr.location);
			for (i = 1; i < instr.code.composed.length; i++) {
				Global().context.printLine(Global().context.identfy() + instr.code.composed[i] + ';', instr.location);
			}
		} else {
			Global().context.printLine(Global().context.identfy(s, t.integers(addr) + ' ' + b(instr.simplified)) + (_printable(instr) ? (instr.code + ';') : ''), instr.location);
		}
	} else {
		if (instr.code && instr.code.composed) {
			for (i = 0; i < instr.code.composed.length; i++) {
				Global().context.printLine(Global().context.identfy() + instr.code.composed[i] + ';', instr.location);
			}
		} else if (_printable(instr)) {
			Global().context.printLine(Global().context.identfy() + instr.code + ';', instr.location);
		}
	}
};

var _instruction = function(data, arch, marker) {
	this.code = null;
	this.marker = marker;
	this.valid = true;
	this.jump = data.jump ? Long.from(data.jump, true) : null;
	this.type = data.type;
	this.pointer = (data.ptr && Long.ZERO.lt(data.ptr)) ? data.ptr : null;
	this.location = Long.from(data.addr?? data.offset, true);
	this.assembly = data.disasm || data.opcode;
	this.simplified = data.opcode;
	this.cpp_type = this.assembly.match(/(class|method|struct)\s[\w:]+(<[\w:<, >]+>)?\s+/);
	if (this.cpp_type) {
		this.assembly = this.assembly.replace(this.cpp_type[0], '');
	}
	this.parsed = arch.parse(this.assembly, this.simplified);
	this.string = null;
	this.symbol = null;
	this.klass = null;
	this.callee = null;
	this.label = null;
	this.cond = null;
	this.customflow = null;
	this.xrefs = data.xrefs ? data.xrefs.slice() : [];
	this.refs = data.refs ? data.refs.slice() : [];
	this.comments = data.comment ? [atob(data.comment)] : [];
	if (Global().evars.honor.xrefs) {
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
		var t = Global().printer.theme;
		var empty = Global().context.identfy();
		if (this.comments.length == 1) {
			Global().context.printLine(empty + t.comment('/* ' + this.comments[0] + ' */'), this.location);
		} else if (this.comments.length > 1) {
			Global().context.printLine(empty + t.comment('/* ' + this.comments[0]), this.location);
			for (var i = 1; i < this.comments.length; i++) {
				var comment = ' * ' + this.comments[i] + (i == this.comments.length - 1 ? ' */' : '');
				Global().context.printLine(empty + t.comment(comment), this.location);
			}
		}
		if (this.label) {
			Global().context.printLine(Global().context.identfy(null, null, true) + this.label + ':', this.location);
		}
		_asm_view(this);
	};
	this.ascomment = function() {
		_asm_radare2_view(this, false);
	};
	this.ascodeline = function() {
		_asm_radare2_view(this, true);
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

export default _instruction;
