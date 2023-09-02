// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

export default function(message) {
	if (typeof message == 'string') {
		message = "[!] " + message;
		if (this.printer.theme.comment) {
			message = this.printer.theme.comment(message);
		}
		this.context.printLog(message);
	}
}
