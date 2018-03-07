CFLAGS+=-g
CFLAGS+=$(shell pkg-config --cflags r_util r_io r_cons r_core)
LDFLAGS+=$(shell pkg-config --libs r_util r_io r_cons r_core)
LIBEXT=$(shell r2 -H LIBEXT)
PLUGDIR=$(shell r2 -H USER_PLUGINS)

all:
	$(CC) $(CFLAGS) $(LDFLAGS) -shared -fPIC core_pdd.c -o core_pdd.$(LIBEXT)
	$(MAKE) install

install:
	mkdir -p $(PLUGDIR)
	rm -rf $(PLUGDIR)/core_pdd.$(LIBEXT)*
	cp -rf core_pdd.$(LIBEXT)* $(PLUGDIR)

uninstall:
	rm -rf $(PLUGDIR)/core_pdd.$(LIBEXT)

clean:
	rm -rf core_pdd.$(LIBEXT)
