/* 
 * Copyright (C) 2019 deroad
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

module.exports = (function() {
	var Extra = require('libdec/core/extra');

	const _java = {
		array: function(type, size, create) {
			this.size = size || 0;
			this.type = Extra.replace.object(type);
			this.toString = function() {
				return [Global.printer.theme.flow('new'), Global.printer.theme.callname(this.type), '[' + this.size + ']'].join(' ');
			};
		},
		object: function(type, args, create) {
			this.args = args || [];
			this.type = Extra.replace.object(type);
			this.create = create || false;
			this.toString = function() {
				var a = this.args.length > 0 ? '(' + this.args.join(', ') + ')' : '';
				if (this.create) {
					return [Global.printer.theme.flow('new'), Global.printer.theme.callname(this.type), a].join(' ').trim();
				}
				return [Global.printer.theme.callname(this.type), a].join(' ').trim();
			};
		}
	};

	const _all_langs = {
		java: _java,
		dalvik: _java,
	};

	return {
		array: function(type, size, create, lang) {
			lang = lang || Global.evars.arch;
			if (!_all_langs[lang]) {
				throw new Error('Missing lang for array (objects.js)');
			}
			return new _all_langs[lang].array(type, size, create);
		},
		object: function(type, args, create, lang) {
			lang = lang || Global.evars.arch;
			if (!_all_langs[lang]) {
				throw new Error('Missing lang for object (objects.js)');
			}
			return new _all_langs[lang].object(type, args, create);
		}
	};
})();