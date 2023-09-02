// SPDX-FileCopyrightText: 2013 William Sherif
// SPDX-License-Identifier: MIT

#ifndef BASE64_H
#define BASE64_H

#include <stdio.h>
#include <stdlib.h>

// The COMPILE-TIME SETTING SAFEBASE64 is really important.
// You need to decide if PARANOIA is more important to you than speed.
//
// SAFEBASE64: Remove this def to NOT check the validity of base64 ascii strings
// before unbase64'ing that string.  If you don't #define SAFEBASE64,
// then the program assumes that all characters in the string sent to unbase64()
// are in the base64 alphabet.  As such if a character is NOT in the base64 alphabet
// your data will be wrong (it will be turned to 0 (as if it were just a base64 'A')).
// Removing this test greatly speeds up unbase64'ing (by about 3-4x).
#define SAFEBASE64
#define isMultipleOf(a, x) (!((a) % x))

// Converts any binary data to base64 characters.
// Length of the resultant string is stored in flen
// (you must pass pointer flen).
char *base64(const void *binaryData, int len, int *flen);

// Convert your base64 string haJIh/+ back to binary data.
// len is the string length and should NOT include the null terminator.
// Final size will be stored in flen
// (you must pass pointer flen).
unsigned char *unbase64(const char *ascii, int len, int *flen);

// Checks the integrity of a base64 string to make sure it is
// made up of only characters in the base64 alphabet (array b64)
#define isbase64ValidChr(ch) (('0' <= ch && ch <= '9') || \
	('A' <= ch && ch <= 'Z') || ('a' <= ch && ch <= 'z') || \
	ch == '+' || ch == '/') // other 2 valid chars, + ending chrs
// = is NOT considered a valid base64 chr, it's only valid at the end for padding

// Tells you if a string is valid base64, which means it's length is
// a multiple of 4, and it contains only valid base64 chrs.
int base64integrity(const char *ascii, int len);

#endif
