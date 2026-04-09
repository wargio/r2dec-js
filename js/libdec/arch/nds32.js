// SPDX-FileCopyrightText: 2026 pancake <pancake@nopcode.org>
// SPDX-License-Identifier: BSD-3-Clause

import Base from '../core/base.js';
import Variable from '../core/variable.js';

var _arg = function(instr, n) {
	return instr.parsed.opd[n] || '';
};

var _load = function(instr, bits, signed) {
	var e = instr.parsed;
	if (e.opd.length == 3) {
		return Base.read_memory(e.opd[1] + ' + ' + e.opd[2], e.opd[0], bits, signed);
	}
	return Base.read_memory(e.opd[1], e.opd[0], bits, signed);
};

var _store = function(instr, bits, signed) {
	var e = instr.parsed;
	if (e.opd.length == 3) {
		return Base.write_memory(e.opd[1] + ' + ' + e.opd[2], e.opd[0], bits, signed);
	}
	return Base.write_memory(e.opd[1], e.opd[0], bits, signed);
};

var _load_bi = function(instr, bits, signed) {
	var e = instr.parsed;
	var inc = e.opd.slice(2).join(' ') || '0';
	var ops = [
		Base.read_memory(e.opd[1], e.opd[0], bits, signed),
		Base.increase(e.opd[1], inc)
	];
	return Base.composed(ops);
};

var _store_bi = function(instr, bits, signed) {
	var e = instr.parsed;
	var inc = e.opd.slice(2).join(' ') || '0';
	var ops = [
		Base.write_memory(e.opd[1], e.opd[0], bits, signed),
		Base.increase(e.opd[1], inc)
	];
	return Base.composed(ops);
};

var _math3 = function(instr, op) {
	var e = instr.parsed;
	return op(e.opd[0], e.opd[1], e.opd[2]);
};

var _math2 = function(instr, op) {
	var e = instr.parsed;
	return op(e.opd[0], e.opd[0], e.opd[1]);
};

export default {
	instructions: {
		/* MOVES */
		mov55: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		mov: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		movi55: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		movi: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		movpi45: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		movd44: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		sethi: function(instr) {
			return Base.assign(_arg(instr, 0), '(' + _arg(instr, 1) + ' << 12)');
		},
		/* ARITHMETIC */
		add: function(instr) {
			return _math3(instr, Base.add);
		},
		add333: function(instr) {
			return _math3(instr, Base.add);
		},
		add45: function(instr) {
			return _math2(instr, Base.add);
		},
		addi: function(instr) {
			return _math3(instr, Base.add);
		},
		addi333: function(instr) {
			return _math3(instr, Base.add);
		},
		addi45: function(instr) {
			return _math2(instr, Base.add);
		},
		'addi.gp': function(instr) {
			return Base.add(_arg(instr, 0), '$gp', _arg(instr, 1));
		},
		addri36: function(instr) {
			return Base.add(_arg(instr, 0), '$sp', _arg(instr, 1));
		},
		'addri36.sp': function(instr) {
			return Base.add(_arg(instr, 0), '$sp', _arg(instr, 1));
		},
		addi10s: function(instr) {
			return Base.increase('$sp', _arg(instr, 0));
		},
		add_slli: function(instr) {
			var e = instr.parsed;
			return Base.add(e.opd[0], e.opd[1], '(' + e.opd[2] + ' << ' + e.opd[3] + ')');
		},
		add_srli: function(instr) {
			var e = instr.parsed;
			return Base.add(e.opd[0], e.opd[1], '(' + e.opd[2] + ' >> ' + e.opd[3] + ')');
		},
		sub_slli: function(instr) {
			var e = instr.parsed;
			return Base.subtract(e.opd[0], e.opd[1], '(' + e.opd[2] + ' << ' + e.opd[3] + ')');
		},
		sub_srli: function(instr) {
			var e = instr.parsed;
			return Base.subtract(e.opd[0], e.opd[1], '(' + e.opd[2] + ' >> ' + e.opd[3] + ')');
		},
		sub: function(instr) {
			return _math3(instr, Base.subtract);
		},
		sub333: function(instr) {
			return _math3(instr, Base.subtract);
		},
		sub45: function(instr) {
			return _math2(instr, Base.subtract);
		},
		subi333: function(instr) {
			return _math3(instr, Base.subtract);
		},
		subi45: function(instr) {
			return _math2(instr, Base.subtract);
		},
		subri: function(instr) {
			return Base.subtract(_arg(instr, 0), _arg(instr, 1), _arg(instr, 2));
		},
		neg33: function(instr) {
			return Base.negate(_arg(instr, 0), _arg(instr, 1));
		},
		mul: function(instr) {
			return _math3(instr, Base.multiply);
		},
		mul33: function(instr) {
			return _math2(instr, Base.multiply);
		},
		maddr32: function(instr) {
			var e = instr.parsed;
			return Base.add(e.opd[0], e.opd[0], '(' + e.opd[1] + ' * ' + e.opd[2] + ')');
		},
		msubr32: function(instr) {
			var e = instr.parsed;
			return Base.subtract(e.opd[0], e.opd[0], '(' + e.opd[1] + ' * ' + e.opd[2] + ')');
		},
		divr: function(instr) {
			var e = instr.parsed;
			if (e.opd.length == 4) {
				return Base.divide(e.opd[0], e.opd[2], e.opd[3]);
			}
			return Base.divide(e.opd[0], e.opd[1], e.opd[2]);
		},
		divsr: function(instr) {
			var e = instr.parsed;
			if (e.opd.length == 4) {
				return Base.divide(e.opd[0], e.opd[2], e.opd[3]);
			}
			return Base.divide(e.opd[0], e.opd[1], e.opd[2]);
		},
		min: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], 'MIN(' + e.opd[1] + ', ' + e.opd[2] + ')');
		},
		max: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], 'MAX(' + e.opd[1] + ', ' + e.opd[2] + ')');
		},
		mulr64: function(instr) {
			return _math3(instr, Base.multiply);
		},
		clips: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], 'CLIPS(' + e.opd[1] + ', ' + e.opd[2] + ')');
		},
		/* LOGIC */
		and: function(instr) {
			return _math3(instr, Base.and);
		},
		and33: function(instr) {
			return _math2(instr, Base.and);
		},
		andi: function(instr) {
			return _math3(instr, Base.and);
		},
		or: function(instr) {
			return _math3(instr, Base.or);
		},
		or33: function(instr) {
			return _math2(instr, Base.or);
		},
		ori: function(instr) {
			return _math3(instr, Base.or);
		},
		xor: function(instr) {
			return _math3(instr, Base.xor);
		},
		xor33: function(instr) {
			return _math2(instr, Base.xor);
		},
		xori: function(instr) {
			return _math3(instr, Base.xor);
		},
		nor: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], '~(' + e.opd[1] + ' | ' + e.opd[2] + ')');
		},
		not33: function(instr) {
			return Base.not(_arg(instr, 0), _arg(instr, 1));
		},
		bitci: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[1], '~' + e.opd[2]);
		},
		bitc: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[1], '~' + e.opd[2]);
		},
		or_slli: function(instr) {
			var e = instr.parsed;
			return Base.or(e.opd[0], e.opd[1], '(' + e.opd[2] + ' << ' + e.opd[3] + ')');
		},
		or_srli: function(instr) {
			var e = instr.parsed;
			return Base.or(e.opd[0], e.opd[1], '(' + e.opd[2] + ' >> ' + e.opd[3] + ')');
		},
		xor_slli: function(instr) {
			var e = instr.parsed;
			return Base.xor(e.opd[0], e.opd[1], '(' + e.opd[2] + ' << ' + e.opd[3] + ')');
		},
		xor_srli: function(instr) {
			var e = instr.parsed;
			return Base.xor(e.opd[0], e.opd[1], '(' + e.opd[2] + ' >> ' + e.opd[3] + ')');
		},
		and_slli: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[1], '(' + e.opd[2] + ' << ' + e.opd[3] + ')');
		},
		and_srli: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[1], '(' + e.opd[2] + ' >> ' + e.opd[3] + ')');
		},
		/* SHIFTS */
		slli: function(instr) {
			return _math3(instr, Base.shift_left);
		},
		sll: function(instr) {
			return _math3(instr, Base.shift_left);
		},
		slli333: function(instr) {
			return _math3(instr, Base.shift_left);
		},
		srli: function(instr) {
			return _math3(instr, Base.shift_right);
		},
		srl: function(instr) {
			return _math3(instr, Base.shift_right);
		},
		srli45: function(instr) {
			return _math2(instr, Base.shift_right);
		},
		srai: function(instr) {
			return _math3(instr, Base.shift_right);
		},
		sra: function(instr) {
			return _math3(instr, Base.shift_right);
		},
		srai45: function(instr) {
			return _math2(instr, Base.shift_right);
		},
		rotri: function(instr) {
			return Base.rotate_right(_arg(instr, 0), _arg(instr, 1), _arg(instr, 2), 32);
		},
		rotr: function(instr) {
			return Base.rotate_right(_arg(instr, 0), _arg(instr, 1), _arg(instr, 2), 32);
		},
		/* SIGN/ZERO EXTENSION */
		seb: function(instr) {
			return Base.extend(_arg(instr, 0), _arg(instr, 1), 8);
		},
		seb33: function(instr) {
			return Base.extend(_arg(instr, 0), _arg(instr, 1), 8);
		},
		seh: function(instr) {
			return Base.extend(_arg(instr, 0), _arg(instr, 1), 16);
		},
		seh33: function(instr) {
			return Base.extend(_arg(instr, 0), _arg(instr, 1), 16);
		},
		zeb: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '0xff');
		},
		zeb33: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '0xff');
		},
		zeh: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '0xffff');
		},
		zeh33: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '0xffff');
		},
		xlsb: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '1');
		},
		xlsb33: function(instr) {
			return Base.and(_arg(instr, 0), _arg(instr, 1), '1');
		},
		/* COMPARE / SET-LESS-THAN */
		slt: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[1];
			context.cond.b = e.opd[2];
			return Base.assign(e.opd[0], '(' + e.opd[1] + ' < ' + e.opd[2] + ')');
		},
		slts: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[1];
			context.cond.b = e.opd[2];
			return Base.assign(e.opd[0], '(' + e.opd[1] + ' < ' + e.opd[2] + ')');
		},
		slt45: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[0];
			context.cond.b = e.opd[1];
			return Base.assign('$ta', '(' + e.opd[0] + ' < ' + e.opd[1] + ')');
		},
		slts45: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[0];
			context.cond.b = e.opd[1];
			return Base.assign('$ta', '(' + e.opd[0] + ' < ' + e.opd[1] + ')');
		},
		slti: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[1];
			context.cond.b = e.opd[2];
			return Base.assign(e.opd[0], '(' + e.opd[1] + ' < ' + e.opd[2] + ')');
		},
		sltsi: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[1];
			context.cond.b = e.opd[2];
			return Base.assign(e.opd[0], '(' + e.opd[1] + ' < ' + e.opd[2] + ')');
		},
		slti45: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[0];
			context.cond.b = e.opd[1];
			return Base.assign('$ta', '(' + e.opd[0] + ' < ' + e.opd[1] + ')');
		},
		sltsi45: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = e.opd[0];
			context.cond.b = e.opd[1];
			return Base.assign('$ta', '(' + e.opd[0] + ' < ' + e.opd[1] + ')');
		},
		/* CONDITIONAL MOVE */
		cmovz: function(instr) {
			var e = instr.parsed;
			return Base.conditional_assign(e.opd[0], e.opd[2], '0', 'EQ', e.opd[1], e.opd[0]);
		},
		cmovn: function(instr) {
			var e = instr.parsed;
			return Base.conditional_assign(e.opd[0], e.opd[2], '0', 'NE', e.opd[1], e.opd[0]);
		},
		/* LOADS */
		lwi: function(instr) {
			return _load(instr, 32, false);
		},
		lwi333: function(instr) {
			return _load(instr, 32, false);
		},
		lwi450: function(instr) {
			return _load(instr, 32, false);
		},
		lwi37: function(instr) {
			return _load(instr, 32, false);
		},
		'lwi37.sp': function(instr) {
			return Base.read_memory('$sp + ' + _arg(instr, 1), _arg(instr, 0), 32, false);
		},
		'lwi45.fe': function(instr) {
			return Base.read_memory('$fp + ' + _arg(instr, 1), _arg(instr, 0), 32, false);
		},
		'lwi.gp': function(instr) {
			return Base.read_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 32, false);
		},
		lwsi: function(instr) {
			return _load(instr, 32, true);
		},
		lhi: function(instr) {
			return _load(instr, 16, false);
		},
		lhi333: function(instr) {
			return _load(instr, 16, false);
		},
		'lhi.gp': function(instr) {
			return Base.read_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 16, false);
		},
		lhsi: function(instr) {
			return _load(instr, 16, true);
		},
		'lhsi.gp': function(instr) {
			return Base.read_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 16, true);
		},
		lbi: function(instr) {
			return _load(instr, 8, false);
		},
		lbi333: function(instr) {
			return _load(instr, 8, false);
		},
		'lbi.gp': function(instr) {
			return Base.read_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 8, false);
		},
		lbsi: function(instr) {
			return _load(instr, 8, true);
		},
		'lbsi.gp': function(instr) {
			return Base.read_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 8, true);
		},
		ldi: function(instr) {
			return _load(instr, 64, false);
		},
		lw: function(instr) {
			return _load(instr, 32, false);
		},
		lh: function(instr) {
			return _load(instr, 16, false);
		},
		lb: function(instr) {
			return _load(instr, 8, false);
		},
		ld: function(instr) {
			return _load(instr, 64, false);
		},
		lbs: function(instr) {
			return _load(instr, 8, true);
		},
		lhs: function(instr) {
			return _load(instr, 16, true);
		},
		lws: function(instr) {
			return _load(instr, 32, true);
		},
		llw: function(instr) {
			return _load(instr, 32, false);
		},
		/* FLOAT LOADS */
		fldi: function(instr) {
			return _load(instr, 64, false);
		},
		'fldi.bi': function(instr) {
			return _load_bi(instr, 64, false);
		},
		flsi: function(instr) {
			return _load(instr, 32, false);
		},
		'flsi.bi': function(instr) {
			return _load_bi(instr, 32, false);
		},
		'fld.bi': function(instr) {
			return _load_bi(instr, 64, false);
		},
		/* LOAD POST-INCREMENT */
		'lwi.bi': function(instr) {
			return _load_bi(instr, 32, false);
		},
		'lhi.bi': function(instr) {
			return _load_bi(instr, 16, false);
		},
		'lbi.bi': function(instr) {
			return _load_bi(instr, 8, false);
		},
		'ldi.bi': function(instr) {
			return _load_bi(instr, 64, false);
		},
		'lbsi.bi': function(instr) {
			return _load_bi(instr, 8, true);
		},
		'lhsi.bi': function(instr) {
			return _load_bi(instr, 16, true);
		},
		'lwsi.bi': function(instr) {
			return _load_bi(instr, 32, true);
		},
		'lwi333.bi': function(instr) {
			return _load_bi(instr, 32, false);
		},
		/* STORES */
		swi: function(instr) {
			return _store(instr, 32, false);
		},
		swi333: function(instr) {
			return _store(instr, 32, false);
		},
		swi450: function(instr) {
			return _store(instr, 32, false);
		},
		swi37: function(instr) {
			return _store(instr, 32, false);
		},
		'swi37.sp': function(instr) {
			return Base.write_memory('$sp + ' + _arg(instr, 1), _arg(instr, 0), 32, false);
		},
		'swi.gp': function(instr) {
			return Base.write_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 32, false);
		},
		shi: function(instr) {
			return _store(instr, 16, false);
		},
		shi333: function(instr) {
			return _store(instr, 16, false);
		},
		'shi.gp': function(instr) {
			return Base.write_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 16, false);
		},
		sbi: function(instr) {
			return _store(instr, 8, false);
		},
		sbi333: function(instr) {
			return _store(instr, 8, false);
		},
		'sbi.gp': function(instr) {
			return Base.write_memory('$gp + ' + _arg(instr, 1), _arg(instr, 0), 8, false);
		},
		sdi: function(instr) {
			return _store(instr, 64, false);
		},
		sw: function(instr) {
			return _store(instr, 32, false);
		},
		sh: function(instr) {
			return _store(instr, 16, false);
		},
		sb: function(instr) {
			return _store(instr, 8, false);
		},
		sd: function(instr) {
			return _store(instr, 64, false);
		},
		scw: function(instr) {
			return _store(instr, 32, false);
		},
		/* FLOAT STORES */
		fsd: function(instr) {
			return _store(instr, 64, false);
		},
		fsdi: function(instr) {
			return _store(instr, 64, false);
		},
		'fsdi.bi': function(instr) {
			return _store_bi(instr, 64, false);
		},
		fss: function(instr) {
			return _store(instr, 32, false);
		},
		fssi: function(instr) {
			return _store(instr, 32, false);
		},
		'fssi.bi': function(instr) {
			return _store_bi(instr, 32, false);
		},
		/* STORE POST-INCREMENT */
		'swi.bi': function(instr) {
			return _store_bi(instr, 32, false);
		},
		'shi.bi': function(instr) {
			return _store_bi(instr, 16, false);
		},
		'sbi.bi': function(instr) {
			return _store_bi(instr, 8, false);
		},
		'sdi.bi': function(instr) {
			return _store_bi(instr, 64, false);
		},
		'swi333.bi': function(instr) {
			return _store_bi(instr, 32, false);
		},
		'sw.bi': function(instr) {
			return _store_bi(instr, 32, false);
		},
		/* STACK / MULTI */
		push25: function(instr) {
			return Base.write_memory('$sp', _arg(instr, 0), 32, false);
		},
		pop25: function(instr) {
			return Base.read_memory('$sp', _arg(instr, 0), 32, false);
		},
		'lmw.bi': function() {
			return Base.nop();
		},
		'lmw.bim': function() {
			return Base.nop();
		},
		'lmw.adm': function() {
			return Base.nop();
		},
		'smw.bi': function() {
			return Base.nop();
		},
		'smw.bim': function() {
			return Base.nop();
		},
		'smw.adm': function() {
			return Base.nop();
		},
		'smw.bdm': function() {
			return Base.nop();
		},
		lmw: function() {
			return Base.nop();
		},
		smw: function() {
			return Base.nop();
		},
		'lmw?.adm': function() {
			return Base.nop();
		},
		'lmw?.bi': function() {
			return Base.nop();
		},
		'lmwa.aim': function() {
			return Base.nop();
		},
		'lmwa.bd': function() {
			return Base.nop();
		},
		'lmwa.bi': function() {
			return Base.nop();
		},
		'lmwa.bim': function() {
			return Base.nop();
		},
		'lmwzb.am': function() {
			return Base.nop();
		},
		'smw?.ad': function() {
			return Base.nop();
		},
		'smw?.adm': function() {
			return Base.nop();
		},
		'smw?.bdm': function() {
			return Base.nop();
		},
		'smwa.aim': function() {
			return Base.nop();
		},
		'smwzb.a': function() {
			return Base.nop();
		},
		'smwzb.am': function() {
			return Base.nop();
		},
		'smwzb.b': function() {
			return Base.nop();
		},
		'smwzb.bm': function() {
			return Base.nop();
		},
		/* BRANCHES */
		beq: function(instr, context) {
			instr.conditional(_arg(instr, 0), _arg(instr, 1), 'EQ');
			return Base.nop();
		},
		bne: function(instr, context) {
			instr.conditional(_arg(instr, 0), _arg(instr, 1), 'NE');
			return Base.nop();
		},
		beqz: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'EQ');
			return Base.nop();
		},
		bnez: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'NE');
			return Base.nop();
		},
		beqz38: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'EQ');
			return Base.nop();
		},
		bnez38: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'NE');
			return Base.nop();
		},
		beqzs8: function(instr, context) {
			instr.conditional('$ta', '0', 'EQ');
			return Base.nop();
		},
		bnezs8: function(instr, context) {
			instr.conditional('$ta', '0', 'NE');
			return Base.nop();
		},
		beqs38: function(instr, context) {
			instr.conditional(_arg(instr, 0), '$ta', 'EQ');
			return Base.nop();
		},
		bnes38: function(instr, context) {
			instr.conditional(_arg(instr, 0), '$ta', 'NE');
			return Base.nop();
		},
		beqc: function(instr, context) {
			instr.conditional(_arg(instr, 0), _arg(instr, 1), 'EQ');
			return Base.nop();
		},
		bnec: function(instr, context) {
			instr.conditional(_arg(instr, 0), _arg(instr, 1), 'NE');
			return Base.nop();
		},
		bgez: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'GE');
			return Base.nop();
		},
		bltz: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'LT');
			return Base.nop();
		},
		bgtz: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'GT');
			return Base.nop();
		},
		blez: function(instr, context) {
			instr.conditional(_arg(instr, 0), '0', 'LE');
			return Base.nop();
		},
		/* JUMPS / CALLS */
		j: function() {
			return Base.nop();
		},
		j8: function() {
			return Base.nop();
		},
		jr: function() {
			return Base.nop();
		},
		'jr.dton': function() {
			return Base.nop();
		},
		'jr.iton': function() {
			return Base.nop();
		},
		jr5: function() {
			return Base.nop();
		},
		jal: function(instr) {
			var arg = _arg(instr, 0);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		jral: function(instr) {
			var arg = _arg(instr, 1);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		'jral.dton': function(instr) {
			var arg = _arg(instr, 1);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		'jrnez.dton': function(instr) {
			instr.conditional(_arg(instr, 0), '0', 'NE');
			return Base.nop();
		},
		jral5: function(instr) {
			var arg = _arg(instr, 0);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		ifcall: function(instr) {
			var arg = _arg(instr, 0);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		ifcall9: function(instr) {
			var arg = _arg(instr, 0);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			return Base.call(arg, []);
		},
		bgezal: function(instr) {
			var arg = _arg(instr, 1);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			instr.conditional(_arg(instr, 0), '0', 'GE');
			return Base.call(arg, []);
		},
		bltzal: function(instr) {
			var arg = _arg(instr, 1);
			if (arg.indexOf('0x') == 0) {
				arg = Variable.functionPointer(arg);
			}
			instr.conditional(_arg(instr, 0), '0', 'LT');
			return Base.call(arg, []);
		},
		/* RETURN */
		ret: function() {
			return Base.return('');
		},
		ret5: function() {
			return Base.return('');
		},
		iret: function() {
			return Base.return('');
		},
		ifret: function() {
			return Base.return('');
		},
		ifret16: function() {
			return Base.return('');
		},
		/* SYSTEM REGISTERS */
		mfsr: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		mtsr: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		mfusr: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		mtusr: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		/* BIT MANIPULATION */
		abs: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], 'ABS(' + e.opd[1] + ')');
		},
		clo: function(instr) {
			return Base.assign(_arg(instr, 0), 'CLO(' + _arg(instr, 1) + ')');
		},
		clz: function(instr) {
			return Base.assign(_arg(instr, 0), 'CLZ(' + _arg(instr, 1) + ')');
		},
		bset: function(instr) {
			var e = instr.parsed;
			return Base.or(e.opd[0], e.opd[1], '(1 << ' + e.opd[2] + ')');
		},
		bclr: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[1], '~(1 << ' + e.opd[2] + ')');
		},
		btgl: function(instr) {
			var e = instr.parsed;
			return Base.xor(e.opd[0], e.opd[1], '(1 << ' + e.opd[2] + ')');
		},
		btst: function(instr, context) {
			var e = instr.parsed;
			context.cond.a = '(' + e.opd[1] + ' >> ' + e.opd[2] + ') & 1';
			context.cond.b = '0';
			return Base.nop();
		},
		wsbh: function(instr) {
			return Base.swap_endian(_arg(instr, 1), _arg(instr, 0), 16);
		},
		fexti33: function(instr) {
			var e = instr.parsed;
			return Base.and(e.opd[0], e.opd[0], '((1 << ' + e.opd[1] + ') - 1)');
		},
		bmski33: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], '((1 << ' + e.opd[1] + ') - 1)');
		},
		/* FLOAT ARITHMETIC */
		fmadds: function(instr) {
			var e = instr.parsed;
			return Base.assign(e.opd[0], e.opd[1] + ' * ' + e.opd[2] + ' + ' + e.opd[0]);
		},
		'fcmpeqd.e': function() {
			return Base.nop();
		},
		fmtsr: function(instr) {
			return Base.assign(_arg(instr, 0), _arg(instr, 1));
		},
		/* SYSTEM / NOP */
		nop: function() {
			return Base.nop();
		},
		nop16: function() {
			return Base.nop();
		},
		dsb: function() {
			return Base.nop();
		},
		isb: function() {
			return Base.nop();
		},
		msync: function() {
			return Base.nop();
		},
		isync: function() {
			return Base.nop();
		},
		standby: function() {
			return Base.nop();
		},
		cctl: function() {
			return Base.nop();
		},
		'ex9.it': function() {
			return Base.nop();
		},
		syscall: function(instr) {
			return Base.call('syscall', []);
		},
		'break': function() {
			return Base.break();
		},
		break16: function() {
			return Base.break();
		},
		trap: function() {
			return Base.call('trap', []);
		},
		teqz: function(instr) {
			return Base.call('trap', []);
		},
		tnez: function(instr) {
			return Base.call('trap', []);
		},
		invalid: function() {
			return Base.nop();
		},
		'invalid?': function() {
			return Base.nop();
		},
		cplwi: function() {
			return Base.nop();
		},
		cpldi: function() {
			return Base.nop();
		},
		cpsdi: function() {
			return Base.nop();
		},
		cpswi: function() {
			return Base.nop();
		},
		'dprefi.d': function() {
			return Base.nop();
		},
		'dprefi.w': function() {
			return Base.nop();
		},
		tlbop: function() {
			return Base.nop();
		},
		misc33_0: function() {
			return Base.nop();
		},
		misc33_1: function() {
			return Base.nop();
		},
		x11b33: function() {
			return Base.nop();
		}
	},
	parse: function(assembly) {
		var ret = assembly.replace(/\[|\]/g, ' ').replace(/,/g, ' ');
		ret = ret.replace(/\+/g, ' ').replace(/#/g, '');
		ret = ret.replace(/\(|\)/g, ' ').replace(/\s+/g, ' ');
		ret = ret.trim().split(' ').filter(function(x) { return x.length > 0; });
		return {
			mnem: ret.shift(),
			opd: ret
		};
	},
	context: function() {
		return {
			cond: {
				a: '?',
				b: '?'
			}
		};
	},
	localvars: function(context) {
		return [];
	},
	globalvars: function(context) {
		return [];
	},
	arguments: function(context) {
		return [];
	},
	returns: function(context) {
		return 'void';
	}
};
