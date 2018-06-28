CFLAGS+=-g -O3
CFLAGS_TEST=-g -O3 -I./duktape
CFLAGS+=$(shell pkg-config --cflags r_util r_io r_cons r_core) -I./duktape
LDFLAGS_TEST=-lm -std=c99
LDFLAGS+=$(shell pkg-config --libs r_util r_io r_cons r_core) -lm -std=c99
LIBEXT=$(shell r2 -H LIBEXT)
PLUGDIR=$(shell r2 -H USER_PLUGINS)

all:
	$(CC) $(CFLAGS) $(LDFLAGS) -shared -fPIC duktape/duktape.c duktape/duk_console.c core_pdd.c -o core_pdd.$(LIBEXT)
	$(MAKE) install

install:
	mkdir -p $(PLUGDIR)
	rm -rf $(PLUGDIR)/core_pdd.$(LIBEXT)*
	cp -rf core_pdd.$(LIBEXT)* $(PLUGDIR)

uninstall:
	rm -rf $(PLUGDIR)/core_pdd.$(LIBEXT)*

clean:
	rm -rf core_pdd.$(LIBEXT)* r2dec-test

testbin r2dec-test:
	$(CC) $(CFLAGS_TEST) -DUSE_RCONS=0 -o r2dec-test -fPIC duktape/duktape.c duktape/duk_console.c r2dec-test.c $(LDFLAGS_TEST)
