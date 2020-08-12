![Build Status](https://github.com/radareorg/r2dec-js/workflows/continuous-tests/badge.svg)
[![CodeFactor](https://www.codefactor.io/repository/github/radareorg/r2dec-js/badge)](https://www.codefactor.io/repository/github/radareorg/r2dec-js)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/radareorg/r2dec-js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/radareorg/r2dec-js/context:javascript)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/radareorg/r2dec-js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/radareorg/r2dec-js/alerts/)

![r2dec](https://raw.githubusercontent.com/radareorg/r2dec-js/image/r2dec200.png)

Converts asm to pseudo-C code.

# Software Requirements

Requires radare2 version 3.6.0 or newer.

# Install

Follow the following steps to install r2dec via r2pm

### *nix users (Linux/OSX/etc..):

    r2pm init
    r2pm install r2dec

### Windows users only:

 - clone
 - For cygwin or msys2
    - run `make -C p` from inside the `r2dec` folder
 - For everything else
    - Build via meson.
 - Set `R2DEC_HOME` env variable or copy whole r2dec-js dir to `%R2_RDATAHOME%\r2pm\git\` where `%R2_RDATAHOME%` is path returned by `radare2.exe -H R2_RDATAHOME`.

# Usage

* Open your file with radare2
* Analyze the function you want to disassemble (`af`)
* Run the plugin via `pdd`

# Arguments

```
[0x00000000]> pdd?Usage: pdd [args] - core plugin for r2dec
 pdd           - decompile current function
 pdd?          - show this help
 pdd*          - the decompiled code is returned to r2 as comment (via CCu)
 pdda          - decompile current function side by side with assembly
 pddb          - decompile current function but shows only scopes
 pddo          - decompile current function side by side with offsets
 pddu          - install/upgrade r2dec via r2pm
 pdds <branch> - switches r2dec branch
 pddi          - generates the issue data

Environment
 R2DEC_HOME  defaults to the root directory of the r2dec repo

[0x00000000]> pdd --help

r2dec [options]
       --help       | this help message
       --assembly   | shows pseudo next to the assembly
       --blocks     | shows only scopes blocks
       --casts      | shows all casts in the pseudo code
       --colors     | enables syntax colors
       --debug      | do not catch exceptions
       --html       | outputs html data instead of text
       --issue      | generates the json used for the test suite
       --offsets    | shows pseudo next to the assembly offset
       --paddr      | all xrefs uses physical addresses instead of virtual addresses
       --xrefs      | shows also instruction xrefs in the pseudo code
       --as-comment | the decompiled code is returned to r2 as comment (via CCu)
       --as-opcode  | the decompiled code is returned to r2 as opcode (via aho)
```

# Radare2 Evaluable vars

You can use these in your `.radare2rc` file.

```
r2dec.asm           | if true, shows pseudo next to the assembly.
r2dec.blocks        | if true, shows only scopes blocks.
r2dec.casts         | if false, hides all casts in the pseudo code.
r2dec.debug         | do not catch exceptions in r2dec.
r2dec.paddr         | if true, all xrefs uses physical addresses compare.
r2dec.slow          | if true load all the data before to avoid multirequests to r2.
r2dec.theme         | defines the color theme to be used on r2dec.
r2dec.xrefs         | if true, shows all xrefs in the pseudo code.
e scr.html          | outputs html data instead of text.
e scr.color         | enables syntax colors.
```

# Report an Issue

* Open your file with radare2
* Analyze the function you want to disassemble (`af`)
* Give the data to the plugin via `pddi` or `pdd --issue`
* Insert the JSON returned by the previous command into the issue (you can also upload the output)

# Supported Arch

    6502 (experimental)
    arm 16/32/64 bit
    avr
    dalvik
    m68k (experimental)
    mips
    ppc 32/64 bit (VLE included)
    superh (experimental)
    sparc
    v850
    wasm (experimental)
    x86/x64

# Developing on r2dec

[Read DEVELOPERS.md](https://github.com/radareorg/r2dec-js/blob/master/DEVELOPERS.md)

## Example

This example shows a possible dump of the plugin.

### Source Code

```c
#include <stdio.h>

int main(int argc, char const *argv[]) {
    int var = 0;
    while(var < 0x90) {
        if(var < 0x10) {
            var += 0x50;
        }
        var += 0x10;
    }
    return 0;
}
```

### radare2 view


```
╭ (fcn) main 50
│   main (int arg1, int arg2);
│           ; var int local_20h @ rbp-0x20
│           ; var int local_14h @ rbp-0x14
│           ; var signed int local_4h @ rbp-0x4
│           ; DATA XREF from entry0 (0x1041)
│           0x00001119      55             push rbp
│           0x0000111a      4889e5         mov rbp, rsp
│           0x0000111d      897dec         mov dword [local_14h], edi  ; arg1
│           0x00001120      488975e0       mov qword [local_20h], rsi  ; arg2
│           0x00001124      c745fc000000.  mov dword [local_4h], 0
│       ╭─< 0x0000112b      eb0e           jmp 0x113b
│       │   ; CODE XREF from main (0x1142)
│      ╭──> 0x0000112d      837dfc0f       cmp dword [local_4h], 0xf   ; [0xf:4]=0x3e000300
│     ╭───< 0x00001131      7f04           jg 0x1137
│     │⋮│   0x00001133      8345fc50       add dword [local_4h], 0x50  ; 'P'
│     │⋮│   ; CODE XREF from main (0x1131)
│     ╰───> 0x00001137      8345fc10       add dword [local_4h], 0x10
│      ⋮│   ; CODE XREF from main (0x112b)
│      ⋮╰─> 0x0000113b      817dfc8f0000.  cmp dword [local_4h], 0x8f  ; [0x8f:4]=0x2a800
│      ╰──< 0x00001142      7ee9           jle 0x112d
│           0x00001144      b800000000     mov eax, 0
│           0x00001149      5d             pop rbp
╰           0x0000114a      c3             ret
```

### r2dec pseudo-C code

```c
/* r2dec pseudo C output */
#include <stdint.h>
 
int32_t main (int32_t argc, char ** argv) {
    char ** local_20h;
    int32_t local_14h;
    int32_t local_4h;
    local_14h = edi;
    local_20h = rsi;
    local_4h = 0;
    while (local_4h <= 0x8f) {
        if (local_4h <= 0xf) {
            local_4h += 0x50;
        }
        local_4h += 0x10;
    }
    eax = 0;
    return eax;
}
```
