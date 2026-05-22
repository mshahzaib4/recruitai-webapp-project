from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="Full job description text")
    top_k: int = Field(10, ge=1, le=50, description="Number of top candidates to return")


class CandidateResult(BaseModel):
    rank: int
    score: float
    category: str
    snippet: str


class MatchResponse(BaseModel):
    results: list[CandidateResult]
    jd_skills: list[str]
    total: int
