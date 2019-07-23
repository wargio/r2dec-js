/* 
 * Copyright (C) 2019 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() { // lgtm [js/useless-expression]
    const _syscall_table = {
        '10': {
            arch: 'x86',
            comment: 'BIOS: video service',
            table: {
                '0': {
                    comment: "set video mode"
                },
                '1': {
                    comment: "set cursor shape"
                },
                '2': {
                    comment: "set cursor position"
                },
                '3': {
                    comment: "get cursor position and shape"
                },
                '4': {
                    comment: "get light pen position"
                },
                '5': {
                    comment: "set display page"
                },
                '6': {
                    comment: "clear/scroll screen up"
                },
                '7': {
                    comment: "clear/scroll screen down"
                },
                '8': {
                    comment: "read character and attribute at cursor"
                },
                '9': {
                    comment: "write character and attribute at cursor"
                },
                'a': {
                    comment: "write character at cursor"
                },
                'b': {
                    comment: "set border color"
                },
                'c': {
                    comment: "write graphics pixel"
                },
                'd': {
                    comment: "read graphics pixel"
                },
                'e': {
                    comment: "write character in tty mode"
                },
                'f': {
                    comment: "get video mode"
                },
                '10': {
                    comment: "set palette registers (ega, vga, svga)"
                },
                '11': {
                    comment: "character generator (ega, vga, svga)"
                },
                '12': {
                    comment: "alternate select functions (ega, vga, svga)"
                },
                '13': {
                    comment: "write string"
                },
                '1a': {
                    comment: "get or set display combination code (vga, svga)"
                },
                '1b': {
                    comment: "get functionality information (vga, svga)"
                },
                '1c': {
                    comment: "save or restore video state (vga, svga)"
                },
                '4f': {
                    comment: " vesa bios extension functions(svga)"
                }
            }
        },
        '11': {
            arch: 'x86',
            comment: 'BIOS: returns equipment list',
        },
        '12': {
            arch: 'x86',
            comment: 'BIOS: returns memory size',
        },
        '13': {
            arch: 'x86',
            comment: 'BIOS: low level disk services',
            table: {
                '0': {
                    comment: 'reset disk drives'
                },
                '1': {
                    comment: 'check drive status'
                },
                '2': {
                    comment: 'read sectors'
                },
                '3': {
                    comment: 'write sectors'
                },
                '4': {
                    comment: 'verify sectors'
                },
                '5': {
                    comment: 'format track'
                },
                '8': {
                    comment: 'get drive parameters'
                },
                '9': {
                    comment: 'init fixed drive parameters'
                },
                'c': {
                    comment: 'seek to specified track'
                },
                'd': {
                    comment: 'reset fixed disk controller'
                },
                '15': {
                    comment: 'get drive type'
                },
                '16': {
                    comment: 'get floppy drive media change status'
                },
                '17': {
                    comment: 'set disk type'
                },
                '18': {
                    comment: 'set floppy drive media type'
                },
                '41': {
                    comment: 'extended disk drive (edd) installation check'
                },
                '42': {
                    comment: 'extended read sectors'
                },
                '43': {
                    comment: 'extended write sectors'
                },
                '44': {
                    comment: 'extended verify sectors'
                },
                '45': {
                    comment: 'lock/unlock drive'
                },
                '46': {
                    comment: 'eject media'
                },
                '47': {
                    comment: 'extended seek'
                },
                '48': {
                    comment: 'extended get drive parameters'
                },
                '49': {
                    comment: 'extended get media change status'
                },
                '4e': {
                    comment: 'extended set hardware configuration'
                }
            }
        },
        '14': {
            arch: 'x86',
            comment: 'BIOS: serial port services',
            table: {
                '0': {
                    comment: 'serial port initialization'
                },
                '1': {
                    comment: 'transmit character'
                },
                '2': {
                    comment: 'receive character'
                },
                '3': {
                    comment: 'status'
                }
            }
        },
        '16': {
            arch: 'x86',
            comment: 'BIOS: keyboard services',
            table: {
                '0': {
                    comment: 'read character'
                },
                '1': {
                    comment: 'read input status'
                },
                '2': {
                    comment: 'read keyboard shift status'
                },
                '5': {
                    comment: 'store keystroke in keyboard buffer'
                },
                '10': {
                    comment: 'read character extended'
                },
                '11': {
                    comment: 'read input status extended'
                },
                '12': {
                    comment: 'read keyboard shift status extended'
                },
            }
        },
        '80': {
            arch: 'x86|arm|ppc|sparc',
            //comment: 'linux syscalls',
            table: {
                '0': {
                    name: 'sys_restart_syscall',
                    args: 0
                },
                '1': {
                    name: 'sys_exit',
                    args: 1
                },
                '2': {
                    name: 'sys_fork',
                    args: 1
                },
                '3': {
                    name: 'sys_read',
                    args: 3
                },
                '4': {
                    name: 'sys_write',
                    args: 3
                },
                '5': {
                    name: 'sys_open',
                    args: 3
                },
                '6': {
                    name: 'sys_close',
                    args: 1
                },
                '7': {
                    name: 'sys_waitpid',
                    args: 3
                },
                '8': {
                    name: 'sys_creat',
                    args: 2
                },
                '9': {
                    name: 'sys_link',
                    args: 2
                },
                'a': {
                    name: 'sys_unlink',
                    args: 1
                },
                'b': {
                    name: 'sys_execve',
                    args: 4
                },
                'c': {
                    name: 'sys_chdir',
                    args: 1
                },
                'd': {
                    name: 'sys_time',
                    args: 1
                },
                'e': {
                    name: 'sys_mknod',
                    args: 3
                },
                'f': {
                    name: 'sys_chmod',
                    args: 2
                },
                '10': {
                    name: 'sys_lchown16',
                    args: 3
                },
                '12': {
                    name: 'sys_stat',
                    args: 2
                },
                '13': {
                    name: 'sys_lseek',
                    args: 3
                },
                '14': {
                    name: 'sys_getpid',
                    args: 0
                },
                '15': {
                    name: 'sys_mount',
                    args: 4
                },
                '16': {
                    name: 'sys_oldumount',
                    args: 1
                },
                '17': {
                    name: 'sys_setuid16',
                    args: 1
                },
                '18': {
                    name: 'sys_getuid16',
                    args: 0
                },
                '19': {
                    name: 'sys_stime',
                    args: 1
                },
                '1a': {
                    name: 'sys_ptrace',
                    args: 4
                },
                '1b': {
                    name: 'sys_alarm',
                    args: 1
                },
                '1c': {
                    name: 'sys_fstat',
                    args: 2
                },
                '1d': {
                    name: 'sys_pause',
                    args: 0
                },
                '1e': {
                    name: 'sys_utime',
                    args: 2
                },
                '21': {
                    name: 'sys_access',
                    args: 2
                },
                '22': {
                    name: 'sys_nice',
                    args: 1
                },
                '24': {
                    name: 'sys_sync',
                    args: 0
                },
                '25': {
                    name: 'sys_kill',
                    args: 2
                },
                '26': {
                    name: 'sys_rename',
                    args: 2
                },
                '27': {
                    name: 'sys_mkdir',
                    args: 2
                },
                '28': {
                    name: 'sys_rmdir',
                    args: 1
                },
                '29': {
                    name: 'sys_dup',
                    args: 1
                },
                '2a': {
                    name: 'sys_pipe',
                    args: 1
                },
                '2b': {
                    name: 'sys_times',
                    args: 1
                },
                '2d': {
                    name: 'sys_brk',
                    args: 1
                },
                '2e': {
                    name: 'sys_setgid16',
                    args: 1
                },
                '2f': {
                    name: 'sys_getgid16',
                    args: 0
                },
                '30': {
                    name: 'sys_signal',
                    args: 2
                },
                '31': {
                    name: 'sys_geteuid16',
                    args: 0
                },
                '32': {
                    name: 'sys_getegid16',
                    args: 0
                },
                '33': {
                    name: 'sys_acct',
                    args: 1
                },
                '34': {
                    name: 'sys_umount',
                    args: 2
                },
                '36': {
                    name: 'sys_ioctl',
                    args: 3
                },
                '37': {
                    name: 'sys_fcntl',
                    args: 3
                },
                '39': {
                    name: 'sys_setpgid',
                    args: 2
                },
                '3b': {
                    name: 'sys_olduname',
                    args: 1
                },
                '3c': {
                    name: 'sys_umask',
                    args: 1
                },
                '3d': {
                    name: 'sys_chroot',
                    args: 1
                },
                '3e': {
                    name: 'sys_ustat',
                    args: 2
                },
                '3f': {
                    name: 'sys_dup2',
                    args: 2
                },
                '40': {
                    name: 'sys_getppid',
                    args: 0
                },
                '41': {
                    name: 'sys_getpgrp',
                    args: 0
                },
                '42': {
                    name: 'sys_setsid',
                    args: 0
                },
                '43': {
                    name: 'sys_sigaction',
                    args: 3
                },
                '44': {
                    name: 'sys_sgetmask',
                    args: 0
                },
                '45': {
                    name: 'sys_ssetmask',
                    args: 1
                },
                '46': {
                    name: 'sys_setreuid16',
                    args: 2
                },
                '47': {
                    name: 'sys_setregid16',
                    args: 2
                },
                '48': {
                    name: 'sys_sigsuspend',
                    args: 3
                },
                '49': {
                    name: 'sys_sigpending',
                    args: 1
                },
                '4a': {
                    name: 'sys_sethostname',
                    args: 2
                },
                '4b': {
                    name: 'sys_setrlimit',
                    args: 2
                },
                '4c': {
                    name: 'sys_old_getrlimit',
                    args: 2
                },
                '4d': {
                    name: 'sys_getrusage',
                    args: 2
                },
                '4e': {
                    name: 'sys_gettimeofday',
                    args: 2
                },
                '4f': {
                    name: 'sys_settimeofday',
                    args: 2
                },
                '50': {
                    name: 'sys_getgroups16',
                    args: 2
                },
                '51': {
                    name: 'sys_setgroups16',
                    args: 2
                },
                '52': {
                    name: 'sys_old_select',
                    args: 1
                },
                '53': {
                    name: 'sys_symlink',
                    args: 2
                },
                '54': {
                    name: 'sys_lstat',
                    args: 2
                },
                '55': {
                    name: 'sys_readlink',
                    args: 3
                },
                '56': {
                    name: 'sys_uselib',
                    args: 1
                },
                '57': {
                    name: 'sys_swapon',
                    args: 2
                },
                '58': {
                    name: 'sys_reboot',
                    args: 4
                },
                '59': {
                    name: 'sys_old_readdir',
                    args: 3
                },
                '5a': {
                    name: 'sys_old_mmap',
                    args: 1
                },
                '5b': {
                    name: 'sys_munmap',
                    args: 2
                },
                '5c': {
                    name: 'sys_truncate',
                    args: 2
                },
                '5d': {
                    name: 'sys_ftruncate',
                    args: 2
                },
                '5e': {
                    name: 'sys_fchmod',
                    args: 2
                },
                '5f': {
                    name: 'sys_fchown16',
                    args: 3
                },
                '60': {
                    name: 'sys_getpriority',
                    args: 2
                },
                '61': {
                    name: 'sys_setpriority',
                    args: 3
                },
                '63': {
                    name: 'sys_statfs',
                    args: 2
                },
                '64': {
                    name: 'sys_fstatfs',
                    args: 2
                },
                '65': {
                    name: 'sys_ioperm',
                    args: 3
                },
                '66': {
                    name: 'sys_socketcall',
                    args: 2
                },
                '67': {
                    name: 'sys_syslog',
                    args: 3
                },
                '68': {
                    name: 'sys_setitimer',
                    args: 3
                },
                '69': {
                    name: 'sys_getitimer',
                    args: 2
                },
                '6a': {
                    name: 'sys_newstat',
                    args: 2
                },
                '6b': {
                    name: 'sys_newlstat',
                    args: 2
                },
                '6c': {
                    name: 'sys_newfstat',
                    args: 2
                },
                '6d': {
                    name: 'sys_uname',
                    args: 1
                },
                '6e': {
                    name: 'sys_iopl',
                    args: 2
                },
                '6f': {
                    name: 'sys_vhangup',
                    args: 0
                },
                '71': {
                    name: 'sys_vm86old',
                    args: 2
                },
                '72': {
                    name: 'sys_wait4',
                    args: 4
                },
                '73': {
                    name: 'sys_swapoff',
                    args: 1
                },
                '74': {
                    name: 'sys_sysinfo',
                    args: 1
                },
                '75': {
                    name: 'sys_ipc',
                    args: 1
                },
                '76': {
                    name: 'sys_fsync',
                    args: 1
                },
                '77': {
                    name: 'sys_sigreturn',
                    args: 1
                },
                '78': {
                    name: 'sys_clone',
                    args: 4
                },
                '79': {
                    name: 'sys_setdomainname',
                    args: 2
                },
                '7a': {
                    name: 'sys_newuname',
                    args: 1
                },
                '7b': {
                    name: 'sys_modify_ldt',
                    args: 3
                },
                '7c': {
                    name: 'sys_adjtimex',
                    args: 1
                },
                '7d': {
                    name: 'sys_mprotect',
                    args: 3
                },
                '7e': {
                    name: 'sys_sigprocmask',
                    args: 3
                },
                '80': {
                    name: 'sys_init_module',
                    args: 3
                },
                '81': {
                    name: 'sys_delete_module',
                    args: 2
                },
                '83': {
                    name: 'sys_quotactl',
                    args: 4
                },
                '84': {
                    name: 'sys_getpgid',
                    args: 1
                },
                '85': {
                    name: 'sys_fchdir',
                    args: 1
                },
                '86': {
                    name: 'sys_bdflush',
                    args: 2
                },
                '87': {
                    name: 'sys_sysfs',
                    args: 3
                },
                '88': {
                    name: 'sys_personality',
                    args: 1
                },
                '8a': {
                    name: 'sys_setfsuid16',
                    args: 1
                },
                '8b': {
                    name: 'sys_setfsgid16',
                    args: 1
                },
                '8c': {
                    name: 'sys_llseek',
                    args: 4
                },
                '8d': {
                    name: 'sys_getdents',
                    args: 3
                },
                '8e': {
                    name: 'sys_select',
                    args: 4
                },
                '8f': {
                    name: 'sys_flock',
                    args: 2
                },
                '90': {
                    name: 'sys_msync',
                    args: 3
                },
                '91': {
                    name: 'sys_readv',
                    args: 3
                },
                '92': {
                    name: 'sys_writev',
                    args: 3
                },
                '93': {
                    name: 'sys_getsid',
                    args: 1
                },
                '94': {
                    name: 'sys_fdatasync',
                    args: 1
                },
                '95': {
                    name: 'sys_sysctl',
                    args: 1
                },
                '96': {
                    name: 'sys_mlock',
                    args: 2
                },
                '97': {
                    name: 'sys_munlock',
                    args: 2
                },
                '98': {
                    name: 'sys_mlockall',
                    args: 1
                },
                '99': {
                    name: 'sys_munlockall',
                    args: 0
                },
                '9a': {
                    name: 'sys_sched_setparam',
                    args: 2
                },
                '9b': {
                    name: 'sys_sched_getparam',
                    args: 2
                },
                '9c': {
                    name: 'sys_sched_setscheduler',
                    args: 3
                },
                '9d': {
                    name: 'sys_sched_getscheduler',
                    args: 1
                },
                '9e': {
                    name: 'sys_sched_yield',
                    args: 0
                },
                '9f': {
                    name: 'sys_sched_get_priority_max',
                    args: 1
                },
                'a0': {
                    name: 'sys_sched_get_priority_min',
                    args: 1
                },
                'a1': {
                    name: 'sys_sched_rr_get_interval',
                    args: 2
                },
                'a2': {
                    name: 'sys_nanosleep',
                    args: 2
                },
                'a3': {
                    name: 'sys_mremap',
                    args: 4
                },
                'a4': {
                    name: 'sys_setresuid16',
                    args: 3
                },
                'a5': {
                    name: 'sys_getresuid16',
                    args: 3
                },
                'a6': {
                    name: 'sys_vm86',
                    args: 3
                },
                'a8': {
                    name: 'sys_poll',
                    args: 3
                },
                'a9': {
                    name: 'sys_nfsservctl',
                    args: 3
                },
                'aa': {
                    name: 'sys_setresgid16',
                    args: 3
                },
                'ab': {
                    name: 'sys_getresgid16',
                    args: 3
                },
                'ac': {
                    name: 'sys_prctl',
                    args: 4
                },
                'ad': {
                    name: 'sys_rt_sigreturn',
                    args: 1
                },
                'ae': {
                    name: 'sys_rt_sigaction',
                    args: 4
                },
                'af': {
                    name: 'sys_rt_sigprocmask',
                    args: 4
                },
                'b0': {
                    name: 'sys_rt_sigpending',
                    args: 2
                },
                'b1': {
                    name: 'sys_rt_sigtimedwait',
                    args: 4
                },
                'b2': {
                    name: 'sys_rt_sigqueueinfo',
                    args: 3
                },
                'b3': {
                    name: 'sys_rt_sigsuspend',
                    args: 2
                },
                'b4': {
                    name: 'sys_pread64',
                    args: 4
                },
                'b5': {
                    name: 'sys_pwrite64',
                    args: 4
                },
                'b6': {
                    name: 'sys_chown16',
                    args: 3
                },
                'b7': {
                    name: 'sys_getcwd',
                    args: 2
                },
                'b8': {
                    name: 'sys_capget',
                    args: 2
                },
                'b9': {
                    name: 'sys_capset',
                    args: 2
                },
                'ba': {
                    name: 'sys_sigaltstack',
                    args: 3
                },
                'bb': {
                    name: 'sys_sendfile',
                    args: 4
                },
                'be': {
                    name: 'sys_vfork',
                    args: 1
                },
                'bf': {
                    name: 'sys_getrlimit',
                    args: 2
                },
                'c0': {
                    name: 'sys_mmap_pgoff',
                    args: 1
                },
                'c1': {
                    name: 'sys_truncate64',
                    args: 2
                },
                'c2': {
                    name: 'sys_ftruncate64',
                    args: 2
                },
                'c3': {
                    name: 'sys_stat64',
                    args: 2
                },
                'c4': {
                    name: 'sys_lstat64',
                    args: 2
                },
                'c5': {
                    name: 'sys_fstat64',
                    args: 2
                },
                'c6': {
                    name: 'sys_lchown',
                    args: 3
                },
                'c7': {
                    name: 'sys_getuid',
                    args: 0
                },
                'c8': {
                    name: 'sys_getgid',
                    args: 0
                },
                'c9': {
                    name: 'sys_geteuid',
                    args: 0
                },
                'ca': {
                    name: 'sys_getegid',
                    args: 0
                },
                'cb': {
                    name: 'sys_setreuid',
                    args: 2
                },
                'cc': {
                    name: 'sys_setregid',
                    args: 2
                },
                'cd': {
                    name: 'sys_getgroups',
                    args: 2
                },
                'ce': {
                    name: 'sys_setgroups',
                    args: 2
                },
                'cf': {
                    name: 'sys_fchown',
                    args: 3
                },
                'd0': {
                    name: 'sys_setresuid',
                    args: 3
                },
                'd1': {
                    name: 'sys_getresuid',
                    args: 3
                },
                'd2': {
                    name: 'sys_setresgid',
                    args: 3
                },
                'd3': {
                    name: 'sys_getresgid',
                    args: 3
                },
                'd4': {
                    name: 'sys_chown',
                    args: 3
                },
                'd5': {
                    name: 'sys_setuid',
                    args: 1
                },
                'd6': {
                    name: 'sys_setgid',
                    args: 1
                },
                'd7': {
                    name: 'sys_setfsuid',
                    args: 1
                },
                'd8': {
                    name: 'sys_setfsgid',
                    args: 1
                },
                'd9': {
                    name: 'sys_pivot_root',
                    args: 2
                },
                'da': {
                    name: 'sys_mincore',
                    args: 3
                },
                'db': {
                    name: 'sys_madvise',
                    args: 3
                },
                'dc': {
                    name: 'sys_getdents64',
                    args: 3
                },
                'dd': {
                    name: 'sys_fcntl64',
                    args: 3
                },
                'e0': {
                    name: 'sys_gettid',
                    args: 0
                },
                'e1': {
                    name: 'sys_readahead',
                    args: 3
                },
                'e2': {
                    name: 'sys_setxattr',
                    args: 4
                },
                'e3': {
                    name: 'sys_lsetxattr',
                    args: 4
                },
                'e4': {
                    name: 'sys_fsetxattr',
                    args: 4
                },
                'e5': {
                    name: 'sys_getxattr',
                    args: 4
                },
                'e6': {
                    name: 'sys_lgetxattr',
                    args: 4
                },
                'e7': {
                    name: 'sys_fgetxattr',
                    args: 4
                },
                'e8': {
                    name: 'sys_listxattr',
                    args: 3
                },
                'e9': {
                    name: 'sys_llistxattr',
                    args: 3
                },
                'ea': {
                    name: 'sys_flistxattr',
                    args: 3
                },
                'eb': {
                    name: 'sys_removexattr',
                    args: 2
                },
                'ec': {
                    name: 'sys_lremovexattr',
                    args: 2
                },
                'ed': {
                    name: 'sys_fremovexattr',
                    args: 2
                },
                'ee': {
                    name: 'sys_tkill',
                    args: 2
                },
                'ef': {
                    name: 'sys_sendfile64',
                    args: 4
                },
                'f0': {
                    name: 'sys_futex',
                    args: 1
                },
                'f1': {
                    name: 'sys_sched_setaffinity',
                    args: 3
                },
                'f2': {
                    name: 'sys_sched_getaffinity',
                    args: 3
                },
                'f3': {
                    name: 'sys_set_thread_area',
                    args: 1
                },
                'f4': {
                    name: 'sys_get_thread_area',
                    args: 1
                },
                'f5': {
                    name: 'sys_io_setup',
                    args: 2
                },
                'f6': {
                    name: 'sys_io_destroy',
                    args: 1
                },
                'f7': {
                    name: 'sys_io_getevents',
                    args: 4
                },
                'f8': {
                    name: 'sys_io_submit',
                    args: 3
                },
                'f9': {
                    name: 'sys_io_cancel',
                    args: 3
                },
                'fa': {
                    name: 'sys_fadvise64',
                    args: 4
                },
                'fc': {
                    name: 'sys_exit_group',
                    args: 1
                },
                'fd': {
                    name: 'sys_lookup_dcookie',
                    args: 3
                },
                'fe': {
                    name: 'sys_epoll_create',
                    args: 1
                },
                'ff': {
                    name: 'sys_epoll_ctl',
                    args: 4
                },
                '100': {
                    name: 'sys_epoll_wait',
                    args: 4
                },
                '101': {
                    name: 'sys_remap_file_pages',
                    args: 4
                },
                '102': {
                    name: 'sys_set_tid_address',
                    args: 1
                },
                '103': {
                    name: 'sys_timer_create',
                    args: 3
                },
                '104': {
                    name: 'sys_timer_settime',
                    args: 4
                },
                '105': {
                    name: 'sys_timer_gettime',
                    args: 2
                },
                '106': {
                    name: 'sys_timer_getoverrun',
                    args: 1
                },
                '107': {
                    name: 'sys_timer_delete',
                    args: 1
                },
                '108': {
                    name: 'sys_clock_settime',
                    args: 2
                },
                '109': {
                    name: 'sys_clock_gettime',
                    args: 2
                },
                '10a': {
                    name: 'sys_clock_getres',
                    args: 2
                },
                '10b': {
                    name: 'sys_clock_nanosleep',
                    args: 4
                },
                '10c': {
                    name: 'sys_statfs64',
                    args: 3
                },
                '10d': {
                    name: 'sys_fstatfs64',
                    args: 3
                },
                '10e': {
                    name: 'sys_tgkill',
                    args: 3
                },
                '10f': {
                    name: 'sys_utimes',
                    args: 2
                },
                '110': {
                    name: 'sys_fadvise64_64',
                    args: 4
                },
                '112': {
                    name: 'sys_mbind',
                    args: 1
                },
                '113': {
                    name: 'sys_get_mempolicy',
                    args: 4
                },
                '114': {
                    name: 'sys_set_mempolicy',
                    args: 3
                },
                '115': {
                    name: 'sys_mq_open',
                    args: 4
                },
                '116': {
                    name: 'sys_mq_unlink',
                    args: 1
                },
                '117': {
                    name: 'sys_mq_timedsend',
                    args: 4
                },
                '118': {
                    name: 'sys_mq_timedreceive',
                    args: 4
                },
                '119': {
                    name: 'sys_mq_notify',
                    args: 2
                },
                '11a': {
                    name: 'sys_mq_getsetattr',
                    args: 3
                },
                '11b': {
                    name: 'sys_kexec_load',
                    args: 4
                },
                '11c': {
                    name: 'sys_waitid',
                    args: 4
                },
                '11e': {
                    name: 'sys_add_key',
                    args: 4
                },
                '11f': {
                    name: 'sys_request_key',
                    args: 4
                },
                '120': {
                    name: 'sys_keyctl',
                    args: 4
                },
                '121': {
                    name: 'sys_ioprio_set',
                    args: 3
                },
                '122': {
                    name: 'sys_ioprio_get',
                    args: 2
                },
                '123': {
                    name: 'sys_inotify_init',
                    args: 0
                },
                '124': {
                    name: 'sys_inotify_add_watch',
                    args: 3
                },
                '125': {
                    name: 'sys_inotify_rm_watch',
                    args: 2
                },
                '126': {
                    name: 'sys_migrate_pages',
                    args: 4
                },
                '127': {
                    name: 'sys_openat',
                    args: 4
                },
                '128': {
                    name: 'sys_mkdirat',
                    args: 3
                },
                '129': {
                    name: 'sys_mknodat',
                    args: 4
                },
                '12a': {
                    name: 'sys_fchownat',
                    args: 4
                },
                '12b': {
                    name: 'sys_futimesat',
                    args: 3
                },
                '12c': {
                    name: 'sys_fstatat64',
                    args: 4
                },
                '12d': {
                    name: 'sys_unlinkat',
                    args: 3
                },
                '12e': {
                    name: 'sys_renameat',
                    args: 4
                },
                '12f': {
                    name: 'sys_linkat',
                    args: 4
                },
                '130': {
                    name: 'sys_symlinkat',
                    args: 3
                },
                '131': {
                    name: 'sys_readlinkat',
                    args: 4
                },
                '132': {
                    name: 'sys_fchmodat',
                    args: 3
                },
                '133': {
                    name: 'sys_faccessat',
                    args: 3
                },
                '134': {
                    name: 'sys_pselect6',
                    args: 1
                },
                '135': {
                    name: 'sys_ppoll',
                    args: 4
                },
                '136': {
                    name: 'sys_unshare',
                    args: 1
                },
                '137': {
                    name: 'sys_set_robust_list',
                    args: 2
                },
                '138': {
                    name: 'sys_get_robust_list',
                    args: 3
                },
                '139': {
                    name: 'sys_splice',
                    args: 1
                },
                '13a': {
                    name: 'sys_sync_file_range',
                    args: 4
                },
                '13b': {
                    name: 'sys_tee',
                    args: 4
                },
                '13c': {
                    name: 'sys_vmsplice',
                    args: 4
                },
                '13d': {
                    name: 'sys_move_pages',
                    args: 1
                },
                '13e': {
                    name: 'sys_getcpu',
                    args: 3
                },
                '13f': {
                    name: 'sys_epoll_pwait',
                    args: 1
                },
                '140': {
                    name: 'sys_utimensat',
                    args: 4
                },
                '141': {
                    name: 'sys_signalfd',
                    args: 3
                },
                '142': {
                    name: 'sys_timerfd_create',
                    args: 2
                },
                '143': {
                    name: 'sys_eventfd',
                    args: 1
                },
                '144': {
                    name: 'sys_fallocate',
                    args: 4
                },
                '145': {
                    name: 'sys_timerfd_settime',
                    args: 4
                },
                '146': {
                    name: 'sys_timerfd_gettime',
                    args: 2
                },
                '147': {
                    name: 'sys_signalfd4',
                    args: 4
                },
                '148': {
                    name: 'sys_eventfd2',
                    args: 2
                },
                '149': {
                    name: 'sys_epoll_create1',
                    args: 1
                },
                '14a': {
                    name: 'sys_dup3',
                    args: 3
                },
                '14b': {
                    name: 'sys_pipe2',
                    args: 2
                },
                '14c': {
                    name: 'sys_inotify_init1',
                    args: 1
                },
                '14d': {
                    name: 'sys_preadv',
                    args: 4
                },
                '14e': {
                    name: 'sys_pwritev',
                    args: 4
                },
                '14f': {
                    name: 'sys_rt_tgsigqueueinfo',
                    args: 4
                },
                '150': {
                    name: 'sys_perf_event_open',
                    args: 4
                },
                '151': {
                    name: 'sys_recvmmsg',
                    args: 4
                }
            }
        }
    };

    return function(hexnum, arch) {
        var info = _syscall_table[hexnum];
        if (!info || info.arch.split('|').indexOf(arch) < 0) {
            return null;
        }
        return info;
    };

});