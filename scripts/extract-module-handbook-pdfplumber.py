#!/usr/bin/env python3
import json
import re
from collections import Counter
from pathlib import Path

import pdfplumber


PDF_PATH = Path("/Users/alankritsharma/Downloads/2023_05_11_MHB_MSC_CS.pdf")
OUT_DIR = Path("/Users/alankritsharma/tud/sem4/mastermap/data/raw")
OUT_TXT = OUT_DIR / "module-handbook-pdfplumber.txt"
OUT_JSON = OUT_DIR / "module-handbook-pdfplumber.json"
OUT_VALIDATION = OUT_DIR / "module-handbook-validation.json"
OUT_MANUAL_REVIEW = OUT_DIR / "module-handbook-manual-review.json"

SOURCE_PDF_NAME = "2023_05_11_MHB_MSC_CS.pdf"

SECTION_HEADINGS = [
    "Software & Hardware",
    "Theory",
    "Foundations of Data Science",
    "Data Systems Engineering",
    "Data Science Applications",
    "Seminars",
    "Labs / Project Labs",
    "General Education",
]


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def parse_number(value: str | None):
    if not value:
        return None
    m = re.search(r"(\d+(?:[.,]\d+)?)", value)
    if not m:
        return None
    n = m.group(1).replace(",", ".")
    try:
        return int(float(n))
    except ValueError:
        return None


def extract_field(block: str, label_patterns: list[str], next_labels: list[str]) -> str:
    label_alt = "|".join(label_patterns)
    next_alt = "|".join(next_labels)
    pattern = re.compile(
        rf"(?:{label_alt})\s*:?\s*(.*?)(?=\n(?:{next_alt})\s*:|\Z)",
        re.IGNORECASE | re.DOTALL,
    )
    m = pattern.search(block)
    if not m:
        return ""
    return clean_text(m.group(1))


def section_markers(full_text: str) -> list[tuple[int, str]]:
    patterns = [
        (r"1\.1\.1\.1\s+SoftwareandHardware", "Software & Hardware"),
        (r"1\.1\.1\.2\s+Theory", "Theory"),
        (r"1\.1\.2\.2\s+FoundationsofDataScience", "Foundations of Data Science"),
        (r"1\.1\.2\.3\s+DataSystemsEngineering", "Data Systems Engineering"),
        (r"1\.1\.2\.4\s+DataScienceApplications", "Data Science Applications"),
        (r"1\.1\.2\.\d+\s+Seminars", "Seminars"),
        (r"1\.1\.2\.\d+\s+Labs,ProjectLabs,RelatedCourses", "Labs / Project Labs"),
        (r"1\.2\s+Studium\s*Generale", "General Education"),
    ]
    markers: list[tuple[int, str]] = []
    for pat, label in patterns:
        for m in re.finditer(pat, full_text):
            markers.append((m.start(), label))
    markers.sort(key=lambda x: x[0])
    return markers


def parse_module_name(block: str) -> str:
    m = re.search(
        r"(?:Module\s*name|Modulename)\s*\n(.*?)\n(?:Module\s*nr\.|Module\s*no\.|Modulenr\.)",
        block,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return ""
    return clean_text(m.group(1))


def line_after(block: str, header_pattern: str) -> str:
    lines = block.splitlines()
    for i, line in enumerate(lines):
        if re.search(header_pattern, line, flags=re.IGNORECASE):
            for j in range(i + 1, min(i + 6, len(lines))):
                candidate = clean_text(lines[j])
                if not candidate or candidate.startswith("<<<PAGE:"):
                    continue
                return candidate
    return ""


def snippet_for_pages(full_text: str, pages: list[int], max_chars: int = 1800) -> str:
    chunks = []
    for pg in pages:
        marker = f"<<<PAGE:{pg}>>>"
        idx = full_text.find(marker)
        if idx == -1:
            continue
        next_idx = full_text.find(f"<<<PAGE:{pg + 1}>>>", idx + 1)
        if next_idx == -1:
            next_idx = min(len(full_text), idx + max_chars)
        chunks.append(full_text[idx:next_idx][:max_chars])
    return "\n\n".join(chunks)


def recover_module_code(full_text: str, module_name: str) -> str | None:
    if not module_name:
        return None

    patterns = [
        re.compile(
            rf"Modulename\s*\n{re.escape(module_name)}\s*\nModulenr\.[^\n]*\n((?:20|18)-[A-Za-z0-9]{{2}}-[A-Za-z0-9]{{3,}})",
            re.DOTALL,
        ),
        re.compile(
            rf"{re.escape(module_name)}.{{0,400}}?((?:20|18)-[A-Za-z0-9]{{2}}-[A-Za-z0-9]{{3,}})",
            re.DOTALL,
        ),
    ]

    for pattern in patterns:
        match = pattern.search(full_text)
        if match:
            return match.group(1)

    return None


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    pages = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append({"page": i, "text": clean_text(text)})

    full_text_parts = [f"<<<PAGE:{p['page']}>>>\n{p['text']}" for p in pages]
    full_text = "\n\n".join(full_text_parts)
    OUT_TXT.write_text(full_text, encoding="utf-8")

    section_positions = section_markers(full_text)

    module_anchor = re.compile(r"\b(?:Module\s*name|Modulename)\b", re.IGNORECASE)
    starts = [m.start() for m in module_anchor.finditer(full_text)]
    modules = []

    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(full_text)
        block = full_text[start:end]

        page_nums = sorted({int(x) for x in re.findall(r"<<<PAGE:(\d+)>>>", block)})

        section = None
        for pos, heading in section_positions:
            if pos <= start:
                section = heading
            else:
                break

        module_name = parse_module_name(block)

        module_data_line = line_after(block, r"(Module\s*nr\.|Module\s*no\.|Modulenr\.)")
        code_match = re.search(r"\b\d{2}-\d{2}-[A-Za-z0-9]{3,}\b", module_data_line)
        module_code = code_match.group(0) if code_match else None

        cp_match = re.search(r"\b\d{2}-\d{2}-[A-Za-z0-9]{3,}\s+(\d+)\s*CP\b", module_data_line)
        cp_alt = re.search(r"\b(\d+)\s*CP\b", module_data_line)
        credit_points = int(cp_match.group(1)) if cp_match else (int(cp_alt.group(1)) if cp_alt else None)

        hours = re.findall(r"(\d+)\s*h\b", module_data_line)
        workload_hours = int(hours[0]) if len(hours) >= 1 else None
        self_study_hours = int(hours[1]) if len(hours) >= 2 else None

        duration_match = re.search(r"(\d+\s*Term)", module_data_line, flags=re.IGNORECASE)
        cycle_match = re.search(r"(Winterterm|Summerterm|Every\s*2\.\s*Semester|Every2\.\s*Semester)", module_data_line, flags=re.IGNORECASE)

        lang_owner_line = line_after(block, r"Language\s+Moduleowner")
        language = None
        module_owner = None
        if lang_owner_line:
            owner_start = re.search(r"\b(Prof\.?|Jun\.?-?Prof\.?)", lang_owner_line)
            if owner_start:
                language = clean_text(lang_owner_line[: owner_start.start()])
                module_owner = clean_text(lang_owner_line[owner_start.start() :])
            else:
                language = clean_text(lang_owner_line)

        learning_objectives = extract_field(
            block,
            ["Learning\\s*objectives", "Learning\\s*outcomes"],
            [
                r"\n4\s+Prerequisiteforparticipation",
                "Prerequisite\\s*for\\s*participation",
                r"\n5\s+Formofexamination",
                "Form\\s*of\\s*examination",
            ],
        )
        prerequisites = extract_field(
            block,
            ["Prerequisite\\s*for\\s*participation"],
            [r"\n5\s+Formofexamination", "Form\\s*of\\s*examination"],
        )
        exam_form = extract_field(
            block,
            ["Form\\s*of\\s*examination"],
            [
                r"\n6\s+Prerequisitefortheawardofcreditpoints",
                "Prerequisite\\s*for\\s*the\\s*award\\s*of\\s*credit\\s*points",
            ],
        )
        credit_requirement = extract_field(
            block,
            ["Prerequisite\\s*for\\s*the\\s*award\\s*of\\s*credit\\s*points"],
            [r"\n7\s+Grading", "Grading"],
        )
        grading = extract_field(
            block,
            ["Grading"],
            [r"\n8\s+Usabilityofthemodule", "Usability\\s*of\\s*the\\s*module"],
        )

        module = {
            "moduleCode": module_code,
            "moduleName": module_name or None,
            "section": section,
            "creditPoints": credit_points,
            "workloadHours": workload_hours,
            "selfStudyHours": self_study_hours,
            "moduleDuration": clean_text(duration_match.group(1)) if duration_match else None,
            "moduleCycle": clean_text(cycle_match.group(1)).replace("Every2.", "Every 2.") if cycle_match else None,
            "language": language,
            "moduleOwner": module_owner,
            "courses": [],
            "teachingContent": [],
            "learningObjectives": learning_objectives,
            "prerequisites": prerequisites,
            "examForm": exam_form,
            "creditRequirement": credit_requirement,
            "grading": grading,
            "usability": [],
            "references": [],
            "comment": extract_field(block, ["Comment"], []),
            "sourcePages": page_nums,
            "metadataStatus": "pdfplumber-extracted",
            "extractionWarnings": [],
            "sourcePdf": SOURCE_PDF_NAME,
        }

        modules.append(module)

    manual_review_modules = []
    for module in modules:
        if module.get("moduleCode"):
            continue
        recovered_code = recover_module_code(full_text, module.get("moduleName") or "")
        if recovered_code:
            module["moduleCode"] = recovered_code
            module["extractionWarnings"].append("module-code-recovered-from-global-search")
            continue

        module["moduleCode"] = None
        module["metadataStatus"] = "needs-manual-review"
        module["extractionWarnings"].append("missing-module-code")
        manual_review_modules.append(
            {
                "moduleName": module.get("moduleName"),
                "section": module.get("section"),
                "creditPoints": module.get("creditPoints"),
                "sourcePages": module.get("sourcePages"),
                "nearbyRawTextSnippet": snippet_for_pages(full_text, module.get("sourcePages") or []),
                "metadataStatus": module.get("metadataStatus"),
                "extractionWarnings": module.get("extractionWarnings"),
            }
        )

    codes = [m["moduleCode"] for m in modules if m.get("moduleCode")]
    dup_codes = sorted([k for k, v in Counter(codes).items() if v > 1])
    summary = {
        "totalPages": len(pages),
        "totalModulesExtracted": len(modules),
        "modulesMissingCode": sum(1 for m in modules if not m.get("moduleCode")),
        "modulesMissingName": sum(1 for m in modules if not m.get("moduleName")),
        "modulesMissingCreditPoints": sum(1 for m in modules if m.get("creditPoints") is None),
        "longModuleNamesCount": sum(
            1 for m in modules if m.get("moduleName") and len(m.get("moduleName", "")) > 120
        ),
        "badCreditPointsCount": sum(
            1
            for m in modules
            if isinstance(m.get("creditPoints"), int) and m.get("creditPoints", 0) > 30
        ),
        "modulesMissingSectionCount": sum(1 for m in modules if not m.get("section")),
        "modulesWithSectionCount": sum(1 for m in modules if m.get("section")),
        "duplicateModuleCodes": dup_codes,
        "firstTenModulesPreview": modules[:10],
        "manualReviewModules": len(manual_review_modules),
        "extractionWarnings": [
            "moduleName length > 120 indicates likely over-capture and should be reviewed.",
            "creditPoints > 30 indicates likely parse error and should be reviewed.",
            "Missing section indicates heading inference needs manual review.",
        ],
    }

    OUT_JSON.write_text(json.dumps(modules, indent=2, ensure_ascii=False), encoding="utf-8")
    OUT_VALIDATION.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    OUT_MANUAL_REVIEW.write_text(
        json.dumps(manual_review_modules, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
