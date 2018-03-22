#include <stdlib.h>
#include <stdint.h>

#define LONG_SYMBOL (DUK_HIDDEN_SYMBOL("number"))
#define LONG_RETURN_A_VAL (1)
#define LONG_RETURN_UNDEFINED (0)

uint64_t* Long_get_uint64(duk_context *ctx, duk_idx_t offset) {
	duk_get_prop_string(ctx, offset, LONG_SYMBOL);
	// object already 'this', so we don't need to have -1.
	return (uint64_t*) duk_get_buffer(ctx, offset, NULL);
}

uint64_t Long_get_uint64_from_obj(duk_context *ctx, duk_idx_t offset) {
	duk_get_prop_string(ctx, offset, LONG_SYMBOL);
	// object value always -1 from offset
	uint64_t p = *((uint64_t*) duk_get_buffer(ctx, offset - 1, NULL));
	duk_pop_2(ctx);
	return p;
}

/* Long.prototype.toString */
duk_ret_t Long_prototype_toString(duk_context *ctx) {
	int base = 10;
	duk_push_this(ctx);
	uint64_t* this_number = Long_get_uint64(ctx, -1);
	if (duk_is_number(ctx, 0)) {
		base = (int) duk_get_number(ctx, 0);
	}

	if (base == 8) {
		duk_push_sprintf(ctx, "%llo",  *this_number);
	} else if (base == 10) {
		duk_push_sprintf(ctx, "%llu",  *this_number);
	} else if (base == 16) {
		duk_push_sprintf(ctx, "%llx",  *this_number);
	} else {
		duk_pop(ctx);
		return DUK_RET_TYPE_ERROR;
	}
	return LONG_RETURN_A_VAL;
}

int Long_get_argument_number(duk_context *ctx, uint64_t* number) {
	if(!number) {
		return 0;
	} else if (duk_is_string(ctx, 0)) {
		*number = strtoul(duk_safe_to_string(ctx, 0), NULL, 0);
	} else if (duk_is_number(ctx, 0)) {
		double a = duk_get_number(ctx, 0);
		*number = a;
	} else if (duk_is_object(ctx, 0)) {
		*number = Long_get_uint64_from_obj(ctx, 0);
	} else {
		duk_pop(ctx);
		return 0;
	}
	return 1;
}

void Long_return_new_instance(duk_context *ctx, uint64_t number) {
	char buf[256];
	snprintf(buf, sizeof(buf), "new Long('0x%llx')", number);
	duk_eval_string(ctx, buf);
}

/* Long.prototype.add */
duk_ret_t Long_prototype_add(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number + number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.and */
duk_ret_t Long_prototype_and(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number & number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.divide */
duk_ret_t Long_prototype_divide(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number / number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.modulo */
duk_ret_t Long_prototype_modulo(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number % number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.multiply */
duk_ret_t Long_prototype_multiply(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number * number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.negate */
duk_ret_t Long_prototype_negate(duk_context *ctx) {
	duk_push_this(ctx);
	int64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, 0 - this_number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.not */
duk_ret_t Long_prototype_not(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, ~this_number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.or */
duk_ret_t Long_prototype_or(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number | number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.shiftLeft */
duk_ret_t Long_prototype_shiftLeft(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number << number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.shiftRight */
duk_ret_t Long_prototype_shiftRight(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	int64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number >> number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.shiftRightUnsigned */
duk_ret_t Long_prototype_shiftRightUnsigned(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number >> number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.subtract */
duk_ret_t Long_prototype_subtract(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number - number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.xor */
duk_ret_t Long_prototype_xor(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	Long_return_new_instance(ctx, this_number ^ number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.compare */
duk_ret_t Long_prototype_compare(duk_context *ctx) {
	duk_push_this(ctx);
	int64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	int64_t this_number = *(Long_get_uint64(ctx, -1));
	if (this_number == number) {
		duk_push_int(ctx, 0);
	} else if(this_number > number) {
		duk_push_int(ctx, 1);
	} else {
		duk_push_int(ctx, -1);
	}
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.equals */
duk_ret_t Long_prototype_equals(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number == number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.greaterThan */
duk_ret_t Long_prototype_greaterThan(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number > number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.greaterThanOrEqual */
duk_ret_t Long_prototype_greaterThanOrEqual(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number >= number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.lessThan */
duk_ret_t Long_prototype_lessThan(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number < number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.lessThanOrEqual */
duk_ret_t Long_prototype_lessThanOrEqual(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number <= number);
	return LONG_RETURN_A_VAL;
}

/* Long.prototype.notEquals */
duk_ret_t Long_prototype_notEquals(duk_context *ctx) {
	duk_push_this(ctx);
	uint64_t number = 0;
	if (!Long_get_argument_number(ctx, &number)) {
		return DUK_RET_TYPE_ERROR;
	}
	uint64_t this_number = *(Long_get_uint64(ctx, -1));
	duk_push_boolean(ctx, this_number != number);
	return LONG_RETURN_A_VAL;
}

/* Long */
duk_ret_t Long_constructor(duk_context *ctx) {
	if (!duk_is_constructor_call(ctx)) {
		return DUK_RET_TYPE_ERROR;
	}
	duk_push_this(ctx);
	if (!duk_is_string(ctx, 0)) {
		duk_pop(ctx);
		return DUK_RET_TYPE_ERROR;
	}
	const char* s  = duk_safe_to_string(ctx, 0);
	uint64_t* p = (uint64_t*) duk_push_fixed_buffer(ctx, sizeof(uint64_t));
	*p = strtoul(s, NULL, 0);
	duk_put_prop_string(ctx, -2, LONG_SYMBOL);
	return LONG_RETURN_UNDEFINED;
}

void duk_common_push_function(duk_context *ctx, const char* name, duk_c_function func, duk_idx_t nargs) {
	duk_push_c_function(ctx, func, nargs);
	duk_put_prop_string(ctx, -2, name);
}

/* Initialize Long into global object. */
void Long_init(duk_context *ctx) {
	duk_push_c_function(ctx, Long_constructor, 1 /*nargs*/);
	duk_push_object(ctx);
	duk_common_push_function(ctx, "toString", Long_prototype_toString, 1 /*nargs*/);
	duk_common_push_function(ctx, "add", Long_prototype_add, 1 /*nargs*/);
	duk_common_push_function(ctx, "and", Long_prototype_and, 1 /*nargs*/);
	duk_common_push_function(ctx, "div", Long_prototype_divide, 1 /*nargs*/);
	duk_common_push_function(ctx, "divide", Long_prototype_divide, 1 /*nargs*/);
	duk_common_push_function(ctx, "rem", Long_prototype_modulo, 1 /*nargs*/);
	duk_common_push_function(ctx, "mod", Long_prototype_modulo, 1 /*nargs*/);
	duk_common_push_function(ctx, "modulo", Long_prototype_modulo, 1 /*nargs*/);
	duk_common_push_function(ctx, "mul", Long_prototype_multiply, 1 /*nargs*/);
	duk_common_push_function(ctx, "multiply", Long_prototype_multiply, 1 /*nargs*/);
	duk_common_push_function(ctx, "neg", Long_prototype_negate, 0 /*nargs*/);
	duk_common_push_function(ctx, "negate", Long_prototype_negate, 0 /*nargs*/);
	duk_common_push_function(ctx, "not", Long_prototype_not, 0 /*nargs*/);
	duk_common_push_function(ctx, "or", Long_prototype_or, 1 /*nargs*/);
	duk_common_push_function(ctx, "shl", Long_prototype_shiftLeft, 1 /*nargs*/);
	duk_common_push_function(ctx, "shiftLeft", Long_prototype_shiftLeft, 1 /*nargs*/);
	duk_common_push_function(ctx, "shr", Long_prototype_shiftRight, 1 /*nargs*/);
	duk_common_push_function(ctx, "shiftRight", Long_prototype_shiftRight, 1 /*nargs*/);
	duk_common_push_function(ctx, "shru", Long_prototype_shiftRightUnsigned, 1 /*nargs*/);
	duk_common_push_function(ctx, "shiftRightUnsigned", Long_prototype_shiftRightUnsigned, 1 /*nargs*/);
	duk_common_push_function(ctx, "sub", Long_prototype_subtract, 1 /*nargs*/);
	duk_common_push_function(ctx, "subtract", Long_prototype_subtract, 1 /*nargs*/);
	duk_common_push_function(ctx, "xor", Long_prototype_xor, 1 /*nargs*/);
	duk_common_push_function(ctx, "comp", Long_prototype_compare, 1 /*nargs*/);
	duk_common_push_function(ctx, "compare", Long_prototype_compare, 1 /*nargs*/);
	duk_common_push_function(ctx, "eq", Long_prototype_equals, 1 /*nargs*/);
	duk_common_push_function(ctx, "equals", Long_prototype_equals, 1 /*nargs*/);
	duk_common_push_function(ctx, "gt", Long_prototype_greaterThan, 1 /*nargs*/);
	duk_common_push_function(ctx, "greaterThan", Long_prototype_greaterThan, 1 /*nargs*/);
	duk_common_push_function(ctx, "ge", Long_prototype_greaterThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "gte", Long_prototype_greaterThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "greaterThanOrEqual", Long_prototype_greaterThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "lt", Long_prototype_lessThan, 1 /*nargs*/);
	duk_common_push_function(ctx, "lessThan", Long_prototype_lessThan, 1 /*nargs*/);
	duk_common_push_function(ctx, "le", Long_prototype_lessThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "lte", Long_prototype_lessThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "lessThanOrEqual", Long_prototype_lessThanOrEqual, 1 /*nargs*/);
	duk_common_push_function(ctx, "ne", Long_prototype_notEquals, 1 /*nargs*/);
	duk_common_push_function(ctx, "neq", Long_prototype_notEquals, 1 /*nargs*/);
	duk_common_push_function(ctx, "notEquals", Long_prototype_notEquals, 1 /*nargs*/);

	duk_put_prop_string(ctx, -2, "prototype");
	duk_put_global_string(ctx, "Long");
	duk_eval_string(ctx, "Long.fromString = function(x){return new Long(x);}");
	duk_eval_string(ctx, "Long.ZERO = new Long('0')");
	duk_eval_string(ctx, "Long.ONE = new Long('1')");
	duk_eval_string(ctx, "Long.NEG_ONE = new Long('0xFFFFFFFFFFFFFFFF')");
	duk_eval_string(ctx, "Long.UZERO = new Long('0')");
	duk_eval_string(ctx, "Long.UONE = new Long('1')");
	duk_eval_string(ctx, "Long.MAX_VALUE = new Long('0x7FFFFFFFFFFFFFFF')");
	duk_eval_string(ctx, "Long.MIN_VALUE = new Long('0x8000000000000000')");
	duk_eval_string(ctx, "Long.MAX_UNSIGNED_VALUE = new Long('0xFFFFFFFFFFFFFFFF')");
}
