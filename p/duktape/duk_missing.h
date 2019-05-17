#ifndef DUKTAPE_MISSING_FUNCTIONS
#define DUKTAPE_MISSING_FUNCTIONS

#define duk_eval_file(ctx,src)  \
	((void) duk_eval_raw((ctx), (src), 0, 1 /*args*/ | DUK_COMPILE_EVAL | DUK_COMPILE_NOSOURCE | DUK_COMPILE_STRLEN))

#define duk_eval_file_noresult(ctx,src)  \
	((void) duk_eval_raw((ctx), (src), 0, 1 /*args*/ | DUK_COMPILE_EVAL | DUK_COMPILE_NOSOURCE | DUK_COMPILE_STRLEN | DUK_COMPILE_NORESULT))


#endif