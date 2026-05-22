import re
from typing import Optional

# fmt: off
TECH_SKILLS: list[str] = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "sql", "nosql",
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "react",
    "angular", "vue", "node.js", "express", "django", "flask", "fastapi",
    "spring", "docker", "kubernetes", "aws", "azure", "gcp", "terraform",
    "jenkins", "git", "ci/cd", "machine learning", "deep learning", "nlp",
    "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
    "pandas", "numpy", "spark", "hadoop", "kafka", "airflow", "dbt",
    "tableau", "power bi", "excel", "linux", "bash", "rest api", "graphql",
    "microservices", "agile", "scrum", "jira", "figma", "selenium",
    "pytest", "junit", "data engineering", "data science", "llm",
    "hugging face", "langchain", "openai", "embeddings", "vector database",
]
# fmt: on

_PATTERNS: Optional[list[tuple[str, re.Pattern]]] = None


def _get_patterns() -> list[tuple[str, re.Pattern]]:
    global _PATTERNS
    if _PATTERNS is None:
        _PATTERNS = [
            (skill, re.compile(r"\b" + re.escape(skill) + r"\b", re.IGNORECASE))
            for skill in TECH_SKILLS
        ]
    return _PATTERNS


def extract_skills(text: str) -> list[str]:
    found: list[str] = []
    for skill, pattern in _get_patterns():
        if pattern.search(text):
            found.append(skill)
    return found
