from fastapi import HTTPException


class ModelNotLoadedError(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=503,
            detail=(
                "ML model not loaded. "
                "Please run the Jupyter notebooks first to generate model artifacts."
            ),
        )


class FileTooLargeError(HTTPException):
    def __init__(self, max_mb: int) -> None:
        super().__init__(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {max_mb} MB.",
        )


class UnsupportedFileTypeError(HTTPException):
    def __init__(self, filename: str) -> None:
        super().__init__(
            status_code=415,
            detail=(
                f"Unsupported file type: '{filename}'. "
                "Please upload a PDF, DOCX, or TXT file."
            ),
        )
