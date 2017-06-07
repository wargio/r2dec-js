ppc
===


# Example of pseudo-decompilation

Converts this

```
┌ (fcn) fcn.0800fe00 424
│   fcn.0800fe00 (int arg_a0h);
│           ; arg int arg_a0h @ r1+0xa0
│           0x0800fe00      f821ff61       stdu r1, -0xa0(r1)
│           0x0800fe04      7c0802a6       mflr r0
│           0x0800fe08      fba10088       std r29, 0x88(r1)
│           0x0800fe0c      fbe10098       std r31, 0x98(r1)
│           0x0800fe10      7c9d2378       mr r29, r4
│           0x0800fe14      7cbf2b78       mr r31, r5
│           0x0800fe18      fb410070       std r26, 0x70(r1)
│           0x0800fe1c      fb810080       std r28, 0x80(r1)
│           0x0800fe20      fbc10090       std r30, 0x90(r1)
│           0x0800fe24      f80100b0       std r0, 0xb0(r1)
│           0x0800fe28      7cdc3378       mr r28, r6
│           0x0800fe2c      fb610078       std r27, 0x78(r1)
│           0x0800fe30      7c7a1b78       mr r26, r3
│           0x0800fe34      4bfff4a1       bl 0x800f2d4
│           0x0800fe38      7ba40020       clrldi r4, r29, 0x20
│           0x0800fe3c      7be50420       clrldi r5, r31, 0x30
│           0x0800fe40      7c7e1b78       mr r30, r3
│           0x0800fe44      4bfff11d       bl 0x800ef60
│           0x0800fe48      2f830000       cmpwi cr7, r3, 0
│           0x0800fe4c      7c7d1b78       mr r29, r3
│       ┌─< 0x0800fe50      41fe002c       beq+ cr7, 0x800fe7c
│       │   0x0800fe54      7fc3f378       mr r3, r30
│       │   0x0800fe58      4bffef81       bl 0x800edd8
│       │   0x0800fe5c      38800006       li r4, 6
│       │   0x0800fe60      e8a28d50       ld r5, -0x72b0(r2)
│       │   0x0800fe64      78680420       clrldi r8, r3, 0x30
│       │   0x0800fe68      e8628d48       ld r3, -0x72b8(r2)
│       │   0x0800fe6c      7fa707b4       extsw r7, r29
│       │   0x0800fe70      6484b000       oris r4, r4, 0xb000
│       │   0x0800fe74      38c00115       li r6, 0x115
│      ┌──< 0x0800fe78      480000cc       b 0x800ff44
│      │└─> 0x0800fe7c      57e5043e       clrlwi r5, r31, 0x10
│      │    0x0800fe80      3f600001       lis r27, 1
│      │    0x0800fe84      2f850000       cmpwi cr7, r5, 0
│      │┌─< 0x0800fe88      419e0008       beq cr7, 0x800fe90
│      ││   0x0800fe8c      7cbb2b78       mr r27, r5
│      │└─> 0x0800fe90      3be00000       li r31, 0
│      │┌─< 0x0800fe94      4800004c       b 0x800fee0
│    ┌┌───> 0x0800fe98      e81c0000       ld r0, 0(r28)
│    ||││   0x0800fe9c      e97c0010       ld r11, 0x10(r28)
│    ||││   0x0800fea0      7c0903a6       mtctr r0
│    ||││   0x0800fea4      4e800421       bctrl
│    ||││   0x0800fea8      5463063e       clrlwi r3, r3, 0x18
│    ||││   0x0800feac      2f830000       cmpwi cr7, r3, 0
│    └────< 0x0800feb0      419effe8       beq cr7, 0x800fe98
│     |││   0x0800feb4      57e4482c       slwi r4, r31, 9
│     |││   0x0800feb8      7fc3f378       mr r3, r30
│     |││   0x0800febc      7c9a2214       add r4, r26, r4
│     |││   0x0800fec0      38a00000       li r5, 0
│     |││   0x0800fec4      4bffef39       bl 0x800edfc
│     |││   0x0800fec8      2f830001       cmpwi cr7, r3, 1
│     |││   0x0800fecc      7c7d1b78       mr r29, r3
│    ┌────< 0x0800fed0      419e00a8       beq cr7, 0x800ff78
│    │|││   0x0800fed4      2f830000       cmpwi cr7, r3, 0
│   ┌─────< 0x0800fed8      409e0078       bne cr7, 0x800ff50
│   ││|││   0x0800fedc      3bff0001       addi r31, r31, 1
│   ││↑││      ; JMP XREF from 0x0800fe94 (fcn.0800fe00)
│   ││|│└─> 0x0800fee0      7f9fd800       cmpw cr7, r31, r27
│   ││└───< 0x0800fee4      409effb4       bne cr7, 0x800fe98
│   ││ │┌─> 0x0800fee8      e81c0000       ld r0, 0(r28)
│   ││ │|   0x0800feec      e97c0010       ld r11, 0x10(r28)
│   ││ │|   0x0800fef0      7c0903a6       mtctr r0
│   ││ │|   0x0800fef4      4e800421       bctrl
│   ││ │|   0x0800fef8      5463063e       clrlwi r3, r3, 0x18
│   ││ │|   0x0800fefc      2f830000       cmpwi cr7, r3, 0
│   ││ │└─< 0x0800ff00      419effe8       beq cr7, 0x800fee8
│   ││ │    0x0800ff04      7f44d378       mr r4, r26
│   ││ │    0x0800ff08      7fc3f378       mr r3, r30
│   ││ │    0x0800ff0c      38a00000       li r5, 0
│   ││ │    0x0800ff10      4bffeeed       bl 0x800edfc
│   ││ │    0x0800ff14      2f830001       cmpwi cr7, r3, 1
│   ││ │    0x0800ff18      7c7d1b78       mr r29, r3
│   ││ │┌─< 0x0800ff1c      419e005c       beq cr7, 0x800ff78
│   ││ ││   0x0800ff20      7fc3f378       mr r3, r30
│   ││ ││   0x0800ff24      4bffeeb5       bl 0x800edd8
│   ││ ││   0x0800ff28      38800006       li r4, 6
│   ││ ││   0x0800ff2c      e8a28d50       ld r5, -0x72b0(r2)
│   ││ ││   0x0800ff30      78680420       clrldi r8, r3, 0x30
│   ││ ││   0x0800ff34      e8628d58       ld r3, -0x72a8(r2)
│   ││ ││   0x0800ff38      7fa707b4       extsw r7, r29
│   ││ ││   0x0800ff3c      6484b000       oris r4, r4, 0xb000
│   ││ ││   0x0800ff40      38c0012f       li r6, 0x12f
│   ││ ││      ; JMP XREF from 0x0800ff74 (fcn.0800fe00)
│   ││ ││      ; JMP XREF from 0x0800fe78 (fcn.0800fe00)
│   ││┌└──> 0x0800ff44      48002155       bl 0x8012098
│   ││| │   0x0800ff48      3860ffff       li r3, -1
│   ││|┌──< 0x0800ff4c      48000030       b 0x800ff7c
│   └─────> 0x0800ff50      7fc3f378       mr r3, r30
│    │|││   0x0800ff54      4bffee85       bl 0x800edd8
│    │|││   0x0800ff58      38800006       li r4, 6
│    │|││   0x0800ff5c      e8a28d50       ld r5, -0x72b0(r2)
│    │|││   0x0800ff60      78680420       clrldi r8, r3, 0x30
│    │|││   0x0800ff64      e8628d58       ld r3, -0x72a8(r2)
│    │|││   0x0800ff68      7fa707b4       extsw r7, r29
│    │|││   0x0800ff6c      6484b000       oris r4, r4, 0xb000
│    │|││   0x0800ff70      38c00125       li r6, 0x125
│    │└───< 0x0800ff74      4bffffd0       b 0x800ff44
│    └──└─> 0x0800ff78      38600000       li r3, 0
│      │       ; JMP XREF from 0x0800ff4c (fcn.0800fe00)
│      └──> 0x0800ff7c      e80100b0       ld r0, 0xb0(r1)
│           0x0800ff80      7c6307b4       extsw r3, r3
│           0x0800ff84      eb410070       ld r26, 0x70(r1)
│           0x0800ff88      eb610078       ld r27, 0x78(r1)
│           0x0800ff8c      7c0803a6       mtlr r0
│           0x0800ff90      eb810080       ld r28, 0x80(r1)
│           0x0800ff94      eba10088       ld r29, 0x88(r1)
│           0x0800ff98      ebc10090       ld r30, 0x90(r1)
│           0x0800ff9c      ebe10098       ld r31, 0x98(r1)
│           0x0800ffa0      382100a0       addi r1, r1, 0xa0
└           0x0800ffa4      4e800020       blr
                    
```


to this:

```c
void fcn_0800fe00(r3, r4, r5, r6) {
    int64_t r29;
    int64_t r31;
    r29 = r4;
    r31 = r5;
    int64_t r26;
    int64_t r28;
    int64_t r30;
    r28 = r6;
    int64_t r27;
    r26 = r3;
    r3 = fcn_800f2d4 ();
    r30 = r3;
    r3 = fcn_800ef60 (r3, (uint64_t) r29 & 0xffffffffll, (uint64_t) r31 & 0xffffll);
    r29 = r3;
    if (((int32_t) r3) != 0) {
        fcn_800edd8 (r30);
        r4 = 6;
        r5 = *(((int64_t*) r2) - 3670);
        r8 = (uint64_t) r3 & 0xffffll;
        r3 = *(((int64_t*) r2) - 3671);
        r7 = (int64_t) r29;
        r4 |= 0xb0000000;
        r6 = 0x115;
        goto label_0x800ff44;
    }
    r5 = (uint32_t) r31 & 0xffff;
    r27 = (uint32_t) 0x00010000;
    if (((int32_t) r5) != 0) {
        r27 = r5;
    }
    for (r31 = 0; ((int32_t) r31) != ((int32_t) r27); r31 += 1) {
        do {
            r0 = *((int64_t*) r28);
            r11 = *(((int64_t*) r28) + 2);
            void (*p)(void) = r0;
            r3 = p (r3);
            r3 = (uint32_t) r3 & 0xff;
        } while (((int32_t) r3) != 0);

        r4 = (uint32_t) r31 << 9;
        r3 = fcn_800edfc (r30, r26 + r4, 0);
        r29 = r3;
        if (((int32_t) r3) == 1) {
            goto label_800ff78;
        }
        if (((int32_t) r3) != 0) {
            goto label_800ff50;
        }
    }

    do {
        r0 = *((int64_t*) r28);
        r11 = *(((int64_t*) r28) + 2);
        void (*p)(void) = r0;
        r3 = p (r3);
        r3 = (uint32_t) r3 & 0xff;
    } while (((int32_t) r3) != 0);

    r3 = fcn_800edfc (r30, r26, 0);
    r29 = r3;
    if (((int32_t) r3) != 1) {
        fcn_800edd8 (r30);
        r4 = 6;
        fcn_8012098 (*(((int64_t*) r2) - 3669), r4 | 0xb0000000, *(((int64_t*) r2) - 3670), 0x12f, (int64_t) r29, (uint64_t) r3 & 0xffffll);
        r3 = -1;
        goto label_0x800ff7c;
label_800ff50
        fcn_800edd8 (r30);
        r4 = 6;
        r5 = *(((int64_t*) r2) - 3670);
        r8 = (uint64_t) r3 & 0xffffll;
        r3 = *(((int64_t*) r2) - 3669);
        r7 = (int64_t) r29;
        r4 |= 0xb0000000;
        r6 = 0x125;
        goto label_0x800ff44;
    }
label_800ff78
    r3 = 0;
    r3 = (int64_t) r3;
    return r3;
}

```