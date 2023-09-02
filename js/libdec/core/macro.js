// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

export default function(data) {
	this.data = data;
	this.print = function() {
		var t = Global().printer.theme;
		for (var i = 0; i < this.data.length; i++) {
			Global().context.printLine(Global().context.identfy() + t.macro(this.data[i]));
		}
	};
}