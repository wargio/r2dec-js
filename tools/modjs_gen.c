// SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

const char search[] = "const uint8_t qjsc_";

int main(int argc, char const *argv[]) {
	if (argc != 3) {
		printf("usage %s <bytecode.h> <bytecode_mod.h>\n", argv[0]);
		return 1;
	}

	FILE *input = NULL, *output = NULL;
	char line[1024];

	input = fopen(argv[1], "rb");
	if (!input) {
		printf("Error opening input file %s\n", argv[1]);
		return 1;
	}

	output = fopen(argv[2], "wb");
	if (!output) {
		printf("Error opening output file %s\n", argv[1]);
		fclose(input);
		return 0;
	}

	fprintf(output, "#ifndef BYTECODE_MOD_H\n");
	fprintf(output, "#define BYTECODE_MOD_H\n\n");
	fprintf(output, "/* generated from '%s' */\n\n", argv[1]);
	fprintf(output, "static inline int js_load_all_modules(JSContext *ctx) {\n");
	fprintf(output, "\treturn ");
	int first = 1;

	size_t search_size = sizeof(search) - 1;
	while (fgets(line, sizeof(line), input)) {
		if (strncmp(line, search, search_size)) {
			continue;
		} else if (!first) {
			fprintf(output, " &&\n\t\t");
		}

		char *p = strchr(line + search_size, '[');
		*p = 0;

		p = line + search_size;
		fprintf(output, "js_add_module(ctx, qjsc_%s, qjsc_%s_size)", p, p);
		first = 0;
	}
	if (first) {
		fprintf(output, "1");
	}
	fprintf(output, ";\n}\n\n");
	fprintf(output, "#endif /* BYTECODE_MOD_H */\n");

	fclose(input);
	fclose(output);
	return 0;
}
