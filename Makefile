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
MANIFEST := convert.html convert.js event_page.js jquery.js \
	k2pdfopt.nmf manifest.json

all:
	NACL_PACKAGES_BITSIZE=32 $(MAKE) arch
	NACL_PACKAGES_BITSIZE=64 $(MAKE) arch
	$(MAKE) pack

arch: $(K2PDFOPT_EXE) | k2pdfopt

pack: | $(EXTENSION_DIR)
	cp -f $(addprefix src/,$(MANIFEST)) $(EXTENSION_DIR)
	cp -f $(OUT)/k2pdfopt_x86_64.nexe $(EXTENSION_DIR)
	cp -f $(OUT)/k2pdfopt_i686.nexe $(EXTENSION_DIR)

clean:
	rm -rf $(OUT)

.PHONY: all arch pack clean

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

$(OUT) $(OBJ_DIR) $(EXTENSION_DIR):
	mkdir -p $@
