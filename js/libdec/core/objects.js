// SPDX-FileCopyrightText: 2019-2021 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import Extra from './extra.js';

const _java = {
	array: function(type, size, create, init) {
		this.size = size || 0;
		this.type = Extra.replace.object(type);
		this.init = init;
		this.toString = function() {
			var t = [Global().printer.theme.flow('new'), Global().printer.theme.callname(this.type), '[' + this.size + ']'];
			if (this.init && this.init.length > 0) {
				t.push('{' + this.init.join(', ') + '}');
			}
			return t.join(' ');
		};
	},
	object: function(type, args, create) {
		this.args = args || [];
		this.type = Extra.replace.object(type);
		this.create = create || false;
		this.toString = function() {
			var a = this.args.length > 0 ? '(' + this.args.join(', ') + ')' : '';
			if (this.create) {
				return [Global().printer.theme.flow('new'), Global().printer.theme.callname(this.type), a].join(' ').trim();
			}
			return [Global().printer.theme.callname(this.type), a].join(' ').trim();
		};
	}
};

const _all_langs = {
	java: _java,
	dalvik: _java,
};

export default {
	array: function(type, size, create, lang, init) {
		lang = lang || Global().evars.arch;
		if (!_all_langs[lang]) {
			throw new Error('Missing lang for array (objects.js)');
		}
		return new _all_langs[lang].array(type, size, create, init || []);
	},
	object: function(type, args, create, lang) {
		lang = lang || Global().evars.arch;
		if (!_all_langs[lang]) {
			throw new Error('Missing lang for object (objects.js)');
		}
		return new _all_langs[lang].object(type, args, create);
	}
};