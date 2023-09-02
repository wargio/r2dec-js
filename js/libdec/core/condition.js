// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import Extra from './extra.js';
const _cmps = {
	CUST: ['', ''],
	INF: ['1', '0'],
	EQ: [' == ', ' != '],
	NE: [' != ', ' == '],
	LT: [' < ', ' >= '],
	LE: [' <= ', ' > '],
	GT: [' > ', ' <= '],
	GE: [' >= ', ' < '],
	LO: [' overflow ', ' !overflow '],
	NO: [' !overflow ', ' overflow '],
	INSTANCEOF: [' instanceof ', null],
};

export default {
	inf: function() {
		this.toString = function() {
			return Global().printer.theme.integers('1');
		};
	},
	convert: function(a, b, cond, invert) {
		this.invert = invert;
		this.condition = cond; // ? _cmps[cond][invert ? 1 : 0] : '';
		this.a = a;
		this.b = b || '';
		/* main method */
		this.toString = function() {
			var a = Extra.is.string(this.a) ? Global().printer.auto(this.a) : this.a;
			var b = Extra.is.string(this.b) ? Global().printer.auto(this.b) : this.b;
			if (this.invert && _cmps[this.condition][1]) {
				return a + _cmps[this.condition][1] + b;
			} else if (this.invert) {
				return '!(' + a + Global().printer.theme.flow(_cmps[this.condition][0]) + b + ')';
			}
			return a + _cmps[this.condition][0] + b;
		};
	},
};