CFLAGS+=-g -O3 -std=c99 -Wall -fPIC -I./duktape
CFLAGS_PKG=$(shell pkg-config --cflags r_util r_io r_cons r_core)

LDFLAGS+=-lm
LDFLAGS_PKG=$(shell pkg-config --libs r_util r_io r_cons r_core)

LIBEXT=$(shell r2 -H LIBEXT)
PLUGDIR=$(shell r2 -H R2_USER_PLUGINS)

VERBOSE=@
ECHO=echo
RM=rm -f
CP=cp -f
MKDIR=mkdir -p

# a workaround for osx users
LD=$(CC)

SRCS=duktape/duktape.c duktape/duk_console.c core_pdd.c
OBJS=$(SRCS:.c=.o)
BIN=core_pdd.$(LIBEXT)

all: build install

build: $(BIN)

$(BIN): $(OBJS)
	$(VERBOSE)$(ECHO) "LD $@"
	$(VERBOSE)$(LD) $(LDFLAGS) $(LDFLAGS_PKG) -shared $^ -o $@

%.o: %.c
	$(VERBOSE)$(ECHO) "CC $@"
	$(VERBOSE)$(CC) $(CFLAGS) $(CFLAGS_PKG) -c $< -o $@

$(PLUGDIR):
	$(VERBOSE)$(MKDIR) $@

install: $(PLUGDIR) $(BIN)
	$(VERBOSE)$(RM) $(PLUGDIR)/$(BIN)
	$(VERBOSE)$(CP) $(BIN) $(PLUGDIR)

uninstall:
	$(VERBOSE)$(RM) $(PLUGDIR)/$(BIN)

clean:
	$(VERBOSE)$(RM) $(BIN) $(OBJS)

testbin r2dec-test:
	$(VERBOSE)$(CC) $(CFLAGS) -DUSE_RCONS=0 -c duktape/duktape.c duktape/duk_console.c r2dec-test.c -o r2dec-test $(LDFLAGS)
