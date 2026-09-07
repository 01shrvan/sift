import { describe, expect, it } from "vitest";
import { documentXmlToText } from "../src/extract/docx.js";

describe("documentXmlToText", () => {
  it("reads one paragraph per line", () => {
    const xml = "<w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p><w:p><w:r><w:t>Engineer</w:t></w:r></w:p>";
    expect(documentXmlToText(xml)).toBe("Jane Doe\nEngineer");
  });

  it("joins split runs inside one paragraph", () => {
    const xml = "<w:p><w:r><w:t>Jane </w:t></w:r><w:r><w:t>Doe</w:t></w:r></w:p>";
    expect(documentXmlToText(xml)).toBe("Jane Doe");
  });

  it("honours preserved whitespace attributes", () => {
    const xml = '<w:p><w:r><w:t xml:space="preserve">Senior </w:t></w:r><w:r><w:t>Engineer</w:t></w:r></w:p>';
    expect(documentXmlToText(xml)).toBe("Senior Engineer");
  });

  it("splits on explicit line breaks", () => {
    const xml = "<w:p><w:r><w:t>one</w:t></w:r><w:br/><w:r><w:t>two</w:t></w:r></w:p>";
    expect(documentXmlToText(xml)).toBe("one\ntwo");
  });

  it("decodes entities including ampersands last", () => {
    const xml = "<w:p><w:r><w:t>R&amp;D &lt;lead&gt;</w:t></w:r></w:p>";
    expect(documentXmlToText(xml)).toBe("R&D <lead>");
  });

  it("drops empty paragraphs", () => {
    const xml = "<w:p></w:p><w:p><w:r><w:t>only</w:t></w:r></w:p><w:p><w:r><w:t>  </w:t></w:r></w:p>";
    expect(documentXmlToText(xml)).toBe("only");
  });

  it("returns empty string when there are no paragraphs", () => {
    expect(documentXmlToText("<w:body></w:body>")).toBe("");
  });
});
