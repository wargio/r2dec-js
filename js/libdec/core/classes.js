// SPDX-FileCopyrightText: 2019-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

/*
 * Expects the icj json as input.
 */
export default function(icj) {
	var data = {};
	icj.forEach(function(x) {
		data[x.addr.toString()] = x.classname;
	});
	this.data = data;
	this.search = function(address) {
		if (address) {
			return this.data[address.toString()];
		}
		return null;
	};
}