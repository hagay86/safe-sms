import { describe, expect, it } from "vitest";
import { checkVariableValue, extractPlaceholders, renderBody } from "../../src/lib/template.js";
import { BadRequestError } from "../../src/lib/errors.js";

describe("extractPlaceholders", () => {
  it("finds unique placeholders in order, tolerating whitespace", () => {
    expect(extractPlaceholders("Hi {{name}}, code {{ code }} for {{name}}")).toEqual(["name", "code"]);
  });
  it("returns an empty list when there are none", () => {
    expect(extractPlaceholders("Your package shipped.")).toEqual([]);
  });
});

describe("checkVariableValue", () => {
  it.each(["Alice", "123456", "Order #A-77", "12.50", "Dec 3, 10:00", "o'brien"])("allows %s", (v) => {
    expect(checkVariableValue(v)).toBeNull();
  });

  it.each([
    "http://evil.example",
    "https://bit.ly/x",
    "visit www.evil.com now",
    "evil.co/login",
    "go to mybank-secure.com",
    "bit.ly",
    "HTTPS://EVIL.EXAMPLE",
  ])("rejects link-like value %s", (v) => {
    expect(checkVariableValue(v)).toMatch(/link/);
  });

  it("rejects line breaks, braces, and overlong values", () => {
    expect(checkVariableValue("a\nb")).toMatch(/line break/);
    expect(checkVariableValue("{{other}}")).toMatch(/braces/);
    expect(checkVariableValue("x".repeat(65))).toMatch(/longer/);
  });
});

describe("renderBody", () => {
  it("substitutes declared placeholders", () => {
    expect(renderBody("Hi {{name}}, code {{ code }}", ["name", "code"], { name: "Al", code: "4821" })).toBe(
      "Hi Al, code 4821",
    );
  });

  it("throws on missing variables", () => {
    expect(() => renderBody("Hi {{name}}", ["name"], {})).toThrow(BadRequestError);
  });

  it("does not treat inherited object keys as provided", () => {
    expect(() => renderBody("{{constructor}}", ["constructor"], {})).toThrow(/Missing/);
  });

  it("blocks smuggling a link through an approved template", () => {
    expect(() =>
      renderBody("Your code is {{code}}", ["code"], { code: "expired, verify at http://evil.example" }),
    ).toThrow(/Invalid template variables: code \(contains a link/);
  });
});
