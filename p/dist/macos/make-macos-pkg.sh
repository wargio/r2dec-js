#!/bin/sh

# based on
# http://blog.coolaj86.com/articles/how-to-unpackage-and-repackage-pkg-macos.html

# to uninstall:
# sudo pkgutil --forget org.radare.r2dec

DESTDIR=/tmp/r2dec-macos
PREFIX=$(r2 -H R2_PREFIX)
[ -z "${PREFIX}" ] && PREFIX=/usr/local
WRKDIR="$(pwd)/src/tmp"
VERSION="`r2 -qv`"
[ -z "${VERSION}" ] && VERSION=5.1.0
[ -z "${MAKE}" ] && MAKE=make

while : ; do
	[ -f "README.md" ] && break
	[ "$PWD" = / ] && break
	cd ..
done

[ ! -f "$PWD/README.md" ] && exit 1

cd p

rm -rf "${DESTDIR}"
export PLUGDIR=$(r2 -H R2_LIBR_PLUGINS)
CFLAGS=-DR2DEC_HOME="\\\"${PLUGDIR}\\\"" make -j
mkdir -p "${DESTDIR}/$PLUGDIR"
rm -rf "${WRKDIR}"
mkdir -p "${WRKDIR}"
make install DESTDIR="${DESTDIR}" PLUGDIR=${PLUGDIR}
make install-libdec DESTDIR="${DESTDIR}" PLUGDIR=${PLUGDIR}
if [ -d "${DESTDIR}" ]; then
	find $DESTDIR
	(
		cd ${DESTDIR} && \
		find . | cpio -o --format odc | gzip -c > "${WRKDIR}/Payload"
	)
	mkbom ${DESTDIR} "${WRKDIR}/Bom"
	# Repackage
	pkgutil --flatten "${WRKDIR}/.." "${WRKDIR}/../../r2dec-${VERSION}.pkg"
else
	echo "Failed install. DESTDIR is empty"
	exit 1
fi
