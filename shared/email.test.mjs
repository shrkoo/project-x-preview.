import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, isValidEmail } from "./email.mjs";

test("accepts a valid ordinary email", () => {
  assert.equal(normalizeEmail("shahramalidazeh6203@gmail.com"), "shahramalidazeh6203@gmail.com");
  assert.equal(isValidEmail("shahramalidazeh6203@gmail.com"), true);
});

test("trims spaces and normalizes the domain", () => {
  assert.equal(normalizeEmail("  User@GMAIL.COM  "), "User@gmail.com");
  assert.equal(isValidEmail("  User@GMAIL.COM  "), true);
});

test("removes zero-width and bidi controls around the address", () => {
  const value = "\u200F\u202Eshahramalidazeh6203@gmail.com\u2066\uFEFF";
  assert.equal(normalizeEmail(value), "shahramalidazeh6203@gmail.com");
  assert.equal(isValidEmail(value), true);
});

test("removes formatting controls embedded in the address", () => {
  const value = "shahramali\u200Bdez eh6203@gmail.com";
  assert.equal(isValidEmail(value), false);
  assert.equal(isValidEmail("shahramalidazeh6203@gmail.com\u200F"), true);
});

test("rejects malformed addresses", () => {
  for (const value of ["", "abc", "@example.com", "a@", "a@example", "a@@example.com"]) {
    assert.equal(isValidEmail(value), false, value);
  }
});
