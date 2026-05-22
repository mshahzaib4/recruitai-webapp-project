from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MODEL_PATH: str = "models/saved/bert_model"
    EMBEDDINGS_PATH: str = "models/saved/resume_embeddings.pkl"
    DATA_PATH: str = "models/saved/resume_data.pkl"
    MAX_FILE_SIZE_MB: int = 10
    TOP_K_RESULTS: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
