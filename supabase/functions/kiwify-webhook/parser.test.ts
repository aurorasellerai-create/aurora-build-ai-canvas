import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseCurrencyToCents } from "./index.ts";

Deno.test("parseCurrencyToCents — pt-BR decimal comma", () => {
  assertEquals(parseCurrencyToCents("39,90"), 3990);
  assertEquals(parseCurrencyToCents("59,00"), 5900);
});

Deno.test("parseCurrencyToCents — en-US decimal point", () => {
  assertEquals(parseCurrencyToCents("59.90"), 5990);
  assertEquals(parseCurrencyToCents("2499.99"), 249999);
});

Deno.test("parseCurrencyToCents — pt-BR thousand separator", () => {
  assertEquals(parseCurrencyToCents("1.234,56"), 123456);
  assertEquals(parseCurrencyToCents("12.345.678,90"), 1234567890);
});

Deno.test("parseCurrencyToCents — en-US thousand separator", () => {
  assertEquals(parseCurrencyToCents("2,499.99"), 249999);
  assertEquals(parseCurrencyToCents("1,000,000.00"), 100000000);
});

Deno.test("parseCurrencyToCents — numbers and integers", () => {
  assertEquals(parseCurrencyToCents(39.9), 3990);
  assertEquals(parseCurrencyToCents(100), 10000);
  assertEquals(parseCurrencyToCents("1234"), 123400);
});

Deno.test("parseCurrencyToCents — with currency symbol/spaces", () => {
  assertEquals(parseCurrencyToCents("R$ 39,90"), 3990);
  assertEquals(parseCurrencyToCents("$2,499.99"), 249999);
});

Deno.test("parseCurrencyToCents — invalid inputs return null", () => {
  assertEquals(parseCurrencyToCents(null), null);
  assertEquals(parseCurrencyToCents(undefined), null);
  assertEquals(parseCurrencyToCents(""), null);
  assertEquals(parseCurrencyToCents("abc"), null);
  assertEquals(parseCurrencyToCents("-10,00"), null);
  assertEquals(parseCurrencyToCents(-5), null);
  assertEquals(parseCurrencyToCents(NaN), null);
  assertEquals(parseCurrencyToCents(Infinity), null);
});
