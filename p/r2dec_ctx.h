
#ifndef R2DEC_CTX_H
#define R2DEC_CTX_H

#include <duktape.h>
#include <r_core.h>

typedef struct r2dec_ctx_t {
	RCore *core;
	void *bed;
} R2DecCtx;

R2DecCtx *r2dec_ctx_get(duk_context *ctx);

#endif //R2DEC_CTX_H
