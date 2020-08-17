/* 
 * Copyright (C) 2018 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() { // lgtm [js/useless-expression]
    const Anno = require('libdec/annotation');
	return function(data) {
		this.data = data;
		this.print = function() {
			var t = Global.printer.theme;
			for (var i = 0; i < this.data.length; i++) {
				if (Global.evars.extra.annotation) {
                    Global.context.addAnnotation(Anno.comment(this.data[i]));
                } else {
					Global.context.printLine(Global.context.identfy() + t.macro(this.data[i]));
                }
			}
		};
	};
});