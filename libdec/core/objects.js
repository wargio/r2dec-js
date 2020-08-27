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

(function() { // lgtm [js/useless-expression]
	const Extra = require('libdec/core/extra');
	const Anno = require('libdec/annotation');

	const _java = {
		array: function(type, size, create, init) {
			this.size = size || 0;
			this.type = Extra.replace.object(type);
			this.init = init;
			this.toAnnotation = function(location) {
				var a = [
					Anno.keyword('new', location),
					Anno.offset(' ', location),
					Anno.datatype(this.type, location),
					Anno.offset(' [', location),
					Anno.constvar(this.size, location)
				];
				if (this.init) {
					a.push(Anno.offset(']{' + this.init.join(', ') + '}', location));
				} else {
					a.push(Anno.offset(']', location));
				}
				return a;
			};
			this.toString = function() {
				var t = [Global.printer.theme.flow('new'), Global.printer.theme.callname(this.type), '[' + this.size + ']'];
				if (this.init && this.init.length > 0) {
					t.push('{' + this.init.join(', ')  +'}');
				}
				return t.join(' ');
			};
		},
		object: function(type, args, create) {
			this.args = args || [];
			this.type = Extra.replace.object(type);
			this.create = create || false;
			this.toAnnotation = function(location) {
				var a = [];
				if (this.create) {
					a.push(Anno.keyword('new', location));
					a.push(Anno.offset(' ', location));
				}
				a.push(Anno.datatype(this.type, location));
				if (this.args.length > 0) {
					a.push(Anno.offset(' (' + this.args.join(', ') + ')', location));
				}
				return a;
			};
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
		array: function(type, size, create, lang, init) {
			lang = lang || Global.evars.arch;
			if (!_all_langs[lang]) {
				throw new Error('Missing lang for array (objects.js)');
			}
			return new _all_langs[lang].array(type, size, create, init || []);
		},
		object: function(type, args, create, lang) {
			lang = lang || Global.evars.arch;
			if (!_all_langs[lang]) {
				throw new Error('Missing lang for object (objects.js)');
			}
			return new _all_langs[lang].object(type, args, create);
		}
	};
});