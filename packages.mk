# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

GETVAR := bash getvar.sh

NACL_ARCH := $(shell $(GETVAR) NACL_ARCH)
SENTINELS := $(shell $(GETVAR) SENTINELS)

# XXX: MAKEFLAGS are cleared before calling nacl-${PKG}.sh because, strangely
# enough, certain flags, -B for example, could break the build.
BANNER    = echo "*** Building $(NACL_ARCH) $(notdir $*) ***"
BUILD_PKG = export MAKEFLAGS=""; \
	    PKG=$*; PKG=$${PKG%-*}; cd $${PKG} && ./nacl-$${PKG}.sh
BUILD_LIB = export MAKEFLAGS=""; \
	    cd $(NACLPORTS_ROOT)/src/libraries/$* && ./nacl-$(notdir $*).sh
TOUCH_SENTINELS = mkdir -p $$(dirname $@) && touch $@

# TODO(clchiou): Port openjpeg
$(SENTINELS)/chrome-k2pdfopt/openjpeg-2.0.0:
	@$(TOUCH_SENTINELS)

$(SENTINELS)/chrome-k2pdfopt/%:
	@$(BANNER)
	@$(BUILD_PKG)
	@$(TOUCH_SENTINELS)

$(SENTINELS)/libraries/%:
	@$(BANNER)
	@$(BUILD_LIB)
	@$(TOUCH_SENTINELS)

# Dependencies

$(SENTINELS)/chrome-k2pdfopt/libpng-1.6.1: \
	$(SENTINELS)/chrome-k2pdfopt/zlib-1.2.7.1
$(SENTINELS)/chrome-k2pdfopt/mupdf-1.1: \
	$(SENTINELS)/chrome-k2pdfopt/zlib-1.2.7.1 \
	$(SENTINELS)/chrome-k2pdfopt/jpeg-9 \
	$(SENTINELS)/chrome-k2pdfopt/freetype2-2.4.11 \
	$(SENTINELS)/chrome-k2pdfopt/jbig2dec-0.11 \
	$(SENTINELS)/chrome-k2pdfopt/openjpeg-2.0.0 \
	$(SENTINELS)/libraries/glibc-compat
$(SENTINELS)/chrome-k2pdfopt/leptonica-1.69: \
	$(SENTINELS)/chrome-k2pdfopt/libpng-1.6.1 \
	$(SENTINELS)/chrome-k2pdfopt/jpeg-9 \
	$(SENTINELS)/libraries/glibc-compat \
	$(SENTINELS)/libraries/nacl-mounts
$(SENTINELS)/chrome-k2pdfopt/tesseract-ocr-3.02.02: \
	$(SENTINELS)/chrome-k2pdfopt/leptonica-1.69
$(SENTINELS)/chrome-k2pdfopt/k2pdfopt-1.64a: \
	$(SENTINELS)/chrome-k2pdfopt/zlib-1.2.7.1 \
	$(SENTINELS)/chrome-k2pdfopt/libpng-1.6.1 \
	$(SENTINELS)/chrome-k2pdfopt/jpeg-9 \
	$(SENTINELS)/chrome-k2pdfopt/mupdf-1.1 \
	$(SENTINELS)/chrome-k2pdfopt/leptonica-1.69 \
	$(SENTINELS)/chrome-k2pdfopt/tesseract-ocr-3.02.02 \
	$(SENTINELS)/libraries/glibc-compat

# Shortcuts

freetype2:	$(SENTINELS)/chrome-k2pdfopt/freetype2-2.4.11
jbig2dec:	$(SENTINELS)/chrome-k2pdfopt/jbig2dec-0.11
jpeg:		$(SENTINELS)/chrome-k2pdfopt/jpeg-9
k2pdfopt:	$(SENTINELS)/chrome-k2pdfopt/k2pdfopt-1.64a
leptonica:	$(SENTINELS)/chrome-k2pdfopt/leptonica-1.69
libpng:		$(SENTINELS)/chrome-k2pdfopt/libpng-1.6.1
mupdf:		$(SENTINELS)/chrome-k2pdfopt/mupdf-1.1
openjpeg:	$(SENTINELS)/chrome-k2pdfopt/openjpeg-2.0.0
tesseract-ocr:	$(SENTINELS)/chrome-k2pdfopt/tesseract-ocr-3.02.02
zlib:		$(SENTINELS)/chrome-k2pdfopt/zlib-1.2.7.1
boost:		$(SENTINELS)/libraries/boost
glibc-compat:	$(SENTINELS)/libraries/glibc-compat
nacl-mounts:	$(SENTINELS)/libraries/nacl-mounts

.PHONY: freetype2 jbig2dec jpeg k2pdfopt leptonica libpng mupdf openjpeg \
	tesseract-ocr zlib glibc nacl-mounts
