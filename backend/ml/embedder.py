import logging

import joblib
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class ResumeEmbedder:
    """Singleton-style loader: model and embeddings loaded once at startup."""

    def __init__(self, model_path: str, embeddings_path: str, data_path: str) -> None:
        logger.info("Loading BERT model from %s", model_path)
        self.model = SentenceTransformer(model_path)

        logger.info("Loading pre-computed embeddings from %s", embeddings_path)
        self.embeddings: np.ndarray = joblib.load(embeddings_path)

        logger.info("Loading resume data from %s", data_path)
        self.data = joblib.load(data_path)

        logger.info(
            "Ready — %d resumes, embedding shape %s",
            len(self.data),
            self.embeddings.shape,
        )

    def embed(self, text: str) -> np.ndarray:
        return self.model.encode([text])[0]

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts, show_progress_bar=False)
