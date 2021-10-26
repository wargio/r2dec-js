include ./CONFIG

DEPENDS=
CROSSARCH=x64
PWD=$(shell pwd)
PACKAGE_DIR?=$(PWD)
R2_PLUGIN_DIR=$(shell radare2 -H R2_LIBR_PLUGINS)
R2_LIBEXT=$(shell r2 -HR2_LIBEXT)


all: root
	sudo rm -rf control data
	$(MAKE) clean
	mkdir -p data
	cp -rf root/* data
	$(MAKE) control
	$(MAKE) deb

root:
	$(MAKE) -C ../.. USE_JSC=1
	$(MAKE) -C ../.. install USE_JSC=1 DESTDIR=$(PWD)/root

purge: clean
	rm -rf root

summary:
	@echo $(VERSION)

include deb.mk
