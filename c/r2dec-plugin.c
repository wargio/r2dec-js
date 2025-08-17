// SPDX-FileCopyrightText: 2018-2025 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

#include <stdlib.h>
#include <string.h>
#include <r_types.h>
#include <r_core.h>

#include "r2dec.h"

typedef struct exec_context_t {
	RCore *core;
	void *bed;
	JSValue shared;
} ExecContext;

#undef R_API
#define R_API static
#undef R_IPI
#define R_IPI static

#define SETDESC(x, y)    r_config_node_desc(x, y)
#define SETPREF(x, y, z) SETDESC(r_config_set(cfg, x, y), z)

static JSValue js_command(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	if (argc != 1) {
		return JS_EXCEPTION;
	}

	const char *command = JS_ToCString(ctx, argv[0]);
	if (!command) {
		return JS_EXCEPTION;
	}

	ExecContext *ectx = (ExecContext *)JS_GetContextOpaque(ctx);
	RCore *core = ectx->core;
#if R2_VERSION_NUMBER >= 50909
	r_cons_sleep_end(core->cons, ectx->bed);
#else
	r_cons_sleep_end(ectx->bed);
#endif

	char *output = r_core_cmd_str(core, command);
	JS_FreeCString(ctx, command);
	JSValue result = JS_NewString(ctx, output ? output : "");
	free(output);

#if R2_VERSION_NUMBER >= 50909
	ectx->bed = r_cons_sleep_begin(core->cons);
#else
	ectx->bed = r_cons_sleep_begin();
#endif
	return result;
}

static JSValue js_console_log(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	ExecContext *ectx = (ExecContext *)JS_GetContextOpaque(ctx);
	RCore *core = ectx->core;
	for (int i = 0; i < argc; ++i) {
		if (i != 0) {
#if R2_VERSION_NUMBER >= 50909
			r_cons_print(core->cons, " ");
#else
			r_cons_print(" ");
#endif
		}
		const char *str = JS_ToCString(ctx, argv[i]);
		if (!str) {
			return JS_EXCEPTION;
		}
#if R2_VERSION_NUMBER >= 50909
		r_cons_print(core->cons, str);
#else
		r_cons_print(str);
#endif
		JS_FreeCString(ctx, str);
	}
#if R2_VERSION_NUMBER >= 50909
	r_cons_newline(core->cons);
	r_cons_flush(core->cons);
#else
	r_cons_newline();
	r_cons_flush();
#endif
	return JS_UNDEFINED;
}

static JSValue js_get_global(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	ExecContext *ectx = (ExecContext *)JS_GetContextOpaque(ctx);
	return JS_GetPropertyStr(ctx, ectx->shared, "Shared");
}

static r2dec_t *r2dec_create(ExecContext *ec, const char *arg) {
	r2dec_t *dec = r2dec_new();
	if (!dec) {
		return NULL;
	}

	JSContext *ctx = r2dec_context(dec);
	JS_SetContextOpaque(ctx, ec);
	ec->shared = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, ec->shared, "Shared", JS_NewObject(ctx));

	JSValue global = JS_GetGlobalObject(ctx);
	JS_SetPropertyStr(ctx, global, "Global", JS_NewCFunction(ctx, js_get_global, "Global", 1));

	JSValue console = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "console", console);
	JS_SetPropertyStr(ctx, console, "log", JS_NewCFunction(ctx, js_console_log, "log", 1));

	JSValue radare2 = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "radare2", radare2);
	JS_SetPropertyStr(ctx, radare2, "command", JS_NewCFunction(ctx, js_command, "command", 1));
	JS_SetPropertyStr(ctx, radare2, "version", JS_NewString(ctx, R2_VERSION));

	JSValue process = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "process", process);
	JSValue args = JS_NewArray(ctx);
	if (!R_STR_ISEMPTY(arg)) {
		JS_SetPropertyInt64(ctx, args, 0, JS_NewString(ctx, arg));
	}
	JS_SetPropertyStr(ctx, process, "args", args);

	JS_FreeValue(ctx, global);
	return dec;
}

static void r2dec_destroy(r2dec_t *dec, ExecContext *ec) {
	JSContext *ctx = r2dec_context(dec);
	JS_FreeValue(ctx, ec->shared);
	r2dec_free(dec);
}

static bool r2dec_main(RCore *core, const char *arg) {
	ExecContext ectx;
	ectx.core = core;

	r2dec_t *dec = r2dec_create(&ectx, arg);
	if (!dec) {
		return false;
	}

#if R2_VERSION_NUMBER >= 50909
	ectx.bed = r_cons_sleep_begin(core->cons);
	bool ret = r2dec_run(dec);
	r_cons_sleep_end(core->cons, ectx.bed);
#else
	ectx.bed = r_cons_sleep_begin();
	bool ret = r2dec_run(dec);
	r_cons_sleep_end(ectx.bed);
#endif

	r2dec_destroy(dec, &ectx);
	return ret;
}

static void usage(const RCore* const core) {
	const char* help[] = {
		"Usage: pdd[*tcabojAfi]", "", "# Core plugin for r2dec",
		"pdd",  "",                   "decompile current function",
		"pddt", "",                   "lists the supported architectures",
		"pdd*", "",                   "decompiled code is returned to r2 as comment (via CCu)",
		"pddc", "",                   "decompiled code is returned to r2 as 'file:line code' (via CL)",
		"pdda", "",                   "decompile current function with side assembly",
		"pddb", "",                   "decompile current function but show only scopes",
		"pddo", "",                   "decompile current function side by side with offsets",
		"pddj", "",                   "decompile current function as json",
		"pddA", "",                   "decompile current function with annotation output",
		"pddf", "",                   "decompile all functions",
		"pddi", "",                   "generate issue data",
		NULL
	};

#if R2_VERSION_NUMBER >= 50909
	r_cons_cmd_help(core->cons, help, core->print->flags & R_PRINT_FLAGS_COLOR);
#else
	r_cons_cmd_help(help, core->print->flags & R_PRINT_FLAGS_COLOR);
#endif
}

static void _cmd_pdd(RCore *core, const char *input) {
	switch (*input) {
	case '\0':
		r2dec_main (core, NULL);
		break;
	case 't':
		// --architectures
		r2dec_main (core, "--architectures");
		break;
	case 'i':
		// --issue
		r2dec_main (core, "--issue");
		break;
	case 'a':
		// --assembly
		r2dec_main (core, "--assembly");
		break;
	case 'o':
		// --offsets
		r2dec_main (core, "--offsets");
		break;
	case 'b':
		// --blocks
		r2dec_main (core, "--blocks");
		break;
	case 'c':
		// --as-code-line
		r2dec_main (core, "--as-code-line");
		break;
	case 'f':
		r2dec_main (core, "--all-functions");
		break;
	case '*':
		// --as-comment
		r2dec_main (core, "--as-comment");
		break;
	case 'j':
		// --as-json
		r2dec_main (core, "--as-json");
		break;
	case 'A':
		// --annotation
		r2dec_main (core, "--annotation");
		break;
	case '?':
	default:
		usage(core);
		break;
	}
}

#if R2_VERSION_NUMBER >= 50909
static bool r_cmd_pdd(RCorePluginSession *cps, const char *input) {
	if (r_str_startswith (input, "pdd")) {
		RCore *core = cps->core;
		const ut64 addr = core->addr;
		_cmd_pdd (core, input + 3);
		r_core_seek (core, addr, true);
		return true;
	}
	return false;
}
#else
static int r_cmd_pdd(void *user, const char *input) {
	RCore *core = (RCore *) user;
	if (r_str_startswith (input, "pdd")) {
		const ut64 addr = core->offset;
		_cmd_pdd (core, input + 3);
		r_core_seek (core, addr, true);
		return 1;
	}
	return 0;
}
#endif

#if R2_VERSION_NUMBER >= 50909
static bool r_cmd_pdd_init(RCorePluginSession *cps) {
	RConfig *cfg = cps->core->config;
	r_config_lock (cfg, false);
	SETPREF("r2dec.asm", "false", "if true, shows pseudo next to the assembly.");
	SETPREF("r2dec.blocks", "false", "if true, shows only scopes blocks.");
	SETPREF("r2dec.casts", "false", "if false, hides all casts in the pseudo code.");
	SETPREF("r2dec.debug", "false", "do not catch exceptions in r2dec.");
	SETPREF("r2dec.highlight", "default", "highlights the current address.");
	SETPREF("r2dec.paddr", "false", "if true, all xrefs uses physical addresses compare.");
	SETPREF("r2dec.slow", "false", "load all the data before to avoid multirequests to r2.");
	SETPREF("r2dec.xrefs", "false", "if true, shows all xrefs in the pseudo code.");
	r_config_lock (cfg, true);

	const char *commands[] = {
		"pdd", "pdd?", "pdd*", "pdda", "pddb",
		"pddc", "pddf", "pddi", "pdds", "pddu",
		NULL
	};
	RCoreAutocomplete *a = cps->core->autocomplete;
	for (const char **cmd = commands; *cmd; cmd++) {
		r_core_autocomplete_add(a, *cmd, R_CORE_AUTOCMPLT_DFLT, true);
	}
	return true;
}
#else
static int r_cmd_pdd_init(void *user, const char *cmd) {
	RCmd *rcmd = (RCmd*) user;
	RCore *core = (RCore *) rcmd->data;
	RConfig *cfg = core->config;
	r_config_lock (cfg, false);
	SETPREF("r2dec.asm", "false", "if true, shows pseudo next to the assembly.");
	SETPREF("r2dec.blocks", "false", "if true, shows only scopes blocks.");
	SETPREF("r2dec.casts", "false", "if false, hides all casts in the pseudo code.");
	SETPREF("r2dec.debug", "false", "do not catch exceptions in r2dec.");
	SETPREF("r2dec.highlight", "default", "highlights the current address.");
	SETPREF("r2dec.paddr", "false", "if true, all xrefs uses physical addresses compare.");
	SETPREF("r2dec.slow", "false", "load all the data before to avoid multirequests to r2.");
	SETPREF("r2dec.xrefs", "false", "if true, shows all xrefs in the pseudo code.");
	r_config_lock (cfg, true);

	// autocomplete here..
	r_core_autocomplete_add (core->autocomplete, "pdd", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdd?", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdd*", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdda", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddb", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddc", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddf", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddi", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdds", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddu", R_CORE_AUTOCMPLT_DFLT, true);
	return true;
}
#endif

RCorePlugin core_plugin_r2dec = {
#if R2_VERSION_NUMBER > 50808
	.meta = {
		.name = "r2dec",
		.desc = "Pseudo-code decompiler for radare2",
		.license = "BSD-3",
	},
#else
	.name = "r2dec",
	.desc = "Pseudo-code decompiler for radare2",
	.license = "BSD-3",
#endif
	.call = r_cmd_pdd,
	.init = r_cmd_pdd_init
};

#ifdef _MSC_VER
#define _R_API __declspec(dllexport)
#else
#define _R_API __attribute__((visibility("default")))
#endif

#ifndef CORELIB
_R_API RLibStruct radare_plugin = {
	.type = R_LIB_TYPE_CORE,
	.data = &core_plugin_r2dec,
	.version = R2_VERSION
#if R2_VERSION_MAJOR >= 4 &&  R2_VERSION_MINOR >= 2
	, .pkgname = "r2dec"
#endif
#if R2_VERSION_NUMBER >= 50909
	, .abiversion = R2_ABIVERSION
#endif
};
#endif
