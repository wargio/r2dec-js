// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

var Color = function(name) {
	var fn = function(x) {
		return x;
	};
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