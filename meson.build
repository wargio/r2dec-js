# SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
# SPDX-License-Identifier: BSD-3-Clause

project('r2dec', 'c', meson_version: '>=0.55.0')

cc = meson.get_compiler('c')

r2dec_incs = ['.', 'c']
r2dec_c_args = ['-fvisibility=hidden', '-flto']
r2dec_src = [
    'c' / 'r2dec.c',
    'c' / 'base64.c',
]

libquickjs_proj = subproject('libquickjs', default_options: ['default_library=static'])
libquickjs_dep = libquickjs_proj.get_variable('quickjs_dep')

modjs_gen = executable('modjs_gen', 'tools' / 'modjs_gen.c',
  dependencies: [],
  include_directories: [],
  implicit_include_directories: false,
  install: false,
)

qjsc = executable('qjsc', 'tools' / 'qjsc_mod.c',
  dependencies: libquickjs_dep,
  c_args: ['-D_GNU_SOURCE=1'],
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

  r2dec_link_args = []
  foreach flag: [
      '-Wl,--exclude-libs,ALL',
    ]
    if cc.has_argument(flag)
      r2dec_link_args += flag
    endif
  endforeach

  r2dec_standalone = executable('r2dec-standalone', r2dec_src,
    c_args : r2dec_c_args,
    dependencies: [ libquickjs_dep ],
    gnu_symbol_visibility: 'hidden',
    link_args: r2dec_link_args,
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

  r2dec_src += [
    bytecode_h,
    bytecode_mod_h,
    'c' / 'r2dec-plugin.c'
  ]

  r2dec_deps = [ libquickjs_dep ]
  libs = ['r_core', 'r_util', 'r_cons', 'r_config', 'r_io', 'r_lang']
  foreach lib : libs
    r2dec_deps += cc.find_library(lib, dirs: radare2_libdir)
  endforeach

  foreach flag: [
      '-fvisibility=hidden',
      '-fvisibility-inlines-hidden',
    ]
    if cc.has_argument(flag)
      r2dec_c_args += flag
    endif
  endforeach

  r2dec_link_args = []
  foreach flag: [
      '-Wl,--exclude-libs,ALL',
    ]
    if cc.has_link_argument(flag)
      r2dec_link_args += flag
    endif
  endforeach

  r2dec_incs += radare2_incdir

  message('radare2 include dir: ' + radare2_incdir)
  message('radare2 library dir: ' + radare2_libdir)
  message('radare2 plugin dir:  ' + radare2_plugdir)

  shared_library('core_pdd', r2dec_src,
    c_args : r2dec_c_args,
    link_args: r2dec_link_args,
    dependencies: r2dec_deps,
    gnu_symbol_visibility: 'hidden',
    include_directories: include_directories(r2dec_incs),
    implicit_include_directories: false,
    install: true,
    install_dir: radare2_plugdir
  )
endif
