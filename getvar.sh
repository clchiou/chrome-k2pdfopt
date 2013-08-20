# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

set -o nounset
set -o errexit

if [ -z "${1:-}" ]; then
  exit 1
fi

if [ "${NACL_GLIBC:-}" = "1" ]; then
  NACL_LIBC=glibc
else
  NACL_LIBC=newlib
fi

# Because ${NACLPORTS_ROOT}/src/build_tools/nacl_env.sh parses command-line
# arguments, we should empty arguments before (indirectly) calling nacl_env.sh
command="$1"
shift

# XXX ${NACLPORTS_ROOT}/src/build_tools/common.sh is buggy(?) that when
# PACKAGE_NAME is unset, it crashes instead of detecting this...
if [ -z "${PACKAGE_NAME:-}" ]; then
  export PACKAGE_NAME=dummy
fi

# XXX common.sh assumes ${NACLPORTS_INCLUDE} must exist, which is NOT true
# for a fresh nacl_sdk tree...
create_directory() {
  local OS_NAME=$(uname -s)
  if [ $OS_NAME = "Darwin" ]; then
    local OS_SUBDIR="mac"
  elif [ $OS_NAME = "Linux" ]; then
    local OS_SUBDIR="linux"
  else
    local OS_SUBDIR="win"
  fi

  if [ $NACL_ARCH = "arm" ]; then
    local TOOLCHAIN_ARCH="arm"
  else
    local TOOLCHAIN_ARCH="x86"
  fi

  local TOOLCHAIN_DIR=${OS_SUBDIR}_${TOOLCHAIN_ARCH}_${NACL_LIBC}
  local NACL_TOOLCHAIN_ROOT=${NACL_SDK_ROOT}/toolchain/${TOOLCHAIN_DIR}

  if [ ${NACL_ARCH} = "pnacl" ]; then
    local NACL_CROSS_PREFIX=pnacl
  else
    local NACL_CROSS_PREFIX=${NACL_ARCH}-nacl
  fi

  if [ "${NACL_ARCH}" = "pnacl" ]; then
    local NACLPORTS_PREFIX=${NACL_TOOLCHAIN_ROOT}/usr
  else
    local NACLPORTS_PREFIX=${NACL_TOOLCHAIN_ROOT}/${NACL_CROSS_PREFIX}/usr
  fi

  local NACLPORTS_INCLUDE=${NACLPORTS_PREFIX}/include

  if [ ! -d "${NACLPORTS_INCLUDE}" ]; then
    mkdir -p ${NACLPORTS_INCLUDE}
  fi
}
create_directory

# XXX ${NACLPORTS_ROOT}/src/build_tools/common.sh emits output...
# Just shut it up!
source common.sh > /dev/null

case "${command}" in
  SENTINELS)
    sentinels_dir=${NACLPORTS_ROOT}/src/out/sentinels
    if [ ${NACL_DEBUG} = "1" ]; then
      echo ${sentinels_dir}/${NACL_ARCH}_${NACL_LIBC}_debug
    else
      echo ${sentinels_dir}/${NACL_ARCH}_${NACL_LIBC}
    fi
    ;;
  NACL_LIBC)
    echo ${NACL_LIBC}
    ;;
  *)
    eval "echo \$${command}"
esac
