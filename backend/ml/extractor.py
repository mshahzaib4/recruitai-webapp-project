import io
from pathlib import Path

import docx
import pdfplumber


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    if ext == ".docx":
        return _extract_docx(file_bytes)
    if ext == ".txt":
        return file_bytes.decode("utf-8", errors="ignore")

    raise ValueError(
        f"Unsupported file extension '{ext}'. Accepted formats: .pdf, .docx, .txt"
    )


def _extract_pdf(file_bytes: bytes) -> str:
    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
    return "\n".join(parts)


def _extract_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
