/* radare - LGPL - Copyright 2018,2019 - pancake, deroad */

#include <stdlib.h>
#include <string.h>
#include <r_types.h>
#include <r_lib.h>
#include <r_cmd.h>
#include <r_core.h>
#include <r_cons.h>
#include <r_anal.h>
#include "duktape.h"
#include "duk_console.h"
#include "duk_missing.h"

#include "r2dec_ctx.h"

#undef R_API
#define R_API static
#undef R_IPI
#define R_IPI static
#define SETDESC(x,y) r_config_node_desc (x,y)
#define SETPREF(x,y,z) SETDESC (r_config_set (cfg,x,y), z)

/* for compatibility. */
#ifndef R2_HOME_DATADIR
#define R2_HOME_DATADIR R2_HOMEDIR
#endif

static char* r2dec_read_file(const char* file) {
	if (!file) {
		return 0;
	}
	char *r2dec_home;
	char *env = r_sys_getenv ("R2DEC_HOME");
	if (env) {
		r2dec_home = env;
	} else {
#ifdef R2DEC_HOME
		r2dec_home = r_str_new (R2DEC_HOME);
#else
		r2dec_home = r_str_home (R2_HOME_DATADIR R_SYS_DIR
			"r2pm" R_SYS_DIR "git" R_SYS_DIR "r2dec-js");
#endif
	}
	size_t len = 0;
	if (!r2dec_home) {
		return 0;
	}
	char *filepath = r_str_newf ("%s"R_SYS_DIR"%s", r2dec_home, file);
	free (r2dec_home);
	char* text = r_file_slurp (filepath, &len);
	if (text && len > 0) {
		free (filepath);
		return text;
	}
	free (filepath);
	return 0;
}

static duk_ret_t duk_r2cmd(duk_context *ctx) {
	if (duk_is_string (ctx, 0)) {
		const char* command = duk_safe_to_string (ctx, 0);
	    //fprintf (stderr, "R2CMD: %s\n", command);
	    //fflush (stderr);
		R2DecCtx *r2dec_ctx = r2dec_ctx_get (ctx);
		r_cons_sleep_end (r2dec_ctx->bed);
		char* output = r_core_cmd_str (r2dec_ctx->core, command);
		r2dec_ctx->bed = r_cons_sleep_begin ();
		duk_push_string (ctx, output);
		free (output);
		return 1;
	}
	return DUK_RET_TYPE_ERROR;
}

static duk_ret_t duk_internal_load(duk_context *ctx) {
	if (duk_is_string (ctx, 0)) {
		const char* fullname = duk_safe_to_string (ctx, 0);
		char* text = r2dec_read_file (fullname);
		if (text) {
			duk_push_string (ctx, text);
			free (text);
		} else {
			printf("Error: '%s' not found.\n", fullname);
			return DUK_RET_TYPE_ERROR;
		}
		return 1;
	}
	return DUK_RET_TYPE_ERROR;
}

static duk_ret_t duk_internal_require(duk_context *ctx) {
	char fullname[256];
	if (duk_is_string (ctx, 0)) {
		snprintf (fullname, sizeof(fullname), "%s.js", duk_safe_to_string (ctx, 0));
		char* text = r2dec_read_file (fullname);
		if (text) {
			duk_push_lstring (ctx, fullname, strlen (fullname));
			duk_eval_file (ctx, text);
			free (text);
		} else {
			printf("Error: '%s' not found.\n", fullname);
			return DUK_RET_TYPE_ERROR;
		}
		return 1;
	}
	return DUK_RET_TYPE_ERROR;
}

static void duk_r2_init(duk_context* ctx, R2DecCtx *r2dec_ctx) {
	duk_push_global_stash (ctx);
	duk_push_pointer (ctx, (void *)r2dec_ctx);
	duk_put_prop_string (ctx, -2, "r2dec_ctx");
	duk_pop (ctx);

	duk_push_c_function (ctx, duk_internal_require, 1);
	duk_put_global_string (ctx, "___internal_require");
	duk_push_c_function (ctx, duk_internal_load, 1);
	duk_put_global_string (ctx, "___internal_load");
	duk_push_c_function (ctx, duk_r2cmd, 1);
	duk_put_global_string (ctx, "r2cmd");
}

R2DecCtx *r2dec_ctx_get(duk_context *ctx) {
	duk_push_global_stash (ctx);
	duk_get_prop_string (ctx, -1, "r2dec_ctx");
	R2DecCtx *r = duk_require_pointer (ctx, -1);
	duk_pop_2 (ctx);
	return r;
}

//static void duk_r2_debug_stack(duk_context* ctx) {
//	duk_push_context_dump(ctx);
//	printf("%s\n", duk_to_string(ctx, -1));
//	duk_pop(ctx);
//}

static void eval_file(duk_context* ctx, const char* file) {
    //fprintf (stderr, "REQUIRE: %s\n", file);
    //fflush (stderr);
	char* text = r2dec_read_file (file);
	if (text) {
		duk_push_lstring (ctx, file, strlen (file));
		duk_eval_file_noresult (ctx, text);
		free (text);
	}
}

static void r2dec_fatal_function (void *udata, const char *msg) {
    fprintf (stderr, "*** FATAL ERROR: %s\n", (msg ? msg : "no message"));
    fflush (stderr);
    abort ();
}

static void duk_r2dec(RCore *core, const char *input) {
	char args[1024] = {0};
	R2DecCtx r2dec_ctx;
	r2dec_ctx.core = core;
	r2dec_ctx.bed = r_cons_sleep_begin ();
	duk_context *ctx = duk_create_heap (0, 0, 0, 0, r2dec_fatal_function);
	duk_console_init (ctx, 0);
//	Long_init (ctx);
	duk_r2_init (ctx, &r2dec_ctx);
	eval_file (ctx, "require.js");
	eval_file (ctx, "r2dec-duk.js");
	if (*input) {
		snprintf (args, sizeof(args), "try{if(typeof r2dec_main == 'function'){r2dec_main(\"%s\".split(/\\s+/));}else{console.log('Fatal error. Cannot use R2_HOME_DATADIR.');}}catch(_____e){console.log(_____e.stack||_____e);}", input);
	} else {
		snprintf (args, sizeof(args), "try{if(typeof r2dec_main == 'function'){r2dec_main([]);}else{console.log('Fatal error. Cannot use R2_HOME_DATADIR.');}}catch(_____e){console.log(_____e.stack||_____e);}");
	}
	duk_eval_string_noresult (ctx, args);
	//duk_r2_debug_stack(ctx);
	duk_destroy_heap (ctx);
	r_cons_sleep_end(r2dec_ctx.bed);
}

static void usage(const RCore* const core) {
	const char* help[] = {
		"Usage: pdd[*abousi]", "",	"# Core plugin for r2dec",
		"pdd",	"",        "decompile current function",
		"pdd*",	"",        "decompiled code is returned to r2 as comment (via CCu)",
		"pddc",	"",        "decompiled code is returned to r2 as 'file:line code' (via CL)",
		"pdda",	"",        "decompile current function with side assembly",
		"pddb",	"",        "decompile current function but show only scopes",
		"pddo",	"",        "decompile current function side by side with offsets",
		"pddj", "",        "decompile current function as json",
		"pddA", "",        "decompile current function with annotation output",
		"pddf", "",        "decompile all functions",
		"pddu",	"",        "upgrade r2dec via r2pm",
		"pdds", " branch", "switch r2dec branch",
		"pddi",	"",        "generate issue data",

		// "Evaluable Variables:", "", "",
		// "r2dec.casts",	"",	"if false, hides all casts in the pseudo code",
		// "r2dec.asm",	"",	"if true, shows pseudo next to the assembly",
		// "r2dec.blocks",	"",	"if true, shows only scopes blocks",
		// "r2dec.xrefs",	"",	"if true, shows all xrefs in the pseudo code",
		// "r2dec.paddr",	"",	"if true, all xrefs uses physical addresses compare",
		// "r2dec.theme",	"",	"defines the color theme to be used on r2dec",

		// "Environment:", "", "",
		// "R2DEC_HOME",	"",	"defaults to the root directory of the r2dec repo",

		NULL
	};

	r_cons_cmd_help(help, core->print->flags & R_PRINT_FLAGS_COLOR);
}

static void switch_git_branch(RCore *core, const char* branch) {
	if (strlen (branch) < 1) {
		r_cons_printf ("[r2dec] No branch specified.\n");
		return;
	}
	char *env = r_sys_getenv ("R2DEC_HOME");
	if (!env) {
		env = r_str_home (R2_HOME_DATADIR R_SYS_DIR
			"r2pm" R_SYS_DIR "git" R_SYS_DIR "r2dec-js");
	}
	if (!env) {
		r_cons_printf ("[r2dec] Fail to get home directory.\n");
		return;
	}
	r_core_cmdf (core, "!git -C %s fetch --all", env);
	r_core_cmdf (core, "!git -C %s checkout %s", env, branch);
	free (env);
}

static void _cmd_pdd(RCore *core, const char *input) {
	switch (*input) {
	case '\0':
		duk_r2dec (core, input);
		break;
	case ' ':
		duk_r2dec (core, input + 1);
		break;
	case 'u':
		// update
		r_core_cmd0 (core, "!r2pm -ci r2dec");
		break;
	case 's':
		// switch branch
		switch_git_branch (core, input + 1);
		break;
	case 'i':
		// --issue
		duk_r2dec (core, "--issue");
		break;
	case 'a':
		// --assembly
		duk_r2dec (core, "--assembly");
		break;
	case 'o':
		// --offsets
		duk_r2dec (core, "--offsets");
		break;
	case 'b':
		// --blocks
		duk_r2dec (core, "--blocks");
		break;
	case 'c':
		// --as-code-line
		duk_r2dec (core, "--as-code-line");
		break;
	case 'f':
		duk_r2dec (core, "--all-functions");
		break;
	case '*':
		// --as-comment
		duk_r2dec (core, "--as-comment");
		break;
	case 'j':
		// --as-json
		duk_r2dec (core, "--as-json");
		break;
	case 'A':
		// --as-json
		duk_r2dec (core, "--annotation");
		break;
	case '?':
	default:
		usage(core);
		break;
	}
}

static int r_cmd_pdd(void *user, const char *input) {
	RCore *core = (RCore *) user;
	if (!strncmp (input, "pdd", 3)) {
		_cmd_pdd (core, input + 3);
		return true;
	}
	return false;
}

int r_cmd_pdd_init(void *user, const char *cmd) {
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
	SETPREF("r2dec.theme", "default", "defines the color theme to be used on r2dec.");
	SETPREF("r2dec.xrefs", "false", "if true, shows all xrefs in the pseudo code.");
	r_config_lock (cfg, true);

	// autocomplete here..
	RCoreAutocomplete *pdd = r_core_autocomplete_add (core->autocomplete, "pdd", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdd?", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdd*", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdda", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddb", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddc", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddf", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddi", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdds", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddu", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (pdd, "--all-functions", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--as-code-line", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--as-comment", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--assembly", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--blocks", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--casts", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--colors", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--debug", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--html", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--issue", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--offsets", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--paddr", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--xrefs", R_CORE_AUTOCMPLT_OPTN, true);
	return true;
}

RCorePlugin r_core_plugin_test = {
	.name = "r2dec",
	.desc = "Pseudo-code decompiler for radare2",
	.license = "GPL3",
	.call = r_cmd_pdd,
	.init = r_cmd_pdd_init
};

#ifdef _MSC_VER
#define _R_API __declspec(dllexport)
#else
#define _R_API
#endif

#ifndef CORELIB
_R_API RLibStruct radare_plugin = {
	.type = R_LIB_TYPE_CORE,
	.data = &r_core_plugin_test,
	.version = R2_VERSION
#if R2_VERSION_MAJOR >= 4 &&  R2_VERSION_MINOR >= 2
	, .pkgname = "r2dec"
#endif
};
#endif
