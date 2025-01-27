# SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
# SPDX-License-Identifier: BSD-3-Clause

project('r2dec', 'c', meson_version: '>=0.55.0')

cc = meson.get_compiler('c')

libquickjs_proj = subproject('libquickjs', default_options: ['default_library=static'])
libquickjs_dep = libquickjs_proj.get_variable('quickjs_dep')
qjsc = libquickjs_proj.get_variable('qjsc')

r2dec_incs = ['.', 'c']
r2dec_c_args = ['-fvisibility=hidden', '-flto']
r2dec_src = [
    'c' / 'r2dec.c',
    'c' / 'base64.c',
]
r2dec_deps = [
  libquickjs_dep,
]

modjs_gen = executable('modjs_gen', 'tools' / 'modjs_gen.c',
  dependencies: [],
  include_directories: [],
  implicit_include_directories: false,
  install: false,
)

subdir('js')

if get_option('standalone')

  r2dec_src += [
    bytecode_h,
    bytecode_mod_h,
    'c' / 'r2dec-standalone.c',
  ]

  r2dec_standalone = executable('r2dec-standalone', r2dec_src,
    c_args : r2dec_c_args,
    dependencies: r2dec_deps,
    include_directories: include_directories(r2dec_incs),
    implicit_include_directories: false,
    install: false,
  )
else
  # build plugin for radare2
  radare2 = find_program('radare2', required: false)

  radare2_incdir = get_option('r2_incdir')
  if radare2_incdir == '' and radare2.found()
    radare2_incdir = run_command(radare2, '-H', 'R2_INCDIR', check: true).stdout().strip()
  endif

  radare2_libdir = get_option('r2_libdir')
  if radare2_libdir == '' and radare2.found()
    radare2_libdir = run_command(radare2, '-H', 'R2_LIBDIR', check: true).stdout().strip()
  endif

  radare2_plugdir = get_option('r2_plugdir')
  if radare2_plugdir == '' and radare2.found()
    radare2_plugdir = run_command(radare2, '-H', 'R2_LIBR_PLUGINS', check: true).stdout().strip()
    if radare2_plugdir == ''
      radare2_plugdir = get_option('libdir')
    endif
  endif

  libs = ['r_core', 'r_util', 'r_cons', 'r_config', 'r_io']
  foreach lib : libs
    r2dec_deps += cc.find_library(lib, dirs: radare2_libdir)
  endforeach

  r2dec_src += [
    bytecode_h,
    bytecode_mod_h,
    'c' / 'r2dec-plugin.c'
  ]

  r2dec_incs += radare2_incdir

  message('radare2 include dir: ' + radare2_incdir)
  message('radare2 library dir: ' + radare2_libdir)
  message('radare2 plugin dir:  ' + radare2_plugdir)

  shared_library('core_pdd', r2dec_src,
    c_args : r2dec_c_args,
    link_args: ['-Wl,-Bsymbolic'],
    dependencies: r2dec_deps,
    include_directories: include_directories(r2dec_incs),
    implicit_include_directories: false,
    install: true,
    install_dir: radare2_plugdir
  )
endif
