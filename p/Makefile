CFLAGS+=-g -O3 -std=c99 -Wall -fPIC -I./duktape
LDFLAGS+=-lm

HAVE_PKGCONFIG=$(shell pkg-config --help 2> /dev/null)

ifeq ($(HAVE_PKGCONFIG),)
CFLAGS_PKG+=-I$(shell r2 -H R2_INCDIR) -I$(shell r2 -H R2_INCDIR)/sdb
LDFLAGS_PKG+=-L$(shell r2 -H R2_LIBDIR) -lr_util -lr_io -lr_cons -lr_core
else
CFLAGS_PKG=$(shell pkg-config --cflags r_util r_io r_cons r_core 2> /dev/null)
LDFLAGS_PKG=$(shell pkg-config --libs r_util r_io r_cons r_core 2> /dev/null)
endif

LIBEXT=$(shell r2 -H LIBEXT)
PLUGDIR=$(shell r2 -H R2_LIBR_PLUGINS)

R2DEC_HOME=$(PLUGDIR)/r2decjs

V=@
ECHO=echo
RM=rm -f
CP=cp -f
LN=ln -fs
MKDIR=mkdir -p

SRCS=duktape/duktape.c duktape/duk_console.c core_pdd.c
OBJS=$(SRCS:.c=.o)
BIN=core_pdd.$(LIBEXT)
DESTDIR?=

all: clean build

build: $(BIN)

$(BIN): $(OBJS)
	$(V)$(ECHO) "[CC] $@"
	$(V)$(CC) $(LDFLAGS) $(LDFLAGS_PKG) -shared $^ -o $@

%.o: %.c
	$(V)$(ECHO) "[CC] $@"
	$(V)$(CC) $(CFLAGS) $(CFLAGS_PKG) -c $< -o $@

$(DESTDIR)$(R2DEC_HOME) $(DESTDIR)$(R2DEC_HOME)/libdec $(DESTDIR)$(PLUGDIR):
	$(V)$(MKDIR) $@

install-plugin: $(DESTDIR)$(R2DEC_HOME)/libdec $(DESTDIR)$(PLUGDIR) $(BIN)
	$(V)$(CP) $(BIN) $(DESTDIR)$(PLUGDIR)

symstall symlink: $(DESTDIR)$(PLUGDIR) $(DESTDIR)/$(R2DEC_HOME)/libdec
	$(V)$(LN) $(shell pwd)/$(BIN) $(DESTDIR)$(PLUGDIR)
	$(V)$(RM) $(DESTDIR)$(R2DEC_HOME)
	$(V)$(LN) $(shell pwd) $(DESTDIR)$(R2DEC_HOME)

install:
	$(V)$(MAKE) install-plugin
	$(V)$(MAKE) install-libdec

user-install:
	$(V)$(MAKE) install-plugin PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)
	$(V)$(MAKE) install-libdec PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)

install-libdec: $(DESTDIR)$(R2DEC_HOME)
	$(V)$(CP) -r ../r2dec-duk.js ../require.js ../libdec "$(DESTDIR)$(R2DEC_HOME)"

user-install-libdec:
	$(V)$(MAKE) install-libdec PLUGDIR=$(shell r2 -H R2_USER_PLUGINS) R2DEC_HOME=$(shell r2 -H R2_USER_PLUGINS)/r2decjs

uninstall:
	$(V)$(RM) $(DESTDIR)$(PLUGDIR)/$(BIN)
	$(V)$(RM) -r $(DESTDIR)$(PLUGDIR)/r2decjs

user-uninstall:
	$(V)$(MAKE) uninstall PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)

clean:
	-$(V)$(RM) $(BIN) $(OBJS)

testbin:
	$(V)$(CC) $(CFLAGS) -DUSE_RCONS=0 -o r2dec-test duktape/duktape.c duktape/duk_console.c r2dec-test.c $(LDFLAGS)
