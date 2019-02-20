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

module.exports = (function() {
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
                    args: 5
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
                    name: 'sys_lseek',
                    args: 3
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

})();