/* radare - LGPL - Copyright 2018 - pancake, deroad */
#if 0
gcc -o core_test.so -fPIC `pkg-config --cflags --libs r_core` core_test.c -shared
mkdir -p ~/.config/radare2/plugins
mv core_test.so ~/.config/radare2/plugins
#endif

#include <stdlib.h>
#include <string.h>

#include "r_types.h"
#include "r_lib.h"
#include "r_cmd.h"
#include "r_core.h"
#include "r_cons.h"
#include "r_anal.h"

#include "duktape/duktape.h"
#include "duktape/duk_console.h"

#undef R_API
#define R_API static

#undef R_IPI
#define R_IPI static

#define SETDESC(x,y)	r_config_node_desc(x, y)
#define SETPREFS(x,y,z)	SETDESC(r_config_set(cfg, x, y), z)
#define SETPREFI(x,y,z)	SETDESC(r_config_set_i(cfg, x, y), z)

/* for compatibility. */
#ifndef R2_HOME_DATADIR
#	define R2_HOME_DATADIR R2_HOMEDIR
#endif

static RCore* core_link = 0;

static char* r2dec_read_file(const char* file)
{
	if (file == NULL)
	{
		return (char*) NULL;
	}

	char* env = r_sys_getenv("R2DEC_HOME");
	char* r2dec_home = env ? env : r_str_home(R2_HOME_DATADIR R_SYS_DIR "r2pm" R_SYS_DIR "git" R_SYS_DIR "r2dec-js");
	
	if (r2dec_home == (char*) NULL)
	{
		return (char*) NULL;
	}

	int len = 0;
	char* filepath = r_str_newf("%s"R_SYS_DIR"%s", r2dec_home, file);
	char* text = r_file_slurp (filepath, &len);

	free(r2dec_home);
	free(filepath);

	return (text != NULL) && (len > 0) ? text : (char*) NULL;
}

static duk_ret_t duk_r2cmd(duk_context* ctx)
{
	if (duk_is_string(ctx, 0))
	{
		char* output = r_core_cmd_str(core_link, duk_safe_to_string(ctx, 0));
		duk_push_string(ctx, output);
		free(output);

		return 1;
	}

	return DUK_RET_TYPE_ERROR;
}

static duk_ret_t duk_internal_load(duk_context* ctx)
{
	if (duk_is_string(ctx, 0))
	{
		const char* fullname = duk_safe_to_string(ctx, 0);
		char* text = r2dec_read_file(fullname);

		if (text)
		{
			duk_push_string(ctx, text);
			free(text);
			return 1;
		}
		else
		{
			printf("Error: '%s' not found.\n", fullname);
		}
	}

	return DUK_RET_TYPE_ERROR;
}

static duk_ret_t duk_internal_require(duk_context *ctx)
{
	char fullname[256];

	if (duk_is_string (ctx, 0))
	{
		snprintf(fullname, sizeof(fullname), "%s.js", duk_safe_to_string (ctx, 0));
		char* text = r2dec_read_file(fullname);

		if (text)
		{
			duk_push_string (ctx, text);
			free(text);

			return 1;
		}
		else
		{
			printf("Error: '%s' not found.\n", fullname);
		}
	}

	return DUK_RET_TYPE_ERROR;
}

static void duk_r2_init(duk_context* ctx)
{
	duk_push_c_function(ctx, duk_internal_require, 1);
	duk_put_global_string(ctx, "___internal_require");

	duk_push_c_function(ctx, duk_internal_load, 1);
	duk_put_global_string(ctx, "___internal_load");

	duk_push_c_function(ctx, duk_r2cmd, 1);
	duk_put_global_string(ctx, "r2cmd");
}

static void duk_eval_file(duk_context* ctx, const char* file)
{
	char* text = r2dec_read_file(file);

	if (text)
	{
		duk_eval_string_noresult(ctx, text);
		free(text);
	}
}

static void r2dec_fatal_function (void* udata, const char* msg)
{
    fprintf(stderr, "*** FATAL ERROR: %s\n", (msg ? msg : "no message"));
    fflush(stderr);
    abort();
}

static void duk_r2dec(RCore* core, const char* input)
{
	char args[1024] = {0};

	core_link = core;
	duk_context* ctx = duk_create_heap(NULL, NULL, NULL, NULL, r2dec_fatal_function);

	duk_console_init(ctx, 0);
	duk_r2_init(ctx);

	duk_eval_file(ctx, "js/require.js");
	duk_eval_file(ctx, "js/r2dec-duk.js");

	snprintf(args, sizeof(args),
		"if (typeof r2dec_main === 'function') {"
		"	r2dec_main(\"%s\".split(/\\s+/));"
		"} else {"
		"	console.log('Fatal error. Cannot use R2_HOME_DATADIR.');"
		"}", input);

	duk_eval_string_noresult(ctx, args);
	duk_destroy_heap(ctx);

	core_link = (RCore*) NULL;
}

static void usage(const RCore* const core)
{
	const char* help[] = {
		"Usage: pdd[abui]", "",	"# Decompile current function",
		"pdd",	"",	"decompile current function",
		"pdda",	"",	"decompile current function with side assembly",
		"pddb",	"",	"decompile current function but show only scopes",
		"pddi",	"",	"generate issue data",
		"pddu",	"",	"upgrade r2dec via r2pm",
		NULL
	};

	r_cons_cmd_help(help, core->print->flags & R_PRINT_FLAGS_COLOR);
}

static void _cmd_pdd(RCore* core, const char* input)
{
	switch (*input)
	{
	case '\0':
	case 'a':
	case 'b':
	case 'i':
		duk_r2dec(core, input);
		break;
	case 'u':
		r_core_cmd0(core, "!r2pm -ci r2dec");
		break;
	case '?':
	default:
		usage(core);
		break;
	}
}

static int r_cmd_pdd(void* user, const char* input)
{
	RCore* core = (RCore*) user;

	if (!strncmp(input, "pdd", 3))
	{
		_cmd_pdd(core, input + 3);
		return true;
	}

	return false;
}

int r_cmd_pdd_init(void* user, const char* cmd)
{
	RCmd* rcmd = (RCmd*) user;
	RCore* core = (RCore *) rcmd->data;
	RConfig* cfg = core->config;

	r_config_lock (cfg, false);
	// workaround: r2 looks for this config entry for indication whether r2dec exists
	SETPREFS("r2dec.asm", "true", "dummy var for workaround");

	// output settings
	SETPREFI("pdd.out.guides", 1, "scope guidelines [0: none, 1: solid, 2: dashed]");
	SETPREFS("pdd.out.newline", "true", "add a new line before an opening curly bracket");
	SETPREFI("pdd.out.tabsize", 4, "indent size");

	// optimization settings
	SETPREFS("pdd.opt.noalias", "false", "assume no pointer aliasing");
	r_config_lock (cfg, true);

	// autocomplete here..
	(void) r_core_autocomplete_add(core->autocomplete, "pdd",  R_CORE_AUTOCMPLT_DFLT, true);
	(void) r_core_autocomplete_add(core->autocomplete, "pdda", R_CORE_AUTOCMPLT_DFLT, true);
	(void) r_core_autocomplete_add(core->autocomplete, "pddb", R_CORE_AUTOCMPLT_DFLT, true);
	(void) r_core_autocomplete_add(core->autocomplete, "pddi", R_CORE_AUTOCMPLT_DFLT, true);
	(void) r_core_autocomplete_add(core->autocomplete, "pddu", R_CORE_AUTOCMPLT_DFLT, true);

	return true;
}

RCorePlugin r_core_plugin_test =
{
	.name = "r2dec",
	.desc = "experimental pseudo-C decompiler for radare2",
	.license = "Apache",
	.call = r_cmd_pdd,
	.init = r_cmd_pdd_init
};

#ifdef _MSC_VER
#	define _R_API __declspec(dllexport)
#else
#	define _R_API
#endif

#ifndef CORELIB
_R_API RLibStruct radare_plugin =
{
	.type = R_LIB_TYPE_CORE,
	.data = &r_core_plugin_test,
	.version = R2_VERSION
};
#endif
