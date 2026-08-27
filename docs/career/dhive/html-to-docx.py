#!/usr/bin/env python3
"""Render resume-dhive.html into an ATS-safe .docx.

The HTML is the single source of truth; this script only translates it. LibreOffice's
own HTML->DOCX filter was tried first and produced a 3-page file with substituted fonts
and collapsed right-aligned tabs, so the OOXML is written directly instead.

    python3 docs/career/dhive/html-to-docx.py <input.html> <output.docx>
"""
import sys, zipfile
from html.parser import HTMLParser
from xml.sax.saxutils import escape

# --- page geometry (twips) -------------------------------------------------
PAGE_W, PAGE_H = 11906, 16838          # A4
MARGIN_X, MARGIN_TOP, MARGIN_BOT = 737, 680, 680
RIGHT_TAB = PAGE_W - 2 * MARGIN_X      # right-aligned tab stop for dates / links

NAVY = "1F3864"
LINK = "1155CC"
GREY = "444444"

BLOCK_TAGS = {"h1", "h2", "h3", "p", "li"}
INLINE_BOLD = {"b", "strong"}


class Run:
    __slots__ = ("text", "bold", "italic", "href", "right")

    def __init__(self, text, bold=False, italic=False, href=None, right=False):
        self.text, self.bold, self.italic, self.href, self.right = (
            text, bold, italic, href, right)


class Block:
    def __init__(self, tag, cls):
        self.tag, self.cls, self.runs = tag, cls, []


class ResumeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.cur = [], None
        self.bold = self.italic = self.right = 0
        self.href = None
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "style":
            self.in_style = True
        elif tag in BLOCK_TAGS:
            self.cur = Block(tag, a.get("class", ""))
            self.blocks.append(self.cur)
        elif tag in INLINE_BOLD:
            self.bold += 1
        elif tag in ("i", "em"):
            self.italic += 1
        elif tag == "a":
            self.href = a.get("href")
        elif tag == "span" and "right" in a.get("class", ""):
            self.right += 1
            if self.cur is not None:
                self.cur.runs.append(Run("\t"))

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False
        elif tag in BLOCK_TAGS:
            self.cur = None
        elif tag in INLINE_BOLD:
            self.bold = max(0, self.bold - 1)
        elif tag in ("i", "em"):
            self.italic = max(0, self.italic - 1)
        elif tag == "a":
            self.href = None
        elif tag == "span" and self.right:
            self.right -= 1

    def handle_data(self, data):
        if self.in_style or self.cur is None:
            return
        text = " ".join(data.split())
        if not text:
            return
        # Collapse runs of whitespace but keep the single spaces that sit either side
        # of an inline tag, or "on <b>AWS</b>" comes out as "onAWS".
        if data[:1].isspace() and self.cur.runs:
            text = " " + text
        if data[-1:].isspace():
            text = text + " "
        self.cur.runs.append(
            Run(text, bool(self.bold), bool(self.italic), self.href, bool(self.right)))


# --- OOXML emitters --------------------------------------------------------
def rpr(sz, bold=False, italic=False, color=None, caps=False, spacing=None):
    p = ['<w:rPr>', '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>']
    if bold:
        p.append('<w:b/><w:bCs/>')
    if italic:
        p.append('<w:i/><w:iCs/>')
    if caps:
        p.append('<w:caps/>')
    if spacing is not None:
        p.append(f'<w:spacing w:val="{spacing}"/>')
    if color:
        p.append(f'<w:color w:val="{color}"/>')
    p.append(f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>')
    p.append('</w:rPr>')
    return "".join(p)


def run_xml(run, sz, base_color=None, base_italic=False, right_sz=None,
            base_bold=False):
    if run.text == "\t":
        return f'<w:r>{rpr(sz)}<w:tab/></w:r>'
    size = right_sz if (run.right and right_sz) else sz
    color = LINK if run.href else base_color
    bold = run.bold or (base_bold and not run.right)
    return (f'<w:r>{rpr(size, bold, run.italic or base_italic, color)}'
            f'<w:t xml:space="preserve">{escape(run.text)}</w:t></w:r>')


def ppr(spacing_before=0, spacing_after=0, border=False, ind=None, numbered=False,
        tabs=False, keep_next=False):
    p = ['<w:pPr>']
    if numbered:
        p.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')
    if border:
        p.append(f'<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" '
                 f'w:color="{NAVY}"/></w:pBdr>')
    if tabs:
        p.append(f'<w:tabs><w:tab w:val="right" w:pos="{RIGHT_TAB}"/></w:tabs>')
    if ind:
        p.append(f'<w:ind w:left="{ind[0]}" w:hanging="{ind[1]}"/>')
    p.append(f'<w:spacing w:before="{spacing_before}" w:after="{spacing_after}" '
             f'w:line="240" w:lineRule="auto"/>')
    if keep_next:
        p.append('<w:keepNext/>')
    p.append('</w:pPr>')
    return "".join(p)


def build_body(blocks):
    out = []
    for b in blocks:
        has_tab = any(r.text == "\t" for r in b.runs)
        if b.tag == "h1":
            out.append(f'<w:p>{ppr(0, 20)}' +
                       "".join(f'<w:r>{rpr(40, True, color="000000", spacing=8)}'
                               f'<w:t xml:space="preserve">{escape(r.text)}</w:t></w:r>'
                               for r in b.runs) + '</w:p>')
        elif b.tag == "h2":
            out.append(f'<w:p>{ppr(170, 70, border=True, keep_next=True)}' +
                       "".join(f'<w:r>{rpr(21, True, color=NAVY, caps=True, spacing=12)}'
                               f'<w:t xml:space="preserve">{escape(r.text)}</w:t></w:r>'
                               for r in b.runs) + '</w:p>')
        elif b.tag == "h3":
            out.append(f'<w:p>{ppr(100, 15, tabs=has_tab, keep_next=True)}' +
                       "".join(run_xml(r, 20, right_sz=18, base_bold=True)
                               for r in b.runs) + '</w:p>')
        elif b.tag == "li":
            out.append(f'<w:p>{ppr(0, 40, numbered=True, ind=(288, 173))}' +
                       "".join(run_xml(r, 19) for r in b.runs) + '</w:p>')
        elif b.tag == "p":
            if "title" in b.cls:
                sz, col, ital, after = 21, NAVY, False, 40
            elif "contact" in b.cls:
                sz, col, ital, after = 18, "000000", False, 20
            elif "stack" in b.cls:
                sz, col, ital, after = 18, GREY, True, 30
            elif "edu" in b.cls:
                sz, col, ital, after = 19, "000000", False, 30
            else:
                sz, col, ital, after = 19, "000000", False, 60
            out.append(f'<w:p>{ppr(0, after, tabs=has_tab)}' +
                       "".join(run_xml(r, sz, col, ital, right_sz=18) for r in b.runs) +
                       '</w:p>')
    out.append(f'<w:sectPr><w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}"/>'
               f'<w:pgMar w:top="{MARGIN_TOP}" w:right="{MARGIN_X}" '
               f'w:bottom="{MARGIN_BOT}" w:left="{MARGIN_X}" w:header="0" w:footer="0" '
               f'w:gutter="0"/><w:cols w:space="708"/></w:sectPr>')
    return "".join(out)


DOC_TMPL = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<w:body>{}</w:body></w:document>')

CONTENT_TYPES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                 '<Default Extension="xml" ContentType="application/xml"/>'
                 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                 '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                 '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
                 '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                 '</Types>')

ROOT_RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
             '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
             '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
             '</Relationships>')

DOC_RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
            '</Relationships>')

STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
          '<w:docDefaults><w:rPrDefault><w:rPr>'
          '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
          '<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:rPrDefault>'
          '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>'
          '</w:pPr></w:pPrDefault></w:docDefaults>'
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
          '<w:name w:val="Normal"/><w:qFormat/></w:style>'
          '<w:style w:type="paragraph" w:styleId="ListParagraph">'
          '<w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/></w:style>'
          '</w:styles>')

NUMBERING = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
             '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>'
             '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>'
             '<w:lvlText w:val="•"/><w:lvlJc w:val="left"/>'
             '<w:pPr><w:ind w:left="288" w:hanging="173"/></w:pPr>'
             '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>'
             '</w:lvl></w:abstractNum>'
             '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>')

CORE = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:title>Shivam Gupta — Resume</dc:title>'
        '<dc:creator>Shivam Gupta</dc:creator>'
        '<cp:lastModifiedBy>Shivam Gupta</cp:lastModifiedBy></cp:coreProperties>')


def main():
    src, dst = sys.argv[1], sys.argv[2]
    parser = ResumeParser()
    parser.feed(open(src, encoding="utf-8").read())
    document = DOC_TMPL.format(build_body(parser.blocks))

    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", ROOT_RELS)
        z.writestr("docProps/core.xml", CORE)
        z.writestr("word/document.xml", document)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)
        z.writestr("word/styles.xml", STYLES)
        z.writestr("word/numbering.xml", NUMBERING)
    print(f"wrote {dst}")


if __name__ == "__main__":
    main()
