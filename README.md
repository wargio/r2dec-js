[![Build Status](https://travis-ci.org/wargio/r2dec-js.svg?branch=master)](https://travis-ci.org/wargio/r2dec-js)

r2dec
=====

Converts asm to pseudo-C code.

# Software Requirements

Requires radare2 version 2.6.9 or newer.

# Install

Follow the following steps to install r2dec via r2pm

    r2pm init
    r2pm install r2dec

done

# Usage

* open with radare2 your file
* analize the function you want to disassemble (`af`)
* run the plugin via `pdd`
* done.

# Arguments

```
[0x00000000]> pdd?
Usage: pdd [args] - core plugin for r2dec
 pdd   - decompile current function
 pdd?  - show this help
 pdda  - decompile current function with side assembly
 pddu  - install/upgrade r2dec via r2pm
 pddi  - generates the issue data
Environment
 R2DEC_HOME  defaults to the root directory of the r2dec repo
[0x00000000]> pdd --help
r2dec [options]
       --help       | this help message
       --colors     | enables syntax colors
       --assembly   | shows pseudo next to the assembly
       --offset     | shows pseudo next to the offset
       --casts      | shows all casts in the pseudo code
       --issue      | generates the json used for the test suite
       --debug      | do not catch exceptions
       --html       | outputs html data instead of text
       --xrefs      | shows also instruction xrefs in the pseudo code
       --paddr      | all xrefs uses physical addresses instead of virtual addresses
```

# Radare2 Evaluable vars

You can use these in your `.radare2rc` file.

```
r2dec.casts         | if false, hides all casts in the pseudo code.
r2dec.asm           | if true, shows pseudo next to the assembly.
r2dec.offset        | if true, shows pseudo next to the offset.
r2dec.xrefs         | if true, shows all xrefs in the pseudo code.
r2dec.paddr         | if true, all xrefs uses physical addresses compare.
r2dec.theme         | defines the color theme to be used on r2dec.
e scr.html          | outputs html data instead of text.
e scr.color         | enables syntax colors.
```

# Report an Issue

* open with radare2 your file
* analize the function you want to disassemble (`af`)
* give the data to the plugin via `pddi` or `pdd --issue`
* insert the JSON returned by the previous command into the issue (you can also upload the output)
* done.

# Supported Arch

    arm
    avr
    m68k (experimental)
    mips
    ppc
    sparc
    v850
    wasm (partial)
    x86 (intel)

# Developing on r2dec

[Read DEVELOPERS.md](https://github.com/wargio/r2dec-js/blob/master/DEVELOPERS.md)

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
 
int32_t main (int32_t arg1, int32_t arg2) {
    int32_t local_20h;
    int32_t local_14h;
    int32_t local_4h;
    local_14h = edi;
    local_20h = rsi;
    local_4h = 0;
    while (local_4h > 0x8f) {
        if (local_4h > 0xf) {
            local_4h += 0x50;
        }
        local_4h += 0x10;
    }
    eax = 0;
    return eax;
}
```
