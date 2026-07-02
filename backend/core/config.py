from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MODEL_PATH: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDINGS_PATH: str = "models/saved/resume_embeddings.pkl"
    DATA_PATH: str = "models/saved/resume_data.pkl"
    MAX_FILE_SIZE_MB: int = 10
    TOP_K_RESULTS: int = 10
    HF_TOKEN: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
