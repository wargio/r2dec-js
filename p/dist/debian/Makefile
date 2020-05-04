include ./CONFIG

DEPENDS=
CROSSARCH=x64
PWD=$(shell pwd)
PACKAGE_DIR?=${PWD}

DOCKCROSS=$(PWD)/../dockcross
R2PLUGDIR=/usr/lib/radare2/$(VERSION)

all: root
	sudo rm -rf control data
	${MAKE} clean
	mkdir -p data
	cp -rf root/* data
	${MAKE} control
	${MAKE} deb

# only run this in native Ubuntu/Debian based system
myroot:
	export CFLAGS=-DR2DEC_HOME="\\\"$(shell r2 -H R2_LIBR_PLUGINS)/r2dec-js\\\"" ; \
	make -C ../.. clean core_pdd.so V=
	mkdir -p root/$(R2PLUGDIR)
	cp -f ../../core_pdd.so root/$(R2PLUGDIR)
	git clone ../../.. .r
	rm -rf .r/p .r/.git*
	mv .r root/$(R2PLUGDIR)/r2dec-js

root:
	cd ../.. && $(MAKE) clean ; \
	$(DOCKCROSS) --image dockcross/linux-$(CROSSARCH) bash -c ' \
wget -c https://github.com/radareorg/radare2/releases/download/$(VERSION)/radare2_$(VERSION)_amd64.deb ; \
wget -c https://github.com/radareorg/radare2/releases/download/$(VERSION)/radare2-dev_$(VERSION)_amd64.deb ; \
sudo dpkg -i *.deb ; \
sudo apt-get update ; \
sudo apt-get upgrade --assume-yes; \
sudo apt-get --assume-yes install libuv1-dev libssl-dev libc6 ; \
r2 -H; \
export CFLAGS=-DR2DEC_HOME=\"\\\"$(R2PLUGDIR)/r2dec-js\\\"\" ;\
 make'
	mkdir -p root/$(R2PLUGDIR)
	cp -f ../../core_pdd.so root/$(R2PLUGDIR)
	git clone ../../.. .r
	rm -rf .r/p .r/.git*
	mv .r root/$(R2PLUGDIR)/r2dec-js

purge: clean
	rm -rf root

summary:
	echo $(VERSION)

include deb.mk
