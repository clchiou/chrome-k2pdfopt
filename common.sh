# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

set -o nounset
set -o errexit

source ${NACLPORTS_ROOT}/src/build_tools/common.sh

# TODO(clchiou): There are *LOTS* of mysterious build errors when building
# dynamic objects that are not worth fixing.  So just build static objects
# until NaCl is mature and stable.
export LDFLAGS="${LDFLAGS} -static"

FixupOfCFLAGS() {
  # I think we should use -isysroot to point to ${NACLPORTS_INCLUDE} rather
  # than set -I to point to it because when a conflicting version of headers
  # is installed, you cannot compile with the current headers (although they
  # will eventually be installed) if -I${NACLPORTS_INCLUDE} is before -I of
  # the local headers, but using -isysroot will not have such problem.
  CFLAGS="-isysroot $(dirname ${NACLPORTS_PREFIX})"
  local flag=
  for flag in ${NACLPORTS_CFLAGS}; do
    if [ "${flag}" != "-I${NACLPORTS_INCLUDE}" ]; then
      CFLAGS="${CFLAGS} ${flag}"
    fi
  done
  export CFLAGS
}

FixupOfCFLAGS
export CXXFLAGS="${CFLAGS}"

DefaultSyncSrcStep() {
  MakeDir ${NACL_PACKAGES_REPOSITORY}/${PACKAGE_DIR}
  rsync -av ${START_DIR}/ ${NACL_PACKAGES_REPOSITORY}/${PACKAGE_DIR}
}

DefaultPreConfigureStep() {
  ChangeDir ${NACL_PACKAGES_REPOSITORY}/${PACKAGE_DIR}
  # autogen.sh is ran by default.
  if [ ${RUN_AUTOGEN_SH:-1} != 0 -a -x autogen.sh ]; then
    ./autogen.sh ${EXTRA_AUTOGEN_SH_ARGS:-}
  fi
}

# Override defaults of naclports common.sh

DefaultPackageInstall() {
  DefaultPreInstallStep
  DefaultSyncSrcStep
  DefaultPreConfigureStep
  DefaultConfigureStep
  DefaultBuildStep
  DefaultTranslateStep
  DefaultValidateStep
  DefaultInstallStep
}
