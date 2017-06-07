mips
====

## Example
Converts this

```
/ (fcn) fcn.00508fe0 428
|   fcn.00508fe0 ();
|           ; var int local_10h @ sp+0x10
|           ; var int local_18h @ sp+0x18
|           ; var int local_20h @ sp+0x20
|           ; var int local_24h @ sp+0x24
|           ; var int local_28h @ sp+0x28
|           ; var int local_2ch @ sp+0x2c
|           ; var int local_30h @ sp+0x30
|           ; var int local_34h @ sp+0x34
|           ; var int local_38h @ sp+0x38
|           ; var int local_3ch @ sp+0x3c
|           ; var int local_40h @ sp+0x40
|           ; var int local_44h @ sp+0x44
|           0x00508fe0      3c1c0008       lui gp, 8
|           0x00508fe4      279c0f00       addiu gp, gp, 0xf00
|           0x00508fe8      0399e021       addu gp, gp, t9
|           0x00508fec      27bdffb8       addiu sp, sp, -0x48
|           0x00508ff0      afbf0044       sw ra, 0x44(sp)
|           0x00508ff4      afbe0040       sw fp, 0x40(sp)
|           0x00508ff8      afb7003c       sw s7, 0x3c(sp)
|           0x00508ffc      afb60038       sw s6, 0x38(sp)
|           0x00509000      afb50034       sw s5, 0x34(sp)
|           0x00509004      afb40030       sw s4, 0x30(sp)
|           0x00509008      afb3002c       sw s3, 0x2c(sp)
|           0x0050900c      afb20028       sw s2, 0x28(sp)
|           0x00509010      afb10024       sw s1, 0x24(sp)
|           0x00509014      afb00020       sw s0, 0x20(sp)
|           0x00509018      afbc0010       sw gp, 0x10(sp)
|           0x0050901c      8f99948c       lw t9, -0x6b74(gp)
|           0x00509020      00809821       move s3, a0
|           0x00509024      afb90018       sw t9, 0x18(sp)
|           0x00509028      8f998bc8       lw t9, -0x7438(gp)
|           0x0050902c      00a0b021       move s6, a1
|           0x00509030      0320f021       move fp, t9
|           0x00509034      8f998098       lw t9, -0x7f68(gp)
|           0x00509038      00c0a821       move s5, a2
|           0x0050903c      0320b821       move s7, t9
|           0x00509040      00008821       move s1, zero
|           0x00509044      00009021       move s2, zero
|       ,=< 0x00509048      1000001e       b 0x5090c4
|       |   0x0050904c      0000a021       move s4, zero
|     ,.--> 0x00509050      14400007       bnez v0, 0x509070
|     |!|   0x00509054      02402021       move a0, s2
|     |!|   0x00509058      26940100       addiu s4, s4, 0x100
|     |!|   0x0050905c      02e0c821       move t9, s7
|     |!|   0x00509060      0320f809       jalr t9
|     |!|   0x00509064      02802821       move a1, s4
|     |!|   0x00509068      8fbc0010       lw gp, 0x10(sp)
|     |!|   0x0050906c      00409021       move s2, v0
|     `---> 0x00509070      02511021       addu v0, s2, s1
|      !|   0x00509074      a0500000       sb s0, (v0)
|     ,===< 0x00509078      1200002a       beqz s0, 0x509124
|     |!|   0x0050907c      26310001       addiu s1, s1, 1
|    ,====< 0x00509080      12c00010       beqz s6, 0x5090c4
|    ||!|   0x00509084      2402000a       addiu v0, zero, 0xa
|   ,=====< 0x00509088      1602000e       bne s0, v0, 0x5090c4
|   |||!|   0x0050908c      00000000       nop
|  ,======< 0x00509090      12a00026       beqz s5, 0x50912c
|  ||||!|   0x00509094      2a230002       slti v1, s1, 2
|  ||||!|   0x00509098      8ea20000       lw v0, (s5)
|  ||||!|   0x0050909c      00000000       nop
|  ||||!|   0x005090a0      24420001       addiu v0, v0, 1
| ,=======< 0x005090a4      14600021       bnez v1, 0x50912c
| |||||!|   0x005090a8      aea20000       sw v0, (s5)
| |||||!|   0x005090ac      02511021       addu v0, s2, s1
| |||||!|   0x005090b0      9043fffe       lbu v1, -2(v0)
| |||||!|   0x005090b4      2402005c       addiu v0, zero, 0x5c        ; '\'
| ========< 0x005090b8      1462001c       bne v1, v0, 0x50912c
| |||||!|   0x005090bc      00000000       nop
| |||||!|   0x005090c0      2631fffe       addiu s1, s1, -2
| |||||!|      ; JMP XREF from 0x00509048 (fcn.00508fe0)
| ||``--`-> 0x005090c4      8e620034       lw v0, 0x34(s3)
| ||  |!    0x005090c8      00000000       nop
| ||  |!,=< 0x005090cc      1040000d       beqz v0, 0x509104
| ||  |!|   0x005090d0      02602021       move a0, s3
| ||  |!|   0x005090d4      8e630010       lw v1, 0x10(s3)
| ||  |!|   0x005090d8      8e620018       lw v0, 0x18(s3)
| ||  |!|   0x005090dc      00000000       nop
| ||  |!|   0x005090e0      0062102b       sltu v0, v1, v0
| || ,====< 0x005090e4      10400004       beqz v0, 0x5090f8
| || ||!|   0x005090e8      24620001       addiu v0, v1, 1
| || ||!|   0x005090ec      90700000       lbu s0, (v1)
| ||,=====< 0x005090f0      10000009       b 0x509118
| |||||!|   0x005090f4      ae620010       sw v0, 0x10(s3)
| |||`----> 0x005090f8      8fb90018       lw t9, 0x18(sp)
| |||,====< 0x005090fc      10000002       b 0x509108
| |||||!|   0x00509100      02602021       move a0, s3
| |||||!`-> 0x00509104      03c0c821       move t9, fp
| |||||!       ; JMP XREF from 0x005090fc (fcn.00508fe0)
| |||`----> 0x00509108      0320f809       jalr t9
| ||| |!    0x0050910c      00000000       nop
| ||| |!    0x00509110      8fbc0010       lw gp, 0x10(sp)
| ||| |!    0x00509114      00408021       move s0, v0
| ||| |!       ; JMP XREF from 0x005090f0 (fcn.00508fe0)
| ||`-----> 0x00509118      2402ffff       addiu v0, zero, -1
| ||  |`==< 0x0050911c      1602ffcc       bne s0, v0, 0x509050
| ||  |     0x00509120      0234102a       slt v0, s1, s4
| ||  `-,=< 0x00509124      12c00002       beqz s6, 0x509130
| ||    |   0x00509128      00000000       nop
| ``------> 0x0050912c      aed10000       sw s1, (s6)
|      ,`-> 0x00509130      12400009       beqz s2, 0x509158
|      |    0x00509134      02402021       move a0, s2
|      |    0x00509138      8f998098       lw t9, -0x7f68(gp)
|      |    0x0050913c      00000000       nop
|      |    0x00509140      0320f809       jalr t9
|      |    0x00509144      26250001       addiu a1, s1, 1
|      |    0x00509148      00409021       move s2, v0
|      |    0x0050914c      00511021       addu v0, v0, s1
|      |    0x00509150      8fbc0010       lw gp, 0x10(sp)
|      |    0x00509154      a0400000       sb zero, (v0)
|      `--> 0x00509158      02401021       move v0, s2
|           0x0050915c      8fbf0044       lw ra, 0x44(sp)
|           0x00509160      8fbe0040       lw fp, 0x40(sp)
|           0x00509164      8fb7003c       lw s7, 0x3c(sp)
|           0x00509168      8fb60038       lw s6, 0x38(sp)
|           0x0050916c      8fb50034       lw s5, 0x34(sp)
|           0x00509170      8fb40030       lw s4, 0x30(sp)
|           0x00509174      8fb3002c       lw s3, 0x2c(sp)
|           0x00509178      8fb20028       lw s2, 0x28(sp)
|           0x0050917c      8fb10024       lw s1, 0x24(sp)
|           0x00509180      8fb00020       lw s0, 0x20(sp)
|           0x00509184      03e00008       jr ra
\           0x00509188      27bd0048       addiu sp, sp, 0x48          ; 'H'
```

to this:

```c
void fcn_00508fe0(a0, a1) {
    gp = 8;
    gp += 0xf00;
    gp += t9;
    *(((int32_t*) sp) + 17) = ra;
    *(((int32_t*) sp) + 16) = fp;
    int32_t s7;
    int32_t s6;
    int32_t s5;
    int32_t s4;
    int32_t s3;
    int32_t s2;
    int32_t s1;
    int32_t s0;
    *(((int32_t*) sp) + 4) = gp;
    t9 = *(((int32_t*) gp) - 6877);
    s3 = a0;
    *(((int32_t*) sp) + 6) = t9;
    t9 = *(((int32_t*) gp) - 7438);
    s6 = a1;
    fp = t9;
    t9 = *(((int32_t*) gp) - 8154);
    s5 = a2;
    s7 = t9;
    s1 = 0;
    s2 = 0;
    goto label_0x5090c4;
    s4 = 0;
    if (v0 == 0) {
        a0 = s2;
        s4 += 0x100;
        t9 = s7;
        ((void (*)(void)) t9) ();
        a1 = s4;
        gp = *(((int32_t*) sp) + 4);
        s2 = v0;
    }
    v0 = s2 + s1;
    *((int8_t*)v0) = s0;
    if (s0 != 0) {
        s1 += 1;
        do {
            if (s6 != 0) {
                v0 = 0xa;
                if (s0 != v0) {
                    goto label_5090c4;
                }
                if (s5 == 0) {
                    goto label_50912c;
                }
                v1 = (s1 < 2) ? 1 : 0;
                v0 = *((int32_t*) s5);
                v0 += 1;
                if (v1 != 0) {
                    goto label_50912c;
                }
                *((int32_t*)s5) = v0;
                v0 = s2 + s1;
                v1 = *(((uint8_t*) v0) - 2);
                v0 = 0x5c;
                if (v1 != v0) {
                    goto label_50912c;
                }
                s1 += -2;
            }
label_5090c4:
            v0 = *(((int32_t*) s3) + 13);
            if (v0 != 0) {
                a0 = s3;
                v1 = *(((int32_t*) s3) + 4);
                v0 = *(((int32_t*) s3) + 6);
                v0 = (v1 < v0) ? 1 : 0;
                if (v0 != 0) {
                    v0 = v1 + 1;
                    s0 = *((uint8_t*) v1);
                    goto label_0x509118;
                    *(((int32_t*) s3) + 4) = v0;
                }
                t9 = *(((int32_t*) sp) + 6);
                break;
                a0 = s3;
            }
            t9 = fp;
label_509108:
            ((void (*)(void)) t9) ();
            gp = *(((int32_t*) sp) + 4);
            s0 = v0;
label_509118:
            v0 = -1;
        } while (s0 == v0);

        v0 = (s1 < s4) ? 1 : 0;
    } else if (s6 != 0) {
label_50912c:
        *((int32_t*)s6) = s1;
    }
    if (s2 != 0) {
        a0 = s2;
        t9 = *(((int32_t*) gp) - 8154);
        ((void (*)(void)) t9) ();
        a1 = s1 + 1;
        s2 = v0;
        v0 += s1;
        gp = *(((int32_t*) sp) + 4);
        *((int8_t*)v0) = 0;
    }
    v0 = s2;
    return v0;
}
```