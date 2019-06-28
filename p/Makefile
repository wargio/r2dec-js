CFLAGS+=-g -O3 -std=c99 -Wall -fPIC -I./duktape
CFLAGS_PKG=$(shell pkg-config --cflags r_util r_io r_cons r_core)

LDFLAGS+=-lm
LDFLAGS_PKG=$(shell pkg-config --libs r_util r_io r_cons r_core)

LIBEXT=$(shell r2 -H LIBEXT)
PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)

V=@
ECHO=echo
RM=rm -f
CP=cp -f
MKDIR=mkdir -p

SRCS=duktape/duktape.c duktape/duk_console.c core_pdd.c
OBJS=$(SRCS:.c=.o)
BIN=core_pdd.$(LIBEXT)

all: clean build install

build: $(BIN)

$(BIN): $(OBJS)
	$(V)$(ECHO) "[CC] $@"
	$(V)$(CC) $(LDFLAGS) $(LDFLAGS_PKG) -shared $^ -o $@

%.o: %.c
	$(V)$(ECHO) "[CC] $@"
	$(V)$(CC) $(CFLAGS) $(CFLAGS_PKG) -c $< -o $@

$(PLUGDIR):
	$(V)$(MKDIR) $@

install: uninstall $(PLUGDIR) $(BIN)
	$(V)$(RM) $(PLUGDIR)/$(BIN)
	$(V)$(CP) $(BIN) $(PLUGDIR)

uninstall:
	$(V)$(RM) $(PLUGDIR)/$(BIN)

clean:
	$(V)$(RM) $(BIN) $(OBJS) || sleep 0

testbin:
	$(V)$(CC) $(CFLAGS) -DUSE_RCONS=0 -o r2dec-test duktape/duktape.c duktape/duk_console.c r2dec-test.c $(LDFLAGS)
