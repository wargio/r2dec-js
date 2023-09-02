// SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

#ifndef R2DEC_H
#define R2DEC_H

#include <quickjs.h>

typedef struct r2dec_s r2dec_t;

void r2dec_free(r2dec_t *dec);
r2dec_t *r2dec_new();
JSContext *r2dec_context(const r2dec_t *dec);
int r2dec_run(const r2dec_t *dec);
void r2dec_handle_exception(JSContext *ctx);

#endif /* R2DEC_H */
