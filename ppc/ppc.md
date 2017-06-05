ppc
===


# Example of pseudo-decompilation

Converts this

```
┌ (fcn) make_funcname_visible 47
│   sym.make_funcname_visible ();
│              ; CALL XREF from 0x00434c58 (sub.free_b50)
│              ; CALL XREF from 0x0043513a (sub.free_b50)
│           0x004378b0      53             push rbx
│           0x004378b1      89fb           mov ebx, edi
│           0x004378b3      bff8694900     mov edi, str.FUNCNAME ; 0x4969f8 ; "FUNCNAME"
│           0x004378b8      e8b3fbffff     call sym.find_variable_for_assignment
│           0x004378bd      4885c0         test rax, rax
│       ┌─< 0x004378c0      7412           je 0x4378d4
│       │   0x004378c2      4883781800     cmp qword [rax + 0x18], 0
│      ┌──< 0x004378c7      740b           je 0x4378d4
│      ││   0x004378c9      85db           test ebx, ebx
│     ┌───< 0x004378cb      7513           jne 0x4378e0
│     │││   0x004378cd      814828001000.  or dword [rax + 0x28], 0x1000
│     │││      ; JMP XREF from 0x004378c0 (sym.make_funcname_visible)
│     │││      ; JMP XREF from 0x004378c7 (sym.make_funcname_visible)
│     │└└─> 0x004378d4      5b             pop rbx
│     │     0x004378d5      c3             ret
      │     0x004378d6      662e0f1f8400.  nop word cs:[rax + rax]
│     │        ; JMP XREF from 0x004378cb (sym.make_funcname_visible)
│     └───> 0x004378e0      816028ffefff.  and dword [rax + 0x28], 0xffffefff
│           0x004378e7      5b             pop rbx
└           0x004378e8      c3             ret
```


to this:

```c
void make_funcname_visible() {
    ebx = edi;
    edi = 0x4969f8;
    rax = fcn_437470 (edi);
    if (rax != 0) {
        if (*((int64_t*) rax + 0x18) == 0) {
            goto label_4378d4;
        }
        if (ebx != 0) {
            goto label_4378e0;
        }
        *((int32_t*) rax + 0x28) |= 0x1000;
    }
label_4378d4:
    return;
label_4378e0:
    *((int32_t*) rax + 0x28) &= 0xffffefff;
    return;
}
```