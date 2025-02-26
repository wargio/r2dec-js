// SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "base64.h"
#include "r2dec.h"
#include "js/bytecode.h"

struct r2dec_s {
	JSRuntime *runtime;
	JSContext *context;
};

#define macro_str(s) #s
#define errorf(...)  fprintf(stderr, __VA_ARGS__)

void js_print_exception(JSContext *ctx, JSValueConst val) {
	const char *strval = JS_ToCString(ctx, val);
	if (strval) {
		fprintf(stderr, "%s\n", strval);
		JS_FreeCString(ctx, strval);
	} else {
		fprintf(stderr, "[exception]\n");
	}
}

void r2dec_handle_exception(JSContext *ctx) {
	JSValue exception = JS_GetException(ctx);
	int is_error = JS_IsError(ctx, exception);

	js_print_exception(ctx, exception);
	if (!is_error) {
		JS_FreeValue(ctx, exception);
		return;
	}

	JSValue stack = JS_GetPropertyStr(ctx, exception, "stack");
	if (!JS_IsUndefined(stack)) {
		js_print_exception(ctx, stack);
	}
	JS_FreeValue(ctx, stack);
	JS_FreeValue(ctx, exception);
}

#if 0
static void print_jsval(JSValue val) {
	if(JS_IsNumber(val)) {
		errorf("JS_IsNumber\n");
	} else if(JS_IsBigInt(NULL, val)) {
		errorf("JS_IsBigInt\n");
	} else if(JS_IsBool(val)) {
		errorf("JS_IsBool\n");
	} else if(JS_IsNull(val)) {
		errorf("JS_IsNull\n");
	} else if(JS_IsUndefined(val)) {
		errorf("JS_IsUndefined\n");
	} else if(JS_IsException(val)) {
		errorf("JS_IsException\n");
	} else if(JS_IsUninitialized(val)) {
		errorf("JS_IsUninitialized\n");
	} else if(JS_IsString(val)) {
		errorf("JS_IsString\n");
	} else if(JS_IsSymbol(val)) {
		errorf("JS_IsSymbol\n");
	} else if(JS_IsObject(val)) {
		errorf("JS_IsObject\n");
	} else if(JS_VALUE_GET_TAG(val) == JS_TAG_MODULE) {
		errorf("Module\n");
	} else if(JS_VALUE_GET_TAG(val) == JS_TAG_FUNCTION_BYTECODE) {
		errorf("Function bytecode\n");
	} else {
		errorf("No idea...\n");
	}
}
#endif

static int js_add_module(JSContext *ctx, const uint8_t *bytecode, const uint32_t size) {
	JSValue obj = JS_ReadObject(ctx, bytecode, size, JS_READ_OBJ_BYTECODE);
	if (JS_IsException(obj)) {
		r2dec_handle_exception(ctx);
		return 0;
	}
	return 1;
}

static int js_load_module(JSContext *ctx, const uint8_t *bytes, const uint32_t size) {
	JSValue obj = JS_ReadObject(ctx, bytes, size, JS_READ_OBJ_BYTECODE);
	if (JS_IsException(obj)) {
		r2dec_handle_exception(ctx);
		return 0;
	}

	if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE &&
		JS_ResolveModule(ctx, obj) < 0) {
		JS_FreeValue(ctx, obj);
		errorf("Error: failed to resolve r2dec module\n");
		return 0;
	}

	JSValue val = JS_EvalFunction(ctx, obj);
	if (JS_IsException(val)) {
		r2dec_handle_exception(ctx);
		return 0;
	}
	JS_FreeValue(ctx, val);
	return 1;
}

#include "js/bytecode_mod.h"

void r2dec_free(r2dec_t *dec) {
	if (!dec) {
		return;
	}

	JS_FreeContext(dec->context);
	JS_FreeRuntime(dec->runtime);
	free(dec);
}

static JSValue js_atob(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	if (argc != 1 || !JS_IsString(argv[0])) {
		return JS_EXCEPTION;
	}

	const char *encoded = JS_ToCString(ctx, argv[0]);
	if (!encoded) {
		return JS_EXCEPTION;
	}

	int length = (int)strlen(encoded);
	if (length < 1 || !base64integrity(encoded, length)) {
		JS_FreeCString(ctx, encoded);
		return JS_ThrowInternalError(ctx, "Invalid base64 string");
	}

	int flen = 0;
	char *decoded = (char *)unbase64(encoded, length, &flen);
	JS_FreeCString(ctx, encoded);

	JSValue result = JS_NewStringLen(ctx, decoded, flen);
	free(decoded);
	return result;
}

static JSValue js_btoa(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	if (argc != 1 || !JS_IsString(argv[0])) {
		return JS_EXCEPTION;
	}

	const char *decoded = JS_ToCString(ctx, argv[0]);
	if (!decoded) {
		return JS_EXCEPTION;
	}

	int length = (int)strlen(decoded);
	if (length < 0) {
		JS_FreeCString(ctx, decoded);
		return JS_ThrowInternalError(ctx, "Invalid string");
	} else if (!length) {
		JS_FreeCString(ctx, decoded);
		return JS_NewString(ctx, "");
	}

	int flen = 0;
	char *encoded = base64(decoded, length, &flen);
	JS_FreeCString(ctx, decoded);

	JSValue result = JS_NewStringLen(ctx, encoded, flen);
	free(encoded);
	return result;
}

r2dec_t *r2dec_new() {
	JSRuntime *rt = JS_NewRuntime();
	if (!rt) {
		errorf("Error: failed to create qjs runtime\n");
		return NULL;
	}

	JSContext *ctx = JS_NewContextRaw(rt);
	if (!ctx) {
		errorf("Error: failed to create qjs context\n");
		JS_FreeRuntime(rt);
		return NULL;
	}

	// initialize all intrisic
	JS_AddIntrinsicBaseObjects(ctx);
	JS_AddIntrinsicEval(ctx);
	JS_AddIntrinsicRegExpCompiler(ctx);
	JS_AddIntrinsicRegExp(ctx);
	JS_AddIntrinsicJSON(ctx);
	JS_AddIntrinsicTypedArrays(ctx);
	JS_AddIntrinsicPromise(ctx);
	JS_AddIntrinsicBigInt(ctx);
	JS_AddIntrinsicDate(ctx);

	// Setup global objects.
	JSValue global = JS_GetGlobalObject(ctx);

	JS_SetPropertyStr(ctx, global, "atob", JS_NewCFunction(ctx, js_atob, "atob", 1));
	JS_SetPropertyStr(ctx, global, "btoa", JS_NewCFunction(ctx, js_btoa, "btoa", 1));

	JSValue limits = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "Limits", limits);
	JS_SetPropertyStr(ctx, limits, "UT16_MAX", JS_NewBigUint64(ctx, 0xFFFFu));
	JS_SetPropertyStr(ctx, limits, "UT32_MAX", JS_NewBigUint64(ctx, 0xFFFFFFFFu));
	JS_SetPropertyStr(ctx, limits, "UT64_MAX", JS_NewBigUint64(ctx, 0xFFFFFFFFFFFFFFFFull));
	JS_SetPropertyStr(ctx, limits, "ST16_MAX", JS_NewBigInt64(ctx, 0x7FFF));
	JS_SetPropertyStr(ctx, limits, "ST32_MAX", JS_NewBigInt64(ctx, 0x7FFFFFFF));
	JS_SetPropertyStr(ctx, limits, "ST64_MAX", JS_NewBigInt64(ctx, 0x7FFFFFFFFFFFFFFFull));
	JS_FreeValue(ctx, global);

	if (!js_load_all_modules(ctx)) {
		JS_FreeContext(ctx);
		JS_FreeRuntime(rt);
		return NULL;
	}

	r2dec_t *dec = malloc(sizeof(r2dec_t));
	if (!dec) {
		errorf("Error: failed to allocate r2dec_t\n");
		JS_FreeContext(ctx);
		JS_FreeRuntime(rt);
		return NULL;
	}

	dec->context = ctx;
	dec->runtime = rt;
	return dec;
}

JSContext *r2dec_context(const r2dec_t *dec) {
	return dec->context;
}

int r2dec_run(const r2dec_t *dec) {
	return js_load_module(dec->context, main_bytecode, main_bytecode_size);
}
