/* radare - LGPL - Copyright 2018 - pancake, deroad */
#if 0
gcc -o core_test.so -fPIC `pkg-config --cflags --libs r_core` core_test.c -shared
mkdir -p ~/.config/radare2/plugins
mv core_test.so ~/.config/radare2/plugins
#endif

#include <r_types.h>
#include <r_lib.h>
#include <r_cmd.h>
#include <r_core.h>
#include <r_cons.h>
#include <string.h>
#include <r_anal.h>
#include <duktape.h>
#include <duk_console.h>

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
#include "long_js.c"

typedef struct {
	bool hidecasts;
	bool assembly;
} e_r2dec_t;

static RCore *core_link = 0;
static e_r2dec_t config = {0};

static char* r2dec_read_file(const char* file) {
	if (!file) {
		return 0;
	}
	char *r2dec_home = r_str_home (R2_HOME_DATADIR R_SYS_DIR "r2pm" R_SYS_DIR "git" R_SYS_DIR "r2dec-js" R_SYS_DIR);
	int len = 0;
	char filepath[1024];
	if (!r2dec_home) {
		return 0;
	}
	snprintf (filepath, sizeof(filepath), "%s%s", r2dec_home, file);
	free (r2dec_home);
	char* text = r_file_slurp (filepath, &len);
	if (text && len > 0) {
		return text;
	}
	return 0;
}

static duk_ret_t duk_r2cmd(duk_context *ctx) {
	if (duk_is_string (ctx, 0)) {
		char* output = r_core_cmd_str (core_link, duk_safe_to_string (ctx, 0));
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

static void duk_r2_init(duk_context* ctx) {
	duk_push_c_function (ctx, duk_internal_require, 1);
	duk_put_global_string (ctx, "___internal_require");
	duk_push_c_function (ctx, duk_internal_load, 1);
	duk_put_global_string (ctx, "___internal_load");
	duk_push_c_function (ctx, duk_r2cmd, 1);
	duk_put_global_string (ctx, "r2cmd");
}

static void duk_eval_file(duk_context* ctx, const char* file) {
	char* text = r2dec_read_file (file);
	if (text) {
		duk_eval_string_noresult (ctx, text);
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
	core_link = core;
	duk_context *ctx = duk_create_heap (0, 0, 0, 0, r2dec_fatal_function);
	duk_console_init (ctx, 0);
//	Long_init (ctx);
	duk_r2_init (ctx);
	duk_eval_file (ctx, "require.js");
	duk_eval_file (ctx, "r2dec-duk.js");
	if (*input) {
		snprintf (args, sizeof(args), "if(typeof r2dec_main == 'function'){r2dec_main(\"%s\".split(/\\s+/));}else{console.log('Fatal error. Cannot use R2_HOME_DATADIR.');}", input);
	} else {
		snprintf (args, sizeof(args), "if(typeof r2dec_main == 'function'){r2dec_main(\"\".split(/\\s+/));}else{console.log('Fatal error. Cannot use R2_HOME_DATADIR.');}");
	}
	duk_eval_string_noresult (ctx, args);
	duk_destroy_heap (ctx);
	core_link = 0;
}

static void usage(void) {
	eprintf ("Usage: pdd [args] - core plugin for r2dec\n");
	eprintf (" pdd   - decompile current function\n");
	eprintf (" pdd?  - show this help\n");
	eprintf (" pdda  - decompile current function with side assembly\n");
	eprintf (" pddu  - install/upgrade r2dec via r2pm\n");
	eprintf (" pddi  - generates the issue data\n");
}

static void _cmd_pdd(RCore *core, const char *input) {
	switch (*input) {
	case '\0':
		duk_r2dec(core, input);
		break;
	case ' ':
		duk_r2dec(core, input);
		break;
	case 'u':
		// update
		r_core_cmd0 (core, "!r2pm -ci r2dec");
		break;
	case 'i':
		// --issue
		duk_r2dec(core, "--issue");
		break;
	case 'a':
		// --assembly
		duk_r2dec(core, "--assembly");
		break;
	case '?':
	default:
		usage();
		break;
	}
}

static void custom_config(bool *p, const char* input) {
	if (strchr (input, '=')) {
		if(strchr (input, 't')) {
			*p = true;
		} else if(strchr (input, 'f')) {
			*p = false;
		}
	} else {
		r_cons_printf ("%s\n", ((*p) ? "true" : "false"));
	}
}

static int r_cmd_pdd(void *user, const char *input) {
	RCore *core = (RCore *) user;
	if (!strncmp (input, "e cmd.pdc", 9)) {
		if (strchr (input, '=') && strchr (input, '?')) {
			r_cons_printf ("r2dec\n");
			return false;
		}
	}
	if (!strncmp (input, "pdd", 3)) {
		_cmd_pdd (core, input + 3);
		return true;
	} else if (!strncmp (input, "r2dec", 5)) {
		duk_r2dec(core, input + 5);
		return true;
	}
	return false;
}

int r_cmd_pdd_init(void *user, const char *cmd) {
	RCmd *rcmd = (RCmd*) user;
	RCore *core = (RCore *) rcmd->data;
	RConfig *cfg = core->config;
	r_config_lock (cfg, false);
	SETPREF("r2dec.casts", "false", "if true, hides all casts in the pseudo code.");
	SETPREF("r2dec.asm", "false", "if true, shows pseudo next to the assembly.");
	SETPREF("r2dec.theme", "default", "defines the color theme to be used on r2dec.");
	r_config_lock (cfg, true);

	// autocomplete here..
	RCoreAutocomplete *pdd = r_core_autocomplete_add (core->autocomplete, "pdd", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pdda", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddi", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (core->autocomplete, "pddu", R_CORE_AUTOCMPLT_DFLT, true);
	r_core_autocomplete_add (pdd, "--assembly", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--casts", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--colors", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--debug", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--html", R_CORE_AUTOCMPLT_OPTN, true);
	r_core_autocomplete_add (pdd, "--issue", R_CORE_AUTOCMPLT_OPTN, true);
}

RCorePlugin r_core_plugin_test = {
	.name = "r2dec",
	.desc = "experimental pseudo-C decompiler for radare2",
	.license = "Apache",
	.call = r_cmd_pdd,
	.init = r_cmd_pdd_init
};

#ifndef CORELIB
RLibStruct radare_plugin = {
	.type = R_LIB_TYPE_CORE,
	.data = &r_core_plugin_test,
	.version = R2_VERSION
};
#endif
