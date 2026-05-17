// SPDX-FileCopyrightText: 2026 pancake <pancake@nopcode.org>
// SPDX-License-Identifier: BSD-3-Clause

import Base from '../core/base.js';
import Extra from '../core/extra.js';
import Variable from '../core/variable.js';

var _arg = function(instr, n) {
	return instr.parsed.opd[n] || '';
};

var _normalize = function(op) {
	return op.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/\[\s+/g, '[')
		.replace(/\s+\]/g, ']')
		.replace(/\s*\+\s*/g, ' + ');
};

var _is_memory = function(op) {
	return op && op[0] == '[' && op[op.length - 1] == ']';
};

var _memory = function(op) {
	return op.substr(1, op.length - 2).trim();
};

var _pad_address = function(op) {
	var addr = parseInt(op.substr(2), 16).toString(16);
	while (addr.length < 6) {
		addr = '0' + addr;
	}
	return addr;
};

var _op = function(op, bits, signed) {
	if (_is_memory(op)) {
		return Variable.pointer(_memory(op), bits, signed);
	}
	return op;
};

var _target = function(op) {
	if (_is_memory(op)) {
		op = _memory(op);
	}
	if (op.indexOf('0x') == 0) {
		return 'fcn_' + _pad_address(op);
	}
	return op;
};

var _set_cond = function(context, value, bits) {
	if (context) {
		context.cond.a = _op(value, bits, false);
		context.cond.b = '0';
	}
};

var _assign = function(instr, context, bits, signed) {
	var e = instr.parsed;
	_set_cond(context, e.opd[0], bits);
	return Base.assign(_op(e.opd[0], bits, signed), _op(e.opd[1], bits, signed));
};

var _load_byte = function(instr, context) {
	return _assign(instr, context, 8, false);
};

var _load_word = function(instr, context) {
	return _assign(instr, context, 16, false);
};

var _math = function(instr, context, op, bits) {
	var dst = _arg(instr, 0);
	var src = _op(_arg(instr, 1), bits, false);
	_set_cond(context, dst, bits);
	return op(_op(dst, bits, false), _op(dst, bits, false), src);
};

var _mathw = function(instr, context, op) {
	return _math(instr, context, op, 16);
};

var _matha = function(instr, context, op) {
	return _math(instr, context, op, 8);
};

var _carry_math = function(instr, context, op, bits) {
	instr.comments.push('with carry');
	var dst = _op(_arg(instr, 0), bits, false);
	var src = _op(_arg(instr, 1), bits, false);
	_set_cond(context, _arg(instr, 0), bits);
	return op(dst, dst, '(' + src + ' + c)');
};

var _incdec = function(instr, context, op, bits) {
	var dst = _op(_arg(instr, 0), bits, false);
	_set_cond(context, _arg(instr, 0), bits);
	return op(dst, '1');
};

var _clear = function(instr, context, bits) {
	var dst = _op(_arg(instr, 0), bits, false);
	_set_cond(context, _arg(instr, 0), bits);
	return Base.assign(dst, '0');
};

var _compare = function(instr, context, bits) {
	instr.setBadJump();
	context.cond.a = _op(_arg(instr, 0), bits, false);
	context.cond.b = _op(_arg(instr, 1), bits, false);
	return Base.nop();
};

var _test = function(instr, context, bits) {
	instr.setBadJump();
	context.cond.a = _op(_arg(instr, 0), bits, false);
	context.cond.b = '0';
	return Base.nop();
};

var _shift_right_arith = function(instr, bits) {
	var arg = _arg(instr, 0);
	if (_is_memory(arg)) {
		var dst = _op(arg, bits, true);
		return Base.shift_right(dst, dst, '1');
	}
	var cast = '(' + Extra.to.type(bits, true) + ') ' + arg;
	return Base.shift_right(arg, cast, '1');
};

var _shift_right_logic = function(instr, bits) {
	var dst = _op(_arg(instr, 0), bits, false);
	return Base.shift_right(dst, dst, '1');
};

var _shift_left = function(instr, bits) {
	var dst = _op(_arg(instr, 0), bits, false);
	return Base.shift_left(dst, dst, '1');
};

var _bit_mask = function(bit) {
	return '(1 << ' + bit + ')';
};

var _bit_expr = function(op, bit) {
	return '((' + _op(op, 8, false) + ' >> ' + bit + ') & 1)';
};

var _bit_set = function(instr) {
	var dst = _op(_arg(instr, 0), 8, false);
	return Base.or(dst, dst, _bit_mask(_arg(instr, 1)));
};

var _bit_clear = function(instr) {
	var dst = _op(_arg(instr, 0), 8, false);
	return Base.and(dst, dst, '~' + _bit_mask(_arg(instr, 1)));
};

var _bit_toggle = function(instr) {
	var dst = _op(_arg(instr, 0), 8, false);
	return Base.xor(dst, dst, _bit_mask(_arg(instr, 1)));
};

var _bit_carry_copy = function(instr) {
	var dst = _op(_arg(instr, 0), 8, false);
	var bit = _arg(instr, 1);
	return Base.composed([
		Base.and(dst, dst, '~' + _bit_mask(bit)),
		Base.or(dst, dst, '(c << ' + bit + ')')
	]);
};

var _bit_branch = function(instr, type) {
	instr.conditional(_bit_expr(_arg(instr, 0), _arg(instr, 1)), '0', type);
	return Base.nop();
};

var _branch = function(instr, context, type) {
	instr.conditional(context.cond.a, context.cond.b, type);
	return Base.nop();
};

var _flag_branch = function(instr, flag, type) {
	instr.conditional(flag, '0', type);
	return Base.nop();
};

var _call = function(instr) {
	return Base.call(_target(_arg(instr, 0)), []);
};

var _jump = function() {
	return Base.nop();
};

var _push = function(instr, bits) {
	return Base.call('push', [_op(_arg(instr, 0), bits, false)]);
};

var _pop = function(instr, bits) {
	return Base.assign(_op(_arg(instr, 0), bits, false), Base.call('pop', []));
};

var _rotate = function(instr, bits, left) {
	var dst = _op(_arg(instr, 0), bits, false);
	if (left) {
		return Base.rotate_left(dst, dst, '1', bits);
	}
	return Base.rotate_right(dst, dst, '1', bits);
};

var _rotatew = function(instr, left) {
	var dst = _op(_arg(instr, 0), 16, false);
	if (left) {
		return Base.rotate_left(dst, dst, '8', 16);
	}
	return Base.rotate_right(dst, dst, '8', 16);
};

var _swap_nibbles = function(instr) {
	var dst = _op(_arg(instr, 0), 8, false);
	return Base.assign(dst, '((' + dst + ' << 4) | (' + dst + ' >> 4)) & 0xff');
};

var _nop = function() {
	return Base.nop();
};

export default {
	instructions: {
		adc: function(instr, context) {
			return _carry_math(instr, context, Base.add, 8);
		},
		add: function(instr, context) {
			var bits = _arg(instr, 0) == 'sp' ? 16 : 8;
			return _math(instr, context, Base.add, bits);
		},
		addw: function(instr, context) {
			return _mathw(instr, context, Base.add);
		},
		and: function(instr, context) {
			return _matha(instr, context, Base.and);
		},
		bccm: _bit_carry_copy,
		bcp: function(instr, context) {
			instr.setBadJump();
			context.cond.a = '(' + _op(_arg(instr, 0), 8, false) + ' & ' + _op(_arg(instr, 1), 8, false) + ')';
			context.cond.b = '0';
			return Base.nop();
		},
		bcpl: _bit_toggle,
		bres: _bit_clear,
		bset: _bit_set,
		btjf: function(instr) {
			return _bit_branch(instr, 'EQ');
		},
		btjt: function(instr) {
			return _bit_branch(instr, 'NE');
		},
		break: function() {
			return Base.call('__breakpoint', []);
		},
		call: _call,
		callf: _call,
		callr: _call,
		ccf: function() {
			return Base.assign('c', '!c');
		},
		clr: function(instr, context) {
			return _clear(instr, context, 8);
		},
		clrw: function(instr, context) {
			return _clear(instr, context, 16);
		},
		cp: function(instr, context) {
			return _compare(instr, context, 8);
		},
		cpl: function(instr) {
			var dst = _op(_arg(instr, 0), 8, false);
			return Base.not(dst, dst);
		},
		cplw: function(instr) {
			var dst = _op(_arg(instr, 0), 16, false);
			return Base.not(dst, dst);
		},
		cpw: function(instr, context) {
			return _compare(instr, context, 16);
		},
		dec: function(instr, context) {
			return _incdec(instr, context, Base.decrease, 8);
		},
		decw: function(instr, context) {
			return _incdec(instr, context, Base.decrease, 16);
		},
		div: function(instr) {
			instr.comments.push('quotient -> x, remainder -> a');
			var t = Variable.uniqueName('rem');
			return Base.composed([
				Base.assign(Extra.to.type(8, false) + ' ' + t, '(uint8_t) (x % a)'),
				Base.divide('x', 'x', 'a'),
				Base.assign('a', t)
			]);
		},
		divw: function(instr) {
			instr.comments.push('quotient -> x, remainder -> y');
			var t = Variable.uniqueName('rem');
			return Base.composed([
				Base.assign(Extra.to.type(16, false) + ' ' + t, 'x % y'),
				Base.divide('x', 'x', 'y'),
				Base.assign('y', t)
			]);
		},
		exg: function(instr) {
			return Base.swap(_op(_arg(instr, 0), 8, false), _op(_arg(instr, 1), 8, false), 8);
		},
		exgw: function(instr) {
			return Base.swap(_arg(instr, 0), _arg(instr, 1), 16);
		},
		halt: function() {
			return Base.call('__halt', []);
		},
		inc: function(instr, context) {
			return _incdec(instr, context, Base.increase, 8);
		},
		incw: function(instr, context) {
			return _incdec(instr, context, Base.increase, 16);
		},
		int: function(instr) {
			return Base.call('__interrupt', [_target(_arg(instr, 0))]);
		},
		iret: function() {
			return Base.return('');
		},
		jp: _jump,
		jpf: _jump,
		jra: _jump,
		jrc: function(instr, context) {
			return _branch(instr, context, 'LT');
		},
		jreq: function(instr, context) {
			return _branch(instr, context, 'EQ');
		},
		jrf: _nop,
		jrh: function(instr) {
			return _flag_branch(instr, 'h', 'NE');
		},
		jrih: function(instr) {
			return _flag_branch(instr, 'i1', 'NE');
		},
		jril: function(instr) {
			return _flag_branch(instr, 'i1', 'EQ');
		},
		jrm: function(instr) {
			return _flag_branch(instr, 'i', 'NE');
		},
		jrmi: function(instr) {
			return _flag_branch(instr, 'n', 'NE');
		},
		jrnc: function(instr, context) {
			return _branch(instr, context, 'GE');
		},
		jrne: function(instr, context) {
			return _branch(instr, context, 'NE');
		},
		jrnh: function(instr) {
			return _flag_branch(instr, 'h', 'EQ');
		},
		jrnm: function(instr) {
			return _flag_branch(instr, 'i', 'EQ');
		},
		jrnv: function(instr) {
			return _flag_branch(instr, 'v', 'EQ');
		},
		jrpl: function(instr, context) {
			return _branch(instr, context, 'GE');
		},
		jrsge: function(instr, context) {
			return _branch(instr, context, 'GE');
		},
		jrsgt: function(instr, context) {
			return _branch(instr, context, 'GT');
		},
		jrsle: function(instr, context) {
			return _branch(instr, context, 'LE');
		},
		jrslt: function(instr, context) {
			return _branch(instr, context, 'LT');
		},
		jrugt: function(instr, context) {
			return _branch(instr, context, 'GT');
		},
		jrule: function(instr, context) {
			return _branch(instr, context, 'LE');
		},
		jrv: function(instr) {
			return _flag_branch(instr, 'v', 'NE');
		},
		ld: _load_byte,
		ldf: _load_byte,
		ldw: _load_word,
		mov: _load_byte,
		mul: function(instr) {
			var dst = _arg(instr, 0);
			var src = _arg(instr, 1);
			var lo = (dst == 'x') ? 'xl' : 'yl';
			instr.comments.push(dst + ' = ' + lo + ' * ' + src);
			return Base.multiply(dst, lo, src);
		},
		neg: function(instr) {
			var dst = _op(_arg(instr, 0), 8, false);
			return Base.negate(dst, dst);
		},
		negw: function(instr) {
			var dst = _op(_arg(instr, 0), 16, false);
			return Base.negate(dst, dst);
		},
		nop: _nop,
		or: function(instr, context) {
			return _matha(instr, context, Base.or);
		},
		pop: function(instr) {
			return _pop(instr, 8);
		},
		popw: function(instr) {
			return _pop(instr, 16);
		},
		push: function(instr) {
			return _push(instr, 8);
		},
		pushw: function(instr) {
			return _push(instr, 16);
		},
		rcf: function() {
			return Base.assign('c', '0');
		},
		ret: function() {
			return Base.return('');
		},
		retf: function() {
			return Base.return('');
		},
		rim: _nop,
		rlc: function(instr) {
			instr.comments.push('rotate with carry');
			return _rotate(instr, 8, true);
		},
		rlcw: function(instr) {
			instr.comments.push('rotate with carry');
			return _rotate(instr, 16, true);
		},
		rlwa: function(instr) {
			return _rotatew(instr, true);
		},
		rrc: function(instr) {
			instr.comments.push('rotate with carry');
			return _rotate(instr, 8, false);
		},
		rrcw: function(instr) {
			instr.comments.push('rotate with carry');
			return _rotate(instr, 16, false);
		},
		rrwa: function(instr) {
			return _rotatew(instr, false);
		},
		rvf: function() {
			return Base.assign('v', '0');
		},
		sbc: function(instr, context) {
			return _carry_math(instr, context, Base.subtract, 8);
		},
		scf: function() {
			return Base.assign('c', '1');
		},
		sim: _nop,
		sll: function(instr) {
			return _shift_left(instr, 8);
		},
		sllw: function(instr) {
			return _shift_left(instr, 16);
		},
		sla: function(instr) {
			return _shift_left(instr, 8);
		},
		slaw: function(instr) {
			return _shift_left(instr, 16);
		},
		sra: function(instr) {
			return _shift_right_arith(instr, 8);
		},
		sraw: function(instr) {
			return _shift_right_arith(instr, 16);
		},
		srl: function(instr) {
			return _shift_right_logic(instr, 8);
		},
		srlw: function(instr) {
			return _shift_right_logic(instr, 16);
		},
		sub: function(instr, context) {
			var bits = _arg(instr, 0) == 'sp' ? 16 : 8;
			return _math(instr, context, Base.subtract, bits);
		},
		subw: function(instr, context) {
			return _mathw(instr, context, Base.subtract);
		},
		swap: _swap_nibbles,
		swapw: function(instr) {
			return Base.swap_endian(_arg(instr, 0), _arg(instr, 0), 16);
		},
		tnz: function(instr, context) {
			return _test(instr, context, 8);
		},
		tnzw: function(instr, context) {
			return _test(instr, context, 16);
		},
		trap: function() {
			return Base.call('__trap', []);
		},
		wfe: function() {
			return Base.call('__wait_for_event', []);
		},
		wfi: function() {
			return Base.call('__wait_for_interrupt', []);
		},
		xor: function(instr, context) {
			return _matha(instr, context, Base.xor);
		},
		invalid: _nop
	},
	parse: function(assembly) {
		assembly = assembly.replace(/;.*/, '').trim();
		var m = assembly.match(/^(\S+)\s*(.*)$/);
		if (!m) {
			return {
				mnem: '',
				opd: []
			};
		}
		return {
			mnem: m[1].toLowerCase(),
			opd: m[2].length > 0 ? m[2].split(',').map(_normalize) : []
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
	localvars: function() {
		return [];
	},
	globalvars: function() {
		return [];
	},
	arguments: function() {
		return [];
	},
	returns: function() {
		return 'void';
	}
};
