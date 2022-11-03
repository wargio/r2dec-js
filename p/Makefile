PYTHON?=python
CFLAGS+=-g -O3 -std=c99 -Wall -fPIC -I./duktape
LDFLAGS+=-lm

HAVE_PKGCONFIG=$(shell pkg-config --help 2> /dev/null)

USE_JSC?=0

ifeq ($(HAVE_PKGCONFIG),)
CFLAGS_PKG+=-I$(shell r2 -H R2_INCDIR) -I$(shell r2 -H R2_INCDIR)/sdb
LDFLAGS_PKG+=-L$(shell r2 -H R2_LIBDIR) -lr_util -lr_io -lr_cons -lr_core
else
CFLAGS_PKG=$(shell pkg-config --cflags r_util r_io r_cons r_core 2> /dev/null)
LDFLAGS_PKG=$(shell pkg-config --libs r_util r_io r_cons r_core 2> /dev/null)
endif

LIBEXT=$(shell r2 -H R2_LIBEXT)
PLUGDIR=$(shell r2 -H R2_LIBR_PLUGINS)

R2DEC_HOME=$(PLUGDIR)/r2dec-js

V=@
ECHO=echo
RM=rm -f
CP=cp -f
LN=ln -fs
MKDIR=mkdir -p

SRCS=duktape/duktape.c duktape/duk_console.c core_pdd.c
ifeq ($(USE_JSC),1)
CFLAGS+=-DUSE_JSC=1
PRE=r2dec_jsc.c
endif
OBJS=$(SRCS:.c=.o)
BIN=core_pdd.$(LIBEXT)
DESTDIR?=

all: $(PRE)
	$(MAKE) build

build: $(BIN)

$(BIN): $(OBJS)
	$(V)$(ECHO) "[CC] $@"
	$(V)$(CC) $(LDFLAGS) $(LDFLAGS_PKG) -shared $^ -o $@

asan:
	$(MAKE) $(BIN) CFLAGS=-fsanitize=address

ifeq ($(USE_JSC),1)
r2dec_jsc.c: r2dec_jsc.c.in
	awk '{if(/@JSC_SOURCES@/)exit;print}' < r2dec_jsc.c.in > r2dec_jsc.c
	$(PYTHON) make_jsc.py .. >> r2dec_jsc.c
	awk 'BEGIN{A=0}{if(A==1){print}if(/@JSC_SOURCES@/)A=1}' < r2dec_jsc.c.in >> r2dec_jsc.c
endif

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
ifeq ($(USE_JSC),0)
	$(V)$(MAKE) install-libdec
endif

user-install:
	$(V)$(MAKE) install-plugin PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)
ifeq ($(USE_JSC),0)
	$(V)$(MAKE) install-libdec PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)
endif

ifeq ($(USE_JSC),1)
install-libdec: $(DESTDIR)$(R2DEC_HOME)
	$(V)$(CP) -r ../r2dec-duk.js ../require.js ../libdec "$(DESTDIR)$(R2DEC_HOME)"

user-install-libdec:
	$(V)$(MAKE) install-libdec PLUGDIR=$(shell r2 -H R2_USER_PLUGINS) R2DEC_HOME=$(shell r2 -H R2_USER_PLUGINS)/r2dec-js
else
install-libdec:
	$(V)$(CP) -r ../r2dec-duk.js ../require.js ../libdec "$(DESTDIR)$(R2DEC_HOME)"

user-install-libdec:
	$(V)$(CP) -r ../r2dec-duk.js ../require.js ../libdec "$(shell r2 -H R2_USER_PLUGINS)"/r2dec-js
endif

uninstall:
	$(V)$(RM) $(DESTDIR)$(PLUGDIR)/$(BIN)
	$(V)$(RM) -r $(DESTDIR)$(PLUGDIR)/r2dec-js

user-uninstall:
	$(V)$(MAKE) uninstall PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)

clean:
	-$(V)$(RM) $(BIN) $(OBJS) r2dec_jsc.c

testbin:
	$(V)$(CC) $(CFLAGS) -DUSE_RCONS=0 -o r2dec-test duktape/duktape.c duktape/duk_console.c r2dec-test.c $(LDFLAGS)

PHONY: install-libdec user-install user-uninstall user-install-libdec
PHONY: install uninstall asan all build clean testbin
