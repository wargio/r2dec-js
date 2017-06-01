radare2 decompiler.
===================

* open with radare2 your file
* analize the function you want to disassemble (`af`)
* give the data to the plugin `pdfj @ fcn.xxxxxxxx > dump.json`
* done.

## Example
Converts this

```
/ (fcn) fcn.100b50a4 368                                                          
|   fcn.100b50a4 ();                                                              
|              ; CALL XREF from 0x1006b23c (fcn.1006ae1c + 1056)                  
|              ; CALL XREF from 0x1006fb48 (fcn.1006f8bc + 652)                   
|              ; CALL XREF from 0x100706c4 (fcn.1006f8bc + 3592)                  
|              ; CALL XREF from 0x100739e0 (fcn.1007305c + 2436)                  
|              ; CALL XREF from 0x1008f244 (fcn.1008e8a0 + 2468)                  
|           0x100b50a4      9421ff60       stwu r1, -0xa0(r1)                     
|           0x100b50a8      7c0802a6       mflr r0                                
|           0x100b50ac      7d800026       mfcr r12                               
|           0x100b50b0      bf010080       stmw r24, 0x80(r1)                     
|           0x100b50b4      7c9c2378       mr r28, r4                             
|           0x100b50b8      38810008       addi r4, r1, 8                         
|           0x100b50bc      900100a4       stw r0, 0xa4(r1)                       
|           0x100b50c0      9181007c       stw r12, 0x7c(r1)                      
|           0x100b50c4      7c7a1b78       mr r26, r3                             
|           0x100b50c8      48012f65       bl fcn.100c802c                        
|           0x100b50cc      2f830000       cmpwi cr7, r3, 0                       
|       ,=< 0x100b50d0      409e0120       bne cr7, 0x100b51f0                    
|       |   0x100b50d4      80010018       lwz r0, 0x18(r1)                       
|       |   0x100b50d8      3be00000       li r31, 0                              
|       |   0x100b50dc      83a10008       lwz r29, 8(r1)                         
|       |   0x100b50e0      54000426       rlwinm r0, r0, 0, 0x10, 0x13           
|       |   0x100b50e4      83c1000c       lwz r30, 0xc(r1)                       
|       |   0x100b50e8      2f806000       cmpwi cr7, r0, 0x6000                  
|      ,==< 0x100b50ec      .dword 0x409e0010                                     
|      ||   0x100b50f0      83a10028       lwz r29, 0x28(r1)                      
|      ||   0x100b50f4      3be00001       li r31, 1                              
|      ||   0x100b50f8      83c1002c       lwz r30, 0x2c(r1)                      
|      ||      ; JMP XREF from 0x100b50ec (fcn.100b50a4)                          
|      `--> 0x100b50fc      3c601011       lis r3, 0x1011                         
|       |   0x100b5100      3c801011       lis r4, 0x1011                         
|       |   0x100b5104      386356fc       addi r3, r3, 0x56fc                    
|       |   0x100b5108      3884c114       addi r4, r4, -0x3eec                   
|       |   0x100b510c      48014bfd       bl fcn.100c9d08                        
|       |   0x100b5110      7c7b1b79       or. r27, r3, r3                        
|      ,==< 0x100b5114      418200dc       beq 0x100b51f0                         
|     ,===< 0x100b5118      480000a8       b 0x100b51c0                           
|     |||      ; JMP XREF from 0x100b51e0 (fcn.100b50a4)                          
|    .----> 0x100b511c      83fc0000       lwz r31, 0(r28)                        
|    ||||   0x100b5120      7f04c378       mr r4, r24                             
|    ||||   0x100b5124      7fe3fb78       mr r3, r31                             
|    ||||   0x100b5128      48021441       bl fcn.100d6568                        
|    ||||   0x100b512c      2f830000       cmpwi cr7, r3, 0                       
|   ,=====< 0x100b5130      419e00a4       beq cr7, 0x100b51d4                    
|   |||||   0x100b5134      809c0004       lwz r4, 4(r28)                         
|   |||||   0x100b5138      7f43d378       mr r3, r26                             
|   |||||   0x100b513c      4802142d       bl fcn.100d6568                        
|   |||||   0x100b5140      2f830000       cmpwi cr7, r3, 0                       
|  ,======< 0x100b5144      419e00a0       beq cr7, 0x100b51e4                    
|  ||||||   0x100b5148      7f43d378       mr r3, r26                             
|  ||||||   0x100b514c      7fe4fb78       mr r4, r31                             
|  ||||||   0x100b5150      48021419       bl fcn.100d6568                        
|  ||||||   0x100b5154      2f830000       cmpwi cr7, r3, 0                       
| ,=======< 0x100b5158      419e008c       beq cr7, 0x100b51e4                    
| ========< 0x100b515c      408e0008       bne cr3, 0x100b5164                    
| ========< 0x100b5160      41920074       beq cr4, 0x100b51d4                    
| |||!|||      ; JMP XREF from 0x100b515c (fcn.100b50a4)                          
| --------> 0x100b5164      7fe3fb78       mr r3, r31                             
| |||||||   0x100b5168      7f24cb78       mr r4, r25                             
| |||||||   0x100b516c      48012ec1       bl fcn.100c802c                        
| |||||||   0x100b5170      2f830000       cmpwi cr7, r3, 0                       
| ========< 0x100b5174      409e001c       bne cr7, 0x100b5190                    
| |||||||   0x100b5178      80010028       lwz r0, 0x28(r1)                       
| |||||||   0x100b517c      7f80e800       cmpw cr7, r0, r29                      
| ========< 0x100b5180      .dword 0x409e0010                                     
| |||||||   0x100b5184      8001002c       lwz r0, 0x2c(r1)                       
| |||||||   0x100b5188      7f80f000       cmpw cr7, r0, r30                      
| ========< 0x100b518c      419e0058       beq cr7, 0x100b51e4                    
| |||!|||      ; JMP XREF from 0x100b5174 (fcn.100b50a4)                          
| |||!|||      ; JMP XREF from 0x100b5180 (fcn.100b50a4)                          
| --------> 0x100b5190      807c0004       lwz r3, 4(r28)                         
| |||||||   0x100b5194      7f24cb78       mr r4, r25                             
| |||||||   0x100b5198      48012e95       bl fcn.100c802c                        
| |||||||   0x100b519c      2f830000       cmpwi cr7, r3, 0                       
| ========< 0x100b51a0      409e0034       bne cr7, 0x100b51d4                    
| |||||||   0x100b51a4      80010008       lwz r0, 8(r1)                          
| |||||||   0x100b51a8      7f80e800       cmpw cr7, r0, r29                      
| ========< 0x100b51ac      409e0028       bne cr7, 0x100b51d4                    
| |||||||   0x100b51b0      8001000c       lwz r0, 0xc(r1)                        
| |||||||   0x100b51b4      7f80f000       cmpw cr7, r0, r30                      
| ========< 0x100b51b8      419e002c       beq cr7, 0x100b51e4                    
| ========< 0x100b51bc      48000018       b 0x100b51d4                           
| |||!|||      ; JMP XREF from 0x100b5118 (fcn.100b50a4)                          
| ||||`---> 0x100b51c0      3d201011       lis r9, 0x1011                         
| |||| ||   0x100b51c4      2d9c0000       cmpwi cr3, r28, 0                      
| |||| ||   0x100b51c8      2e1f0000       cmpwi cr4, r31, 0                      
| |||| ||   0x100b51cc      3b090a48       addi r24, r9, 0xa48                    
| |||| ||   0x100b51d0      3b210008       addi r25, r1, 8                        
| |||! ||      ; JMP XREF from 0x100b5130 (fcn.100b50a4)                          
| |||! ||      ; JMP XREF from 0x100b5160 (fcn.100b50a4)                          
| |||! ||      ; JMP XREF from 0x100b51a0 (fcn.100b50a4)                          
| |||! ||      ; JMP XREF from 0x100b51ac (fcn.100b50a4)                          
| |||! ||      ; JMP XREF from 0x100b51bc (fcn.100b50a4)                          
| --`-----> 0x100b51d4      7f63db78       mr r3, r27                             
| || | ||   0x100b51d8      48014d21       bl fcn.100c9ef8                        
| || | ||   0x100b51dc      7c7c1b79       or. r28, r3, r3                        
| || `====< 0x100b51e0      4082ff3c       bne 0x100b511c                         
| ||   ||      ; JMP XREF from 0x100b5144 (fcn.100b50a4)                          
| ||   ||      ; JMP XREF from 0x100b5158 (fcn.100b50a4)                          
| ||   ||      ; JMP XREF from 0x100b518c (fcn.100b50a4)                          
| ||   ||      ; JMP XREF from 0x100b51b8 (fcn.100b50a4)                          
| ``------> 0x100b51e4      7f63db78       mr r3, r27                             
|      ||   0x100b51e8      48014af5       bl fcn.100c9cdc                        
|     ,===< 0x100b51ec      48000008       b 0x100b51f4                           
|     |||      ; JMP XREF from 0x100b50d0 (fcn.100b50a4)                          
|     |||      ; JMP XREF from 0x100b5114 (fcn.100b50a4)                          
|     |``-> 0x100b51f0      3b800000       li r28, 0                              
|     |        ; JMP XREF from 0x100b51ec (fcn.100b50a4)                          
|     `---> 0x100b51f4      800100a4       lwz r0, 0xa4(r1)                       
|           0x100b51f8      7f83e378       mr r3, r28                             
|           0x100b51fc      8181007c       lwz r12, 0x7c(r1)                      
|           0x100b5200      bb010080       lmw r24, 0x80(r1)                      
|           0x100b5204      7c0803a6       mtlr r0                                
|           0x100b5208      7d818120       mtcrf 0x18, r12                        
|           0x100b520c      382100a0       addi r1, r1, 0xa0                      
\           0x100b5210      4e800020       blr                                    
```

to this:

```c
void fcn.100b50a4() {
    r12 = _mfcr ();
    uint32_t r24;
    r28 = r4;
    uint32_t r12;
    r26 = r3;
    fcn_100c802c (r3, r1 + 8);
    if (((int32_t) r3) == 0) {
        r31 = 0;
        __asm("rlwinm r0, r0, 0, 0x10, 0x13");
        if (((int32_t) r0) == 0x6000) {
            r31 = 1;
        }
        fcn_100c9d08 (r3 + 0x56fc, r4 - 0x3eec(uint32_t) 0x10110000, (uint32_t) 0x10110000);
        if ((r27) != 0) {
            goto label_100b51f0;
        }
        goto label_0x100b51c0;
        do {
            r31 = *((uint32_t*) r28);
            fcn_100d6568 (r31, r24);
            if (((int32_t) r3) != 0) {
                fcn_100d6568 (r26, *(((uint32_t*) r28) + 1));
                if (((int32_t) r3) != 0) {
                    goto label_100b51e4;
                }
                fcn_100d6568 (r26, r31);
                if (((int32_t) r3) != 0) {
                    goto label_100b51e4;
                }
                __asm("bne cr3, 0x100b5164");
                __asm("beq cr4, 0x100b51d4");
                fcn_100c802c (r31, r25);
                if (((int32_t) r3) == 0) {
                    if (((int32_t) r0) == ((int32_t) r29)) {
                        goto label_100b5190;
                    }
                    if (((int32_t) r0) != ((int32_t) r30)) {
                        goto label_100b51e4;
                    }
                }
label_100b5190:
                fcn_100c802c (*(((uint32_t*) r28) + 1), r25);
                if (((int32_t) r3) == 0) {
                    goto label_100b51d4;
                }
                if (((int32_t) r0) == ((int32_t) r29)) {
                    goto label_100b51d4;
                }
                if (((int32_t) r0) != ((int32_t) r30)) {
                    goto label_100b51e4;
                }
                break;
label_100b51c0:
                r24 = r9 + 0xa48;
                r25 = r1 + 8;
            }
label_100b51d4:
            fcn_100c9ef8 (r27);
        } while ((r27) == 0);

label_100b51e4:
        fcn_100c9cdc (r27);
        goto label_0x100b51f4;
    }
label_100b51f0:
    r28 = 0;
label_100b51f4:
    r3 = r28;
    _mtcrf (0x18, r12);
    return r3;
}
```
