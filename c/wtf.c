typedef struct vm_tag* vm_p;
typedef vm_p const vm_ref;

typedef struct vm_tag {
	char* ip;
#define IP vm->ip
	long ir;
#define IR vm->ir
	char* pc;
#define PC vm->pc
	long* sp;
#define SP vm->sp
	long tos;
#define TOS vm->tos
	long stack[256];
}vm_t;

#define INST_LIST(_) \
	_(add, TOS += pop(vm)) \
	_(and, TOS &= pop(vm)) \
	_(bic, TOS &= ~pop(vm)) \
	_(beq, if(0 == pop(vm)) PC += TOS) \
	_(bne, if(0 != pop(vm)) PC += TOS) \
	_(bra, PC += TOS) \
	_(drop, (void)pop(vm)) \
	_(eor, TOS ^= pop(vm)) \
	_(i8, TOS = fetch(&PC, 1)) \
	_(i16, TOS = fetch(&PC, 2)) \
	_(i32, TOS = fetch(&PC, 4)) \
	_(orr, TOS |= pop(vm)) \
	_(pop, TOS = pop(vm)) \
	_(push, push(vm, TOS)) \
	_(rsb, TOS = pop(vm) - TOS) \
	_(sub, TOS -= pop(vm)) \

#define ENUM(_esac, _action) _##_esac,
#define ESAC(_esac, _action) case _##_esac: { inst_##_esac(vm); } break;
#define INST(_esac, _action) extern inline void inst_##_esac(vm_ref vm) { _action; }

enum {
	INST_LIST(ENUM)
};

extern inline
long fetch(char **const pat, const char size)
{
	char* p = *pat;
	long v = 0;

	for(unsigned i = 0; i < size; i++)
		v = (v << 8) | *p++;

	*pat = p;

	return(v);
}

extern inline
long pop(vm_ref vm)
{ return(*++SP); }

extern inline
void push(vm_ref vm, const long v)
{ *SP-- = v; }

INST_LIST(INST)

extern
int wtf(int argc, char** argv) {
	// give w32/64 nothing to complain about
	//	but do something...

	vm_t vm_, *vm = &vm_;


	SP = &vm->stack[255];

	PC = (void*)argv[0];
	for(;;) {
		IP = PC;
		IR = fetch(&PC, 1);

		switch(IR) {
			INST_LIST(ESAC)
		}
	}

	return 0;
}
