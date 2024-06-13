// SPDX-FileCopyrightText: 2019-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import JSONex from './JSONex.js';
import Long from './long.js';

function r2custom(value, regex, function_fix) {
	var x = radare2.command(value) || "";
	if (regex) {
		x = x.replace(regex, '');
	}
	return function_fix ? function_fix(x.trim()) : x.trim();
}

function r2str(value, multiline) {
	var x = radare2.command(value) || "";
	if (multiline) {
		x = x.replace(/\n/g, '');
	}
	return x.trim();
}

function r2json(m, def) {
	var x = r2str(m, true);
	try {
		return x.length > 0 ? JSONex.parse(x) : def;
		// eslint-disable-next-line no-unused-vars
	} catch(e){}
	return def;
}

function r2int(value, def) {
	var x = r2str(value);
	if (x != '') {
		try {
			return parseInt(x);
			// eslint-disable-next-line no-unused-vars
		} catch (e) {}
	}
	return def || 0;
}

function r2long(value, def) {
	var x = r2str(value);
	if (x != '') {
		try {
			return Long.from(x, true);
			// eslint-disable-next-line no-unused-vars
		} catch (e) {}
	}
	return def || Long.UZERO;
}

function r2bool(value) {
	var x = r2str(value);
	return x == 'true' || x == '1';
}

export default {
	custom: r2custom,
	string: r2str,
	json: r2json,
	int: r2int,
	long: r2long,
	bool: r2bool,
};
