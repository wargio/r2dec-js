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
	const Base = require('libdec/core/base');
	const Variable = require('libdec/core/variable');
	const Extra = require('libdec/core/extra');

	const DalvikType = {
		Number: 0,
		String: 1,
		NewObject: 10,
		StaticObject: 11,
		FieldObject: 12,
	};

	function arg_usage(value, type, context) {
		if (!context.objects[value]) {
			context.arguments.push(Variable.local(value, type, true));
		}
	}

	function _handle_type(obj, defobj) {
		if (!obj) {
			return defobj;
		}
		if (obj.type == DalvikType.String) {
			obj.instr.valid = false;
			return Variable.string(obj.instr.string || obj.instr.parsed.opd[1]);
		}
		if (obj.type == DalvikType.Number) {
			obj.instr.valid = false;
			return Variable.number(obj.instr.parsed.opd[1]);
		}
		if (obj.type == DalvikType.FieldObject) {
			obj.instr.valid = false;
			return Variable.object([obj.data.register, obj.data.field].join('.'));
		}
		return defobj;
	}

	function _invoke_static(instr, context, instructions) {
		var next = instructions[instructions.indexOf(instr) + 1];
		var p = instr.parsed;
		var dst = Variable.object(p.opd[0]);
		var args = p.args.map(function(x) {
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		if (next && next.parsed.mnem.startsWith('move-result')) {
			var dst2 = Variable.local(next.parsed.opd[0], instr.bits, true);
			return Base.assign(dst2, Base.call(dst, args));
		}
		return Base.call(dst, args);
	}

	function _invoke_direct(instr, context, instructions) {
		var p = instr.parsed;
		var object, dst, method;
		if (!context.objects[p.args[0]]) {
			context.arguments.push(Variable.local(p.args[0], Extra.replace.object(p.opd[0]), true));
			instr.setBadJump();
			return Base.nop();
		} else {
			object = context.objects[p.args[0]].instr;
			object.valid = false;
			dst = Variable.local(object.parsed.opd[0], instr.bits, true);
			method = Variable.newobject(object.parsed.opd[1]);
		}

		var args = p.args.slice(1).map(function(x) {
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		return Base.assign(dst, Base.call(method, args));
	}

	function _invoke_virtual(instr, context, instructions) {
		var p = instr.parsed;
		var object = context.objects[p.args[0]];
		object.instr.valid = object.type != DalvikType.StaticObject;
		var next = instructions[instructions.indexOf(instr) + 1];
		var self = object.type == DalvikType.StaticObject ?
			Variable.object(object.instr.parsed.opd[1]) :
			Variable.local(p.args[0], instr.bits, true);
		var method = Extra.replace.object(p.opd[0].replace(/^L.+\./, 'L'));

		var args = p.args.slice(1).map(function(x) {
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		if (next && next.parsed.mnem.startsWith('move-result')) {
			var dst2 = Variable.local(next.parsed.opd[0], instr.bits, true);
			return Base.assign(dst2, Base.method_call(self, '.', method, args));
		}
		return Base.method_call(self, '.', method, args);
	}

	return {
		instructions: {
			const: function(instr, context, instructions) {
				var p = instr.parsed;
				context.objects[p.opd[0]] = {
					instr: instr,
					type: DalvikType.Number,
				};
				var dst = Variable.local(p.opd[0], instr.bits, true);
				var src = Variable.local(p.opd[1], instr.bits, true);
				return Base.assign(dst, src);
			},
			'const-string': function(instr, context, instructions) {
				var p = instr.parsed;
				context.objects[p.opd[0]] = {
					instr: instr,
					type: p.opd[1].startsWith('0x') ? DalvikType.Number : DalvikType.String,
				};
				var dst = Variable.local(p.opd[0], instr.bits, true);
				var src = Variable.string(instr.string ? instr.string : p.opd[1]);
				return Base.assign(dst, src);
			},
			'new-instance': function(instr, context, instructions) {
				context.objects[instr.parsed.opd[0]] = {
					instr: instr,
					type: DalvikType.NewObject,
				};
				return Base.nop();
			},
			'invoke-direct': _invoke_direct,
			'invoke-static': _invoke_static,
			'invoke-virtual': _invoke_virtual,
			'iget-object': function(instr, context, instructions) {
				var p = instr.parsed;
				var dst = Variable.local(p.opd[0], instr.bits, true);
				var src = Variable.object(p.opd[1]);
				var field = Extra.replace.object(p.opd[2]).replace(/^.+\.(.+)$/, '$1');
				arg_usage(p.opd[1], Extra.replace.object(p.opd[2]).replace(/\..+$/, ''), context);

				context.objects[p.opd[0]] = {
					instr: instr,
					type: DalvikType.FieldObject,
					data: {
						field: field,
						register: p.opd[1]
					}
				};
				return Base.assign_object_field(dst, src, '.', field);
			},
			'sget-object': function(instr, context, instructions) {
				var p = instr.parsed;
				context.objects[p.opd[0]] = {
					instr: instr,
					type: DalvikType.StaticObject,
				};
				var dst = Variable.local(p.opd[0], instr.bits, true);
				console.log(p.opd[1]);
				console.log(Extra.replace.object(p.opd[1]));
				var src = Variable.object(p.opd[1]);
				return Base.assign(dst, src);
			},
			nop: function() {
				return Base.nop();
			},
			'move-result': function(instr, context, instructions) {
				return Base.nop();
			},
			'move-result-object': function(instr, context, instructions) {
				return Base.nop();
			},
			'return-void': function(instr) {
				instr.setBadJump();
				return Base.return();
			},
			return: function(instr) {
				var p = instr.parsed;
				instr.setBadJump();
				return Base.return(Variable.local(p.opd[0], instr.bits, true));
			},
			invalid: function(instr, context, instructions) {
				return Base.nop();
			}
		},
		parse: function(assembly) {
			const regex = /^([\w-]+)(\/?(from|high|range)?(\d+)?(\s.+$)$)?(\s.+$)?$/;
			var token = assembly.trim().match(regex);
			var operands;
			var bits = 32;
			var cast = false;
			var args = [];
			var mnem = 'illegal';
			mnem = token[1] || token[0];
			cast = token[3] ? true : false;
			bits = token[4] ? parseInt(token[11]) : 32;
			operands = token[5] ? token[5].trim().replace(/;\s+0x[\da-f]+(\s+)?$|^\{.+\},/g, '').trim().split(', ') : [];
			args = token[5] && token[5].match(/({.+})/) ? token[5].match(/({.+})/)[0].replace(/[{,}]/g, ' ').replace(/\s+/g, ' ').trim().split(' ') : [];
			return {
				mnem: mnem,
				cast: cast,
				bits: bits,
				args: args,
				opd: operands
			};
		},
		context: function() {
			return {
				objects: {},
				arguments: []
			};
		},
		preanalisys: function(instructions, context) {},
		postanalisys: function(instructions, context) {},
		localvars: function(context) {
			return [];
		},
		globalvars: function(context) {
			return [];
		},
		arguments: function(context) {
			return context.arguments;
		},
		returns: function(context) {
			return 'void';
		},
		routine_name: function(name) {
			return Extra.replace.object(name);
		}
	};
})();