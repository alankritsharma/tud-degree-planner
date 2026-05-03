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

MODULE_NAME_CORRECTIONS = {
    "20-00-1017": "Scalable Data Management Systems",
    "20-00-1075": "Distributed Geometry Processing",
    "20-00-0677": "Computer-aided Planning and Navigation in Medicine",
}

SECTION_NAME_CORRECTIONS = {
    "Software&Hardware": "Software & Hardware",
    "DataScienceApplications": "Data Science Applications",
    "DataSystemsEngineering": "Data Systems Engineering",
    "FoundationsOfDataScience": "Foundations of Data Science",
    "FoundationsofDataScience": "Foundations of Data Science",
}

READABILITY_REPLACEMENTS = [
    (r"\b1Term\b", "1 Term"),
    (r"\bEvery2\.\s*Semester\b", "Every 2. Semester"),
    (r"\bThiscourse\b", "This course"),
    (r"\bThefocus\b", "The focus"),
    (r"\bTopicsinclude\b", "Topics include"),
    (r"\bAfterthecourse\b", "After the course"),
    (r"\bAfterthe\b", "After the"),
    (r"\bThestudent\b", "The student"),
    (r"\bThestudents\b", "The students"),
    (r"\bThemaingoal\b", "The main goal"),
    (r"\bProgrammingin\b", "Programming in"),
    (r"\bPassexam\b", "Pass exam"),
    (r"\bCourserelatedexam\b", "Course related exam"),
    (r"\bMaybeused\b", "May be used"),
    (r"\bofthemodule\b", "of the module"),
    (r"\bPrerequisiteforparticipation\b", "Prerequisite for participation"),
    (r"\bFormofexamination\b", "Form of examination"),
    (r"\bscalabledatamanagement\b", "scalable data management"),
    (r"\bDatabaseArchitectures\b", "Database Architectures"),
    (r"\bParallelandDistributedDatabases\b", "Parallel and Distributed Databases"),
    (r"\bDataWarehousing\b", "Data Warehousing"),
    (r"\bNoSQLDatabases\b", "NoSQL Databases"),
    (r"\bStreamProcessing\b", "Stream Processing"),
    (r"\bGraphDatabases\b", "Graph Databases"),
    (r"\bScalableMachineLearning\b", "Scalable Machine Learning"),
    (r"\bandthe\b", "and the"),
    (r"\binthe\b", "in the"),
    (r"\bforthe\b", "for the"),
]

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


def clean_block_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"\n?<<<PAGE:\d+>>>\n?", "\n", value)
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


def normalize_section_name(section: str | None) -> str | None:
    if not section:
        return None
    normalized = section
    for raw, cleaned in SECTION_NAME_CORRECTIONS.items():
        normalized = normalized.replace(raw, cleaned)
    return clean_text(normalized)


def normalize_module_name(module_code: str | None, module_name: str | None) -> str | None:
    if not module_name:
        return None
    if module_code and module_code in MODULE_NAME_CORRECTIONS:
        return MODULE_NAME_CORRECTIONS[module_code]

    normalized = module_name
    normalized = re.sub(
        r"(?<=[A-Za-z])(of|for|and|in|to|with|the)(?=[A-Z])",
        r" \1 ",
        normalized,
    )
    normalized = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", normalized)
    normalized = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", normalized)
    normalized = re.sub(r"(?<=[A-Za-z])(?=[IVX]+$)", " ", normalized)
    normalized = re.sub(r"(?<=-)(?=[A-Z])", "", normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)
    return clean_text(normalized)


def normalize_person_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value
    normalized = re.sub(r"(?<=[a-zäöüß])(?=[A-ZÄÖÜ])", " ", normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)
    return clean_text(normalized)


def normalize_readability(value: str) -> str:
    if not value:
        return ""
    normalized = value
    for pattern, replacement in READABILITY_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)
    return clean_text(normalized)


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


def extract_numbered_sections(block: str) -> dict[str, str]:
    labels = [
        ("teachingContent", r"2\s+Teachingcontent"),
        ("learningObjectives", r"3\s+Learningobjectives"),
        ("prerequisites", r"4\s+Prerequisiteforparticipation"),
        ("examForm", r"5\s+Formofexamination"),
        (
            "creditRequirement",
            r"6\s+Prerequisitefortheawardofcreditpoints",
        ),
        ("grading", r"7\s+Grading"),
        ("usability", r"8\s+Usabilityofthemodule"),
        ("references", r"9\s+References"),
        ("comment", r"10\s+Comment"),
    ]
    text = clean_block_text(block)
    matches = []
    for key, pattern in labels:
        match = re.search(rf"(?:^|\n)({pattern})\s*\n?", text)
        if match:
            matches.append((match.start(1), match.end(1), key))
    matches.sort(key=lambda item: item[0])

    sections: dict[str, str] = {}
    for index, (start, end, key) in enumerate(matches):
        next_start = matches[index + 1][0] if index + 1 < len(matches) else len(text)
        body = clean_text(text[end:next_start])
        sections[key] = body
    return sections


def split_lines(value: str) -> list[str]:
    if not value:
        return []
    cleaned_lines = []
    for line in value.splitlines():
        normalized = normalize_readability(clean_text(line))
        if not normalized or re.fullmatch(r"\d+", normalized):
            continue
        cleaned_lines.append(normalized)
    return cleaned_lines


def clean_multiline_field(value: str) -> str:
    if not value:
        return ""
    return "\n".join(split_lines(value))


def detect_numbered_heading_leak(value: str) -> bool:
    if not value:
        return False
    return bool(
        re.search(
            r"(?:^|\n)(?:4\s+Prerequisiteforparticipation|5\s+Formofexamination|6\s+Prerequisitefortheawardofcreditpoints|7\s+Grading|8\s+Usabilityofthemodule|9\s+References|10\s+Comment)",
            value,
        )
    )


def merged_text_likely(value: str) -> bool:
    if not value:
        return False
    suspicious_phrases = [
        "Thiscourse",
        "Afterthe",
        "ofthe",
        "andthe",
        "inthe",
        "forthe",
        "Programmingin",
        "Maybeused",
        "Courserelatedexam",
        "Passexam",
    ]
    if any(phrase in value for phrase in suspicious_phrases):
        return True
    if re.search(r"\b[A-Za-z]{20,}\b", value):
        return True
    if re.search(r"\b[a-z]+[A-Z][A-Za-z]+\b", value):
        return True
    return False


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
        section = normalize_section_name(section)

        raw_module_name = parse_module_name(block)

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
                language = normalize_readability(clean_text(lang_owner_line[: owner_start.start()]))
                module_owner = normalize_person_name(clean_text(lang_owner_line[owner_start.start() :]))
            else:
                language = normalize_readability(clean_text(lang_owner_line))

        numbered_sections = extract_numbered_sections(block)
        learning_objectives = clean_multiline_field(numbered_sections.get("learningObjectives", ""))
        prerequisites = clean_multiline_field(numbered_sections.get("prerequisites", ""))
        exam_form = clean_multiline_field(numbered_sections.get("examForm", ""))
        credit_requirement = clean_multiline_field(numbered_sections.get("creditRequirement", ""))
        grading = clean_multiline_field(numbered_sections.get("grading", ""))
        teaching_content = split_lines(numbered_sections.get("teachingContent", ""))
        usability = split_lines(numbered_sections.get("usability", ""))
        references = split_lines(numbered_sections.get("references", ""))
        comment = clean_multiline_field(numbered_sections.get("comment", ""))

        learning_objectives = normalize_readability(learning_objectives)
        prerequisites = normalize_readability(prerequisites)
        exam_form = normalize_readability(exam_form)
        credit_requirement = normalize_readability(credit_requirement)
        grading = normalize_readability(grading)
        comment = normalize_readability(comment)

        normalized_module_name = normalize_module_name(module_code, raw_module_name)
        warnings: list[str] = []
        changed_by_cleanup = normalized_module_name != raw_module_name
        if normalized_module_name and " " not in normalized_module_name and len(normalized_module_name) > 20:
            warnings.append("merged-looking-module-name")
        if "Prerequisiteforparticipation" in learning_objectives:
            warnings.append("learning-objectives-contains-prerequisite-heading")
        if "Formofexamination" in learning_objectives:
            warnings.append("learning-objectives-contains-exam-heading")
        leaked_fields = []
        for field_name, field_value in [
            ("learningObjectives", learning_objectives),
            ("teachingContent", "\n".join(teaching_content)),
            ("prerequisites", prerequisites),
            ("examForm", exam_form),
            ("grading", grading),
            ("usability", "\n".join(usability)),
            ("references", "\n".join(references)),
            ("comment", comment),
        ]:
            if detect_numbered_heading_leak(field_value):
                leaked_fields.append(field_name)
        if leaked_fields:
            warnings.append(f"numbered-heading-leak:{','.join(leaked_fields)}")

        merged_problem_fields = []
        for field_name, field_value in [
            ("moduleDuration", clean_text(duration_match.group(1)) if duration_match else ""),
            ("moduleCycle", clean_text(cycle_match.group(1)).replace("Every2.", "Every 2.") if cycle_match else ""),
            ("moduleOwner", module_owner or ""),
            ("learningObjectives", learning_objectives),
            ("prerequisites", prerequisites),
            ("examForm", exam_form),
            ("creditRequirement", credit_requirement),
            ("grading", grading),
            ("comment", comment),
            ("teachingContent", "\n".join(teaching_content)),
            ("usability", "\n".join(usability)),
            ("references", "\n".join(references)),
        ]:
            if merged_text_likely(field_value):
                merged_problem_fields.append(field_name)
        if merged_problem_fields:
            warnings.append(f"merged-text-likely:{','.join(merged_problem_fields)}")

        extraction_quality = "clean"
        if any(w.startswith("merged-text-likely:") or w.startswith("numbered-heading-leak:") for w in warnings):
            extraction_quality = "needs-review"
        elif warnings:
            extraction_quality = "partially-cleaned"
        elif changed_by_cleanup:
            extraction_quality = "partially-cleaned"

        module_duration = normalize_readability(clean_text(duration_match.group(1)) if duration_match else "")
        module_cycle = normalize_readability(
            clean_text(cycle_match.group(1)).replace("Every2.", "Every 2.") if cycle_match else ""
        )

        module = {
            "moduleCode": module_code,
            "moduleName": normalized_module_name or None,
            "section": section,
            "creditPoints": credit_points,
            "workloadHours": workload_hours,
            "selfStudyHours": self_study_hours,
            "moduleDuration": module_duration or None,
            "moduleCycle": module_cycle or None,
            "language": language,
            "moduleOwner": module_owner,
            "courses": [],
            "teachingContent": teaching_content,
            "learningObjectives": learning_objectives,
            "prerequisites": prerequisites,
            "examForm": exam_form,
            "creditRequirement": credit_requirement,
            "grading": grading,
            "usability": usability,
            "references": references,
            "comment": comment,
            "sourcePages": page_nums,
            "metadataStatus": "pdfplumber-extracted",
            "extractionWarnings": warnings,
            "extractionQuality": extraction_quality,
            "originalExtractedModuleName": raw_module_name or None,
            "rawBlockText": clean_block_text(block),
            "sourcePdf": SOURCE_PDF_NAME,
        }

        modules.append(module)

    manual_review_modules = []
    for module in modules:
        if module.get("moduleCode"):
            continue
        recovered_code = recover_module_code(
            full_text,
            module.get("originalExtractedModuleName") or module.get("moduleName") or "",
        )
        if recovered_code:
            module["moduleCode"] = recovered_code
            module["extractionWarnings"].append("module-code-recovered-from-global-search")
            if module["extractionQuality"] == "clean":
                module["extractionQuality"] = "partially-cleaned"
            continue

        module["moduleCode"] = None
        module["metadataStatus"] = "needs-manual-review"
        module["extractionWarnings"].append("missing-module-code")
        module["extractionQuality"] = "needs-review"
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
    problematic_fields = []
    for module in modules:
        for field_name, field_value in [
            ("moduleName", module.get("moduleName") or ""),
            ("moduleOwner", module.get("moduleOwner") or ""),
            ("moduleDuration", module.get("moduleDuration") or ""),
            ("moduleCycle", module.get("moduleCycle") or ""),
            ("learningObjectives", module.get("learningObjectives") or ""),
            ("prerequisites", module.get("prerequisites") or ""),
            ("examForm", module.get("examForm") or ""),
            ("creditRequirement", module.get("creditRequirement") or ""),
            ("grading", module.get("grading") or ""),
            ("teachingContent", "\n".join(module.get("teachingContent") or [])),
            ("usability", "\n".join(module.get("usability") or [])),
            ("references", "\n".join(module.get("references") or [])),
        ]:
            if merged_text_likely(field_value):
                problematic_fields.append(
                    {
                        "moduleCode": module.get("moduleCode"),
                        "field": field_name,
                        "preview": field_value[:160],
                    }
                )
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
        "modulesWithMergedLookingNames": sum(
            1 for m in modules if "merged-looking-module-name" in m.get("extractionWarnings", [])
        ),
        "fieldsWithMergedTextLikely": len(problematic_fields),
        "modulesWithMergedTextLikely": len(
            {
                module.get("moduleCode") or module.get("originalExtractedModuleName")
                for module in modules
                if any(w.startswith("merged-text-likely:") for w in module.get("extractionWarnings", []))
            }
        ),
        "modulesWithLearningObjectiveHeadingLeaks": sum(
            1
            for m in modules
            if (
                "learning-objectives-contains-prerequisite-heading" in m.get("extractionWarnings", [])
                or "learning-objectives-contains-exam-heading" in m.get("extractionWarnings", [])
            )
        ),
        "modulesMarkedNeedsReview": sum(1 for m in modules if m.get("extractionQuality") == "needs-review"),
        "needsReviewCount": sum(1 for m in modules if m.get("extractionQuality") == "needs-review"),
        "duplicateModuleCodes": dup_codes,
        "sampleProblematicFields": problematic_fields[:10],
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
