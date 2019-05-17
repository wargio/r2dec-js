#include <string.h>
#include <duktape.h>
#include <duk_console.h>
#include <duk_missing.h>
#include <stdio.h>

static const char* r2dec_home = 0;

char* read_slurp(const char* filename) {
	FILE * fp;
	long size;
	char* buffer = NULL;

	fp = fopen (filename, "rb");
	if (fp) {
		fseek (fp, 0, SEEK_END);   // non-portable
		size = ftell (fp);
		rewind (fp);
		if (size > 0) {
			if ((buffer = malloc(size + 1))) {
				int read_bytes = fread (buffer, 1, size, fp);
				if (read_bytes != size) {
					fprintf (stderr, "failed to read (%d/%ld bytes) from %s\n", read_bytes, size, filename);
					free (buffer);
					buffer = NULL;
				} else {
					// + 1 as on malloc
					buffer[size] = 0;
				}
			} else {
				fprintf (stderr, "ENOMEM (%ld bytes)\n", size);
			}
		} else {
			fprintf (stderr, "negative size (%ld) of %s\n", size, filename);
		}
		fclose (fp);
	} else {
		fprintf (stderr, "error opening file %s\n", filename);
	}
	return buffer;
}

static char* r2dec_read_file(const char* file) {
	if (!file) {
		return 0;
	}
	char filepath[1024];
	snprintf (filepath, sizeof (filepath), "%s/%s", r2dec_home, file);
	return read_slurp (filepath);
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

static duk_ret_t duk_internal_read_file(duk_context *ctx) {
	const char *fullname;
	if (duk_is_string (ctx, 0)) {
		fullname = duk_safe_to_string (ctx, 0);
		char* text = read_slurp (fullname);
		if (text) {
			duk_push_string (ctx, text);
			free (text);
		} else {
			printf ("error: '%s' not found.\n", fullname);
			return DUK_RET_TYPE_ERROR;
		}
		return 1;
	}
	return DUK_RET_TYPE_ERROR;
}

static void duk_r2_init(duk_context* ctx) {
	duk_push_c_function (ctx, duk_internal_require, 1);
	duk_put_global_string (ctx, "___internal_require");
	duk_push_c_function (ctx, duk_internal_read_file, 1);
	duk_put_global_string (ctx, "read_file");
}

static int eval_file(duk_context* ctx, const char* file) {
	char* text = r2dec_read_file (file);
	if (text) {
		duk_push_lstring (ctx, file, strlen (file));
		duk_eval_file_noresult (ctx, text);
		free (text);
		return 1;
	}
	return 0;
}

static void r2dec_fatal_function (void *udata, const char *msg) {
    fprintf (stderr, "*** FATAL ERROR: %s\n", (msg ? msg : "no message"));
    fflush (stderr);
    exit (1);
}

static void duk_r2dec(const char *input) {
	char args[1024] = {0};
	duk_context *ctx = duk_create_heap (0, 0, 0, 0, r2dec_fatal_function);
	duk_console_init (ctx, 0);
//	Long_init (ctx);
	duk_r2_init (ctx);
	if (eval_file (ctx, "require.js") && eval_file (ctx, "r2dec-test.js")) {		
		if (*input) {
			snprintf (args, sizeof(args), "r2dec_main(\"%s\")", input);
		} else {
			snprintf (args, sizeof(args), "r2dec_main()");
		}
		duk_eval_string_noresult (ctx, args);
	}
	duk_destroy_heap (ctx);
}


int main(int argc, char const *argv[]) {
	if (argc != 3) {
		printf ("usage: %s <home/r2dec-js> <issue.json>\n", argv[0]);
		return 1;
	}
	r2dec_home = argv[1];
	// fprintf (stderr, "HOME: %s\n", r2dec_home);
	// fprintf (stderr, "JSON: %s\n", argv[2]);
	duk_r2dec (argv[2]);
	return 0;
}

