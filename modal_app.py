import os
import modal
from pydantic import BaseModel

app = modal.App("velvet-room")

BASE_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
ADAPTER_REPO = "haggie1339/velvet-room"
CACHE_DIR = "/cache"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.3.0+cu121",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "transformers==4.44.2",
        "accelerate",
        "peft",
        "sentencepiece",
        "protobuf",
        "fastapi[standard]",
    )
)

volume = modal.Volume.from_name("velvet-room-weights", create_if_missing=True)


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.7


@app.cls(
    gpu="A10G",
    image=image,
    volumes={CACHE_DIR: volume},
    secrets=[modal.Secret.from_name("velvet_room")],
    timeout=300,
    scaledown_window=60,
)
class Inference:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel

        token = os.environ["HF_TOKEN"]

        self.tokenizer = AutoTokenizer.from_pretrained(
            BASE_MODEL, cache_dir=CACHE_DIR, token=token
        )

        base = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL,
            torch_dtype=torch.float16,
            device_map="auto",
            cache_dir=CACHE_DIR,
            token=token,
        )

        self.model = PeftModel.from_pretrained(base, ADAPTER_REPO, token=token)
        self.model.eval()

    @modal.fastapi_endpoint(method="POST")
    def generate(self, req: GenerateRequest):
        import torch

        inputs = self.tokenizer(req.prompt, return_tensors="pt").to("cuda")

        with torch.inference_mode():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature,
                do_sample=req.temperature > 0,
                repetition_penalty=1.1,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        new_ids = output_ids[0][inputs["input_ids"].shape[1]:]
        text = self.tokenizer.decode(new_ids, skip_special_tokens=True)

        for stop in ["### Instruction:", "\n###"]:
            if stop in text:
                text = text[: text.index(stop)]

        return {"response": text.strip()}
