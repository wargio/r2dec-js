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
	const Long = require('libdec/long');
	const Base = require('libdec/core/base');
	const Variable = require('libdec/core/variable');
	const Extra = require('libdec/core/extra');
	const JavaObject = 'java.lang.Object';
	const JavaClassCastException = 'java.lang.ClassCastException';
	const DalvikType = {
		ResultValue: 0,
		Number: 1,
		String: 2,
		NewObject: 10,
		NewArray: 11,
		StaticObject: 20,
		FieldObject: 21,
	};

	function arg_usage(value, type, context) {
		if (!context.objects[value] && !context.arguments[value]) {
			context.arguments[value] = Variable.local(value, type, true);
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
			arg_usage(p.args[0], Extra.replace.object(p.opd[0]), context);
			instr.setBadJump();
			return Base.nop();
		}
		object = context.objects[p.args[0]].instr;
		object.valid = false;
		dst = Variable.local(object.parsed.opd[0], instr.bits, true);
		method = Variable.newobject(object.parsed.opd[1]);

		var args = p.args.slice(1).map(function(x) {
			arg_usage(x, JavaObject, context);
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		return Base.assign(dst, Base.call(method, args));
	}

	function _invoke_super(instr, context, instructions) {
		var p = instr.parsed;
		var object, method, self;
		if (!context.objects[p.args[0]]) {
			arg_usage(p.args[0], Extra.replace.object(p.opd[0]).replace(/(\.?.+)\..+$/, '$1'), context);
			method = 'super()' + Extra.replace.object(p.opd[0]).replace(/\.?.+(\..+$)/, '$1');
			self = p.args[0];
		} else {
			object = context.objects[p.args[0]].instr;
			object.valid = false;
			method = Variable.newobject(object.parsed.opd[1]);
		}

		var args = p.args.slice(1).map(function(x) {
			arg_usage(x, JavaObject, context);
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		return Base.method_call(self, '.', method, args);
	}

	function _invoke_virtual(instr, context, instructions) {
		var p = instr.parsed;
		var self;
		var object = context.objects[p.args[0]];
		if (!object) {
			arg_usage(p.args[0], Extra.replace.object(p.opd[0]).replace(/(\.?.+)\..+$/, '$1'), context);
			self = Variable.local(p.args[0], instr.bits, true);
		} else {
			object.instr.valid = object.type != DalvikType.StaticObject;
			self = object.type == DalvikType.StaticObject ?
				Variable.object(object.instr.parsed.opd[1]) :
				Variable.local(p.args[0], instr.bits, true);
		}
		var next = instructions[instructions.indexOf(instr) + 1];
		var method = Extra.replace.object(p.opd[0].replace(/^L.+\./, 'L'));

		var args = p.args.slice(1).map(function(x) {
			arg_usage(x, JavaObject, context);
			return _handle_type(context.objects[x], Variable.local(x, instr.bits, true));
		});
		if (next && next.parsed.mnem.startsWith('move-result')) {
			var dst2 = Variable.local(next.parsed.opd[0], instr.bits, true);
			return Base.assign(dst2, Base.method_call(self, '.', method, args));
		}
		return Base.method_call(self, '.', method, args);
	}

	function _throw_exception(klass) {
		klass = Extra.replace.object(klass);
		return [Variable.string(klass)];
	}

	function _conditional_inline(instr, instructions, a, b, type) {
		instr.conditional(a, b, type);
		var next = instructions[instructions.indexOf(instr) + 1];
		if (next) {
			instr.jump = next.location;
		} else {
			instr.jump = instr.location.add(1);
		}
	}

	function _iget_generic(instr, context, instructions) {
		var p = instr.parsed;
		var dst = Variable.local(p.opd[0], instr.bits, true);
		var src = Variable.object(p.opd[1]);
		var field = Extra.replace.object(p.opd[2]).replace(/^.+\.(.+)$/, '$1');
		arg_usage(p.opd[1], Extra.replace.object(p.opd[2]).replace(/^(\.?.+)\..+$/, '$1'), context);

		context.objects[p.opd[0]] = {
			instr: instr,
			type: DalvikType.FieldObject,
			data: {
				field: field,
				register: p.opd[1]
			}
		};
		return Base.assign_to_object_field(dst, src, '.', field);
	}

	function _iput_generic(instr, context, instructions) {
		var p = instr.parsed;
		var dst = Variable.local(p.opd[0], instr.bits, true);
		var src = Variable.object(p.opd[1]);
		var field = Extra.replace.object(p.opd[2]).replace(/^.+\.(.+)$/, '$1');
		arg_usage(p.opd[1], Extra.replace.object(p.opd[2]).replace(/^(\.?.+)\..+$/, '$1'), context);

		context.objects[p.opd[0]] = {
			instr: instr,
			type: DalvikType.FieldObject,
			data: {
				field: field,
				register: p.opd[1]
			}
		};
		return Base.assign_from_object_field(dst, src, '.', field);
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
				var src = Variable.number(p.opd[1], instr.bits, true);
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
			'new-array': function(instr, context, instructions) {
				var size = _handle_type(context.objects[instr.parsed.opd[1]], Variable.local(instr.parsed.opd[1], instr.bits, true));
				var dst = Variable.local(instr.parsed.opd[0], instr.bits, true);
				var src = Variable.newarray(instr.parsed.opd[2], size);
				context.objects[instr.parsed.opd[0]] = {
					instr: instr,
					type: DalvikType.NewArray,
				};
				return Base.assign(dst, src);
			},
			'aput-object': function(instr, context, instructions) {
				var dst = Variable.local(instr.parsed.opd[0], instr.bits, true);
				var src = Variable.local(instr.parsed.opd[1], instr.bits);
				var index = _handle_type(context.objects[instr.parsed.opd[2]], Variable.local(instr.parsed.opd[2], instr.bits, true));
				return Base.assign_to_array(dst, src, index);
			},
			'new-instance': function(instr, context, instructions) {
				context.objects[instr.parsed.opd[0]] = {
					instr: instr,
					type: DalvikType.NewObject,
				};
				return Base.nop();
			},
			'if-eqz': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'EQ');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-nez': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'NE');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-ltz': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'LT');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-gez': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'GE');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-gtz': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'GT');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-lez': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], '0', 'LE');
				instr.jump = Long.fromString(instr.parsed.opd[1], true, 16);
				return Base.nop();
			},
			'if-eq': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'EQ');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'if-ne': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'NE');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'if-lt': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'LT');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'if-ge': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'GE');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'if-gt': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'GT');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'if-le': function(instr, context, instructions) {
				instr.conditional(instr.parsed.opd[0], instr.parsed.opd[1], 'LE');
				instr.jump = Long.fromString(instr.parsed.opd[2], true, 16);
				return Base.nop();
			},
			'invoke-super': _invoke_super,
			'invoke-direct': _invoke_direct,
			'invoke-static': _invoke_static,
			'invoke-virtual': _invoke_virtual,
			'invoke-interface': _invoke_virtual,
			'invoke-custom': _invoke_static,
			'iget': _iget_generic,
			'iget-wide': _iget_generic,
			'iget-boolean': _iget_generic,
			'iget-object': _iget_generic,
			'iput-object': _iput_generic,
			'sget-object': function(instr, context, instructions) {
				var p = instr.parsed;
				context.objects[p.opd[0]] = {
					instr: instr,
					type: DalvikType.StaticObject,
				};
				var dst = Variable.local(p.opd[0], instr.bits, true);
				var src = Variable.object(p.opd[1]);
				return Base.assign(dst, src);
			},
			'sput-boolean': function(instr, context, instructions) {
				var p = instr.parsed;
				context.objects[p.opd[0]] = {
					instr: instr,
					type: DalvikType.StaticObject,
				};
				var src = Variable.local(p.opd[0], instr.bits, true);
				var dst = Variable.object(p.opd[1]);
				return Base.assign(dst, src);
			},
			nop: function() {
				return Base.nop();
			},
			'move-result': function(instr, context, instructions) {
				context.objects[instr.parsed.opd[0]] = {
					instr: instr,
					type: DalvikType.ResultValue,
				};
				return Base.nop();
			},
			'move-result-object': function(instr, context, instructions) {
				context.objects[instr.parsed.opd[0]] = {
					instr: instr,
					type: DalvikType.ResultValue,
				};
				return Base.nop();
			},
			'check-cast': function(instr, context, instructions) {
				instr.setBadJump();
				var a = Variable.local(instr.parsed.opd[0], instr.bits, true);
				var b = Variable.object(instr.parsed.opd[1]);
				_conditional_inline(instr, instructions, a, b, 'INSTANCEOF');
				return Base.throw(Variable.object(JavaClassCastException, _throw_exception(instr.parsed.opd[1])));
			},
			'return-object': function(instr, context) {
				var p = instr.parsed;
				instr.setBadJump();
				context.returntype = JavaObject;
				return Base.return(Variable.local(p.opd[0], instr.bits, true));
			},
			'return-void': function(instr, context) {
				instr.setBadJump();
				context.returntype = 'void';
				return Base.return();
			},
			return: function(instr, context) {
				var p = instr.parsed;
				instr.setBadJump();
				context.returntype = 'int';
				return Base.return(Variable.local(p.opd[0], instr.bits, true));
			},
			'goto': function(instr, context) {
				context.returntype = 'int';
				instr.jump = Long.fromString(instr.parsed.opd[0], true, 16);
				return Base.nop();
			},
			invalid: function(instr, context, instructions) {
				return Base.nop();
			}
		},
		parse: function(assembly) {
			const regex = /^([\w-]+)(\/?(from|high|range|jumbo)?(\d+)?(\s.+$)$)?(\s.+$)?$/;
			var token = assembly.trim().match(regex);
			//console.log(assembly);
			//console.log(token);
			var operands;
			var bits = 32;
			var cast = false;
			var args = [];
			var mnem = 'illegal';
			mnem = token[1] || token[0];
			cast = token[3] ? true : false;
			bits = token[4] ? parseInt(token[4]) : 32;
			operands = token[5] ? token[5].trim().replace(/;\s+0x[\da-f]+(\s+)?$|^\{.+\},|^\{\},/g, '').trim().split(', ') : [];
			args = token[5] && token[5].match(/({.+})|({})/) ? token[5].match(/({.+})|({})/)[0].replace(/[{,}]/g, ' ').replace(/\s+/g, ' ').trim().split(' ') : [];
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
				arguments: {},
				returntype: 'void'
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
			return Object.keys(context.arguments).map(function(x) {
				return context.arguments[x];
			});
		},
		returns: function(context) {
			return context.returntype;
		},
		routine_name: function(name) {
			return Extra.replace.object(name);
		}
	};
})();