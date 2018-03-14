/* Long.prototype.printName */
duk_ret_t Long_print_name(duk_context *ctx) {
	duk_push_this(ctx);
	duk_get_prop_string(ctx, -1, "name");
	printf("My name is: %s\n", duk_safe_to_string(ctx, -1));
	return 0;
}

/* Long */
duk_ret_t Long_constructor(duk_context *ctx) {
	if (!duk_is_constructor_call(ctx)) {
		return DUK_RET_TYPE_ERROR;
	}

	/* Set this.name = name; */
	duk_push_this(ctx);
	duk_dup(ctx, 0);
	duk_put_prop_string(ctx, -2, "name");

	return 0;  /* use default instance */
}

/* Initialize Long into global object. */
void Long_init(duk_context *ctx) {
	duk_push_c_function(ctx, Long_constructor, 1 /*nargs*/);
	duk_push_object(ctx);
	duk_push_c_function(ctx, Long_print_name, 0 /*nargs*/);
	duk_put_prop_string(ctx, -2, "printName");
	duk_put_prop_string(ctx, -2, "prototype");
	duk_put_global_string(ctx, "Long");
}

void initialize_long_js(duk_context *ctx) {
	duk_eval_string(ctx, "1+2");
}
