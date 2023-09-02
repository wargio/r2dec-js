// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

var __colors = {
	black: [30, 39],
	red: [31, 39],
	green: [32, 39],
	yellow: [33, 39],
	blue: [34, 39],
	magenta: [35, 39],
	cyan: [36, 39],
	white: [37, 39],
	gray: [90, 39],
};

function pair(name, n) {
	if (name.length === 6) {
		n *= 2;
		return parseInt(name.substring(n, n + 2), 16);
	}
	return (parseInt(name.substring(n, n + 1), 16) << 4) >>> 0;
}
var Color = function(name) {
	var fn = (function(){
		var that = function(x) {
			return that.open + x + that.close;
		};
		return that;
	})();
	if (name.startsWith('rgb:')) {
		name = name.substring(4);
		const str = '38;2;' + pair(name, 0) + ';' + pair(name, 1) + ';' + pair(name, 2);
		fn.open = '\u001b[' + str + 'm';
		fn.close = '\u001b[39m';
	} else {
		if (!__colors[name]) {
			throw new Error('Invalid name: ' + name);
		}
		fn.open = '\u001b[' + __colors[name][0] + 'm';
		fn.close = '\u001b[' + __colors[name][1] + 'm';
	}
	return fn;
};
Color.make = function(theme) {
	var g = {};
	for (var key in theme) {
		g[key] = Color(theme[key]);
	}
	return g;
};
export default Color;