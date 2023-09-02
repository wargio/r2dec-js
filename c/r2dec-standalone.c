// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include "r2dec.h"
#define errorf(...) fprintf(stderr, __VA_ARGS__)

static JSValue shared;

int is_regular_file(const char *path) {
	if (!path || !*path) {
		return 0;
	}
	struct stat path_stat;
	stat(path, &path_stat);
	return S_ISREG(path_stat.st_mode);
}

static char *read_file(const char *filename) {
	FILE *fp = NULL;
	long size = 0;
	char *buffer = NULL;

	if (!is_regular_file(filename)) {
		errorf("Error: path '%s' is not a file\n", filename);
		return NULL;
	}

	fp = fopen(filename, "rb");
	if (!fp) {
		errorf("Error: failed opening file '%s'\n", filename);
		return NULL;
	}

	fseek(fp, 0, SEEK_END); // non-portable
	size = ftell(fp);
	rewind(fp);
	if (size < 1) {
		errorf("Error: negative size (%ld) of '%s'\n", size, filename);
		goto fail;
	}

	if (!(buffer = malloc(size + 1))) {
		errorf("Error: ENOMEM (%ld bytes) of '%s'\n", size, filename);
		goto fail;
	}

	int read_bytes = fread(buffer, 1, size, fp);
	if (read_bytes != size) {
		errorf("Error: failed to read (%d/%ld bytes) from '%s'\n", read_bytes, size, filename);
		goto fail;
	}

	// + 1 as on malloc
	buffer[size] = 0;
	fclose(fp);
	return buffer;

fail:
	fclose(fp);
	free(buffer);
	return NULL;
}

static JSValue js_console_log(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	for (int i = 0; i < argc; ++i) {
		if (i != 0) {
			fputc(' ', stdout);
		}
		const char *str = JS_ToCString(ctx, argv[i]);
		if (!str) {
			return JS_EXCEPTION;
		}
		fputs(str, stdout);
		JS_FreeCString(ctx, str);
	}
	fputc('\n', stdout);
	fflush(stdout);
	return JS_UNDEFINED;
}

static JSValue js_get_global(JSContext *ctx, JSValueConst jsThis, int argc, JSValueConst *argv) {
	return JS_GetPropertyStr(ctx, shared, "Shared");
}

static int init_testsuite(r2dec_t *dec, const char *file, const char *raw) {
	JSContext *ctx = r2dec_context(dec);

	shared = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, shared, "Shared", JS_NewObject(ctx));

	JSValue global = JS_GetGlobalObject(ctx);
	JS_SetPropertyStr(ctx, global, "Global", JS_NewCFunction(ctx, js_get_global, "Global", 1));
	JS_SetPropertyStr(ctx, global, "radare2", JS_NULL);

	JSValue console = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "console", console);
	JS_SetPropertyStr(ctx, console, "log", JS_NewCFunction(ctx, js_console_log, "log", 1));

	JSValue unit = JS_NewObject(ctx);
	JS_SetPropertyStr(ctx, global, "unit", unit);
	JS_SetPropertyStr(ctx, unit, "file", JS_NewString(ctx, file));
	JS_SetPropertyStr(ctx, unit, "raw", JS_NewString(ctx, raw));

	JS_FreeValue(ctx, global);
	return 1;
}

static void fini_testsuite(r2dec_t *dec) {
	JSContext *ctx = r2dec_context(dec);
	JS_FreeValue(ctx, shared);
	r2dec_free(dec);
}

int main(int argc, char const *argv[]) {
	if (argc != 2 || !strcmp(argv[1], "-h")) {
		errorf("usage: %s <issue.json>\n", argv[0]);
		return 1;
	}

	r2dec_t *dec = NULL;
	char *raw = read_file(argv[1]);
	if (!raw) {
		return 1;
	}

	if (!(dec = r2dec_new())) {
		free(raw);
		return 1;
	}

	init_testsuite(dec, argv[1], raw);
	free(raw);

	int ret = !r2dec_run(dec);

	fini_testsuite(dec);
	return ret;
}
