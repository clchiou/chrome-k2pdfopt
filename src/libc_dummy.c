/*
 * Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
 * Use of this source code is governed by the GNU General Public License
 * as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

#include <stdio.h>
#include <assert.h>
#include <sys/unistd.h>

pid_t getpgid(pid_t pid) {
  fprintf(stderr, "ERROR: %s is not implemented\n", __func__);
  assert(0);
  return -1;
}

int gethostname(char *name, size_t len) {
  fprintf(stderr, "ERROR: %s is not implemented\n", __func__);
  assert(0);
  return -1;
}

char *basename(char *path) {
  fprintf(stderr, "ERROR: %s is not implemented\n", __func__);
  assert(0);
  return NULL;
}
