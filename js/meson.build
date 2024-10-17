# SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
# SPDX-License-Identifier: BSD-3-Clause

r2dec_plugin = 'r2dec-plugin.js'
r2dec_testsuite = 'r2dec-testsuite.js'

if get_option('standalone')
  bytecode_h = custom_target(
      'bytecode.h',
      build_always_stale: true,
      output : 'bytecode.h',
      input : r2dec_testsuite,
      command : [qjsc, '-m', '-N', 'main_bytecode', '-o', '@OUTPUT@', '@INPUT@'],
  )
else
  bytecode_h = custom_target(
      'bytecode.h',
      build_always_stale: true,
      output : 'bytecode.h',
      input : r2dec_plugin,
      command : [qjsc, '-m', '-N', 'main_bytecode', '-o', '@OUTPUT@', '@INPUT@'],
  )
endif

bytecode_mod_h = custom_target(
    'bytecode_mod.h',
    build_always_stale: true,
    output : 'bytecode_mod.h',
    input : bytecode_h,
    command : [modjs_gen, '@INPUT@', '@OUTPUT@'],
)