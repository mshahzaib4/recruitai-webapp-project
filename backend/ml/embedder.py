import logging
import os

import httpx
import joblib
import numpy as np

logger = logging.getLogger(__name__)

HF_API_URL = (
        "https://api-inference.huggingface.co/pipeline/feature-extraction"
        "/sentence-transformers/all-MiniLM-L6-v2"
)


class ResumeEmbedder:
        """Loads pre-computed embeddings; calls HF Inference API to embed new text."""

    def __init__(self, model_path: str, embeddings_path: str, data_path: str) -> None:
                logger.info("Loading pre-computed embeddings from %s", embeddings_path)
                self.embeddings: np.ndarray = joblib.load(embeddings_path)

        logger.info("Loading resume data from %s", data_path)
        self.data = joblib.load(data_path)

        self._hf_token: str = os.environ.get("HF_TOKEN", "")

        logger.info(
                        "Ready — %d resumes, embedding shape %s",
                        len(self.data),
                        self.embeddings.shape,
        )

    async def embed(self, text: str) -> np.ndarray:
                headers: dict[str, str] = {}
                if self._hf_token:
                                headers["Authorization"] = f"Bearer {self._hf_token}"

                async with httpx.AsyncClient(timeout=60.0) as client:
                                response = await client.post(
                                                    HF_API_URL,
                                                    json={"inputs": text, "options": {"wait_for_model": True}},
                                                    headers=headers,
                                )
                                response.raise_for_status()

                arr = np.array(response.json(), dtype=np.float32)

        # HF API can return different shapes depending on model/pipeline version:
                # [384] -> sentence embedding, ready to use
                # [[384]] -> batched sentence embedding
                # [seq_len, 384] -> token embeddings, need mean pooling
                # [1, seq_len, 384] -> batched token embeddings, need mean pooling
                if arr.ndim == 1:
                                return arr
                            if arr.ndim == 2 and arr.shape[0] == 1:
                                            return arr[0]
                                        if arr.ndim == 2:
                                                        return arr.mean(axis=0)
                                                    if arr.ndim == 3:
                                                                    return arr[0].mean(axis=0)
                                                                raise ValueError(f"Unexpected embedding shape: {arr.shape}")

    async def embed_batch(self, texts: list[str]) -> np.ndarray:
                """Embed multiple texts concurrently."""
        import asyncio
        embeddings = await asyncio.gather(*[self.embed(t) for t in texts])
        return np.stack(embeddings)
