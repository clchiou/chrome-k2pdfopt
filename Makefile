# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

OUT ?= out

GETVAR := bash getvar.sh

NACL_ARCH := $(shell $(GETVAR) NACL_ARCH)

CC := $(shell $(GETVAR) NACLCC)
CFLAGS := $(shell $(GETVAR) CFLAGS) \
	-I$(NACL_SDK_ROOT)/include -I=/usr/include -Wall \
	-Ik2pdfopt

CXX := $(shell $(GETVAR) NACLCXX)
CXXFLAGS := $(shell $(GETVAR) CXXFLAGS) \
	-I$(NACL_SDK_ROOT)/include -I=/usr/include -Wall \
	-Ik2pdfopt

LDFLAGS	:= $(shell $(GETVAR) LDFLAGS)
LIBS	:= -lk2pdfopt -ltesseract -llept \
	-lfitz -lopenjpeg -ljbig2dec -lfreetype \
	-ljpeg -lpng -lz \
	-lglibc-compat -lnacl-mounts -lpthread \
	-lm -lstdc++ -lcrt_common -lppapi_cpp -lppapi -lnosys

K2PDFOPT_EXE = $(OUT)/k2pdfopt_$(NACL_ARCH).nexe

EXTENSION_DIR = $(OUT)/extension

EXTENSION_GEN_FILES = $(EXTENSION_DIR)/manifest.json

EXTENSION_FILES = $(addprefix $(EXTENSION_DIR)/,\
	content_script.js event_page.js \
	popup.css popup.html popup.js \
	convert.css convert.html convert.js \
	file-fetcher.js file-toucher.js http-getter.js \
	nacl-module.js \
	dir-lister.js \
	util.js \
	status.js \
	k2pdfopt.nmf \
	jquery.js jquery.min.map jquery-ui.js jquery-ui.css images)

EXTENSION_NEXES = $(addprefix $(EXTENSION_DIR)/,\
	k2pdfopt_x86_64.nexe k2pdfopt_i686.nexe)

EXTENSION_MANIFEST = $(EXTENSION_GEN_FILES) $(EXTENSION_FILES) \
	$(EXTENSION_NEXES)

all:
	NACL_ARCH=x86_64 $(MAKE) arch
	$(MAKE) clean-repo
	NACL_ARCH=i686   $(MAKE) arch
	$(MAKE) pack

arch: $(K2PDFOPT_EXE) | k2pdfopt

pack: $(EXTENSION_MANIFEST) | $(EXTENSION_DIR) $(EXTENSION_DIR)/icons
	cp icons/*.png $(EXTENSION_DIR)/icons
	(cd $(OUT) ; zip -r chrome-k2pdfopt.zip extension)

clean-repo:
	rm -rf $(shell $(GETVAR) REPOSITORY)
	rm -rf $(shell $(GETVAR) NACL_PACKAGES_STAMPDIR)

clean:
	rm -rf $(OUT)

.PHONY: all arch pack clean-repo clean

$(EXTENSION_GEN_FILES): $(EXTENSION_DIR)/%: src/%.in | $(EXTENSION_DIR)
	./substitute -d VERSION `cat VERSION` -o $@ -t $<

$(EXTENSION_FILES): $(EXTENSION_DIR)/%: src/% | $(EXTENSION_DIR)
	if [ -h $< ]; then cp -f $< $@; else cp -rf $< $@; fi

$(EXTENSION_NEXES): $(EXTENSION_DIR)/%: $(OUT)/% | $(OUT) $(EXTENSION_DIR)
	cp -f $< $@

include packages.mk

OBJ_DIR  = $(OUT)/$(NACL_ARCH)
CXX_OBJS = $(patsubst src/%.cpp,$(OBJ_DIR)/%.o,$(wildcard src/*.cpp))
C_OBJS   = $(patsubst src/%.c,$(OBJ_DIR)/%.o,$(wildcard src/*.c))
OBJS     = $(C_OBJS) $(CXX_OBJS)

$(K2PDFOPT_EXE): $(OBJS) | boost k2pdfopt $(OUT)
	$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LIBS)

$(CXX_OBJS): $(OBJ_DIR)/%.o: src/%.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $<

$(C_OBJS): $(OBJ_DIR)/%.o: src/%.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c -o $@ $<

$(OUT) $(OBJ_DIR) $(EXTENSION_DIR) $(EXTENSION_DIR)/icons:
	mkdir -p $@
