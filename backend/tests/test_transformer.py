import csv
import importlib
import json
import math
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import joblib
import numpy as np

from ml.train_transformer import prepare_training_data, save_transformer_metadata


class DummySklearnModel:
    classes_ = ["economy", "sport"]

    def predict_proba(self, texts):
        return [[0.8, 0.2] for _ in texts]


class FakeTorchTensor:
    def __init__(self, values):
        self._values = np.asarray(values, dtype=float)

    def cpu(self):
        return self

    def tolist(self):
        return self._values.tolist()


class FakeNoGrad:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeTorch:
    @staticmethod
    def no_grad():
        return FakeNoGrad()

    @staticmethod
    def softmax(logits, dim=-1):
        arr = np.asarray(logits, dtype=float)
        shifted = arr - arr.max()
        exps = np.exp(shifted)
        probs = exps / exps.sum()
        return FakeTorchTensor(probs)


class FakeTokenizer:
    def __init__(self):
        self.last_call = None

    @classmethod
    def from_pretrained(cls, path):
        instance = cls()
        instance.loaded_from = path
        return instance

    def __call__(self, texts, truncation, max_length, return_tensors):
        self.last_call = {
            "texts": texts,
            "truncation": truncation,
            "max_length": max_length,
            "return_tensors": return_tensors,
        }
        return {"input_ids": [[101, 102]], "attention_mask": [[1, 1]]}


class FakeModelConfig:
    id2label = {0: "technology", 1: "Other"}


class FakeModel:
    config = FakeModelConfig()

    @classmethod
    def from_pretrained(cls, path):
        instance = cls()
        instance.loaded_from = path
        return instance

    def to(self, device):
        self.device = device
        return self

    def eval(self):
        self.evaluated = True
        return self

    def __call__(self, **encoded):
        self.last_encoded = encoded
        return type("FakeOutput", (), {"logits": np.array([[2.5, 0.5]], dtype=float)})()


class TransformerTrainingTests(unittest.TestCase):
    def write_dataset(self, rows):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "train.csv"
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["text", "label"])
            writer.writerows(rows)
        return path

    def test_prepare_training_data_merges_rare_labels_to_other(self):
        rows = []
        rows.extend((f"economy text {idx}", "Economy") for idx in range(10))
        rows.extend((f"sport text {idx}", "Sport") for idx in range(11))
        rows.extend((f"rare text {idx}", "Rare") for idx in range(2))
        csv_path = self.write_dataset(rows)

        prepared = prepare_training_data(str(csv_path))

        self.assertEqual(prepared.label_mapping["Economy"], "Economy")
        self.assertEqual(prepared.label_mapping["Sport"], "Sport")
        self.assertEqual(prepared.label_mapping["Rare"], "Other")
        self.assertEqual(prepared.merged_label_counts["Other"], 2)
        self.assertEqual(prepared.label_names, ["Economy", "Sport", "Other"])

    def test_save_transformer_metadata_writes_meta_and_label_mapping(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            save_transformer_metadata(
                out_dir=tmpdir,
                label_names=["Technology", "Other"],
                label_mapping={"Rare": "Other", "Technology": "Technology"},
                model_name="distilbert-base-multilingual-cased",
                max_length=256,
                rare_label_threshold=10,
                original_label_counts={"Technology": 12, "Rare": 3},
                merged_label_counts={"Technology": 12, "Other": 3},
                train_samples=12,
                validation_samples=2,
                test_samples=2,
                test_metrics={"accuracy": 1.0, "macro_f1": 1.0, "weighted_f1": 1.0, "loss": 0.1},
                confusion_matrix_rows=[[1, 0], [0, 1]],
            )

            meta = json.loads((Path(tmpdir) / "meta.json").read_text(encoding="utf-8"))
            label_mapping = json.loads((Path(tmpdir) / "label_mapping.json").read_text(encoding="utf-8"))
            metrics = json.loads((Path(tmpdir) / "metrics.json").read_text(encoding="utf-8"))

            self.assertEqual(meta["backend"], "transformers")
            self.assertFalse(meta["calibrated"])
            self.assertEqual(meta["rare_label_threshold"], 10)
            self.assertEqual(label_mapping["Rare"], "Other")
            self.assertEqual(metrics["labels"], ["Technology", "Other"])


class MlServiceCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.old_model_path = os.environ.get("ML_MODEL_PATH")

    def tearDown(self):
        if self.old_model_path is None:
            os.environ.pop("ML_MODEL_PATH", None)
        else:
            os.environ["ML_MODEL_PATH"] = self.old_model_path

    def _reload_service(self):
        import ml.service as service_module

        return importlib.reload(service_module)

    def test_load_ml_bundle_supports_sklearn_joblib(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "ml_classifier.joblib"
            joblib.dump({"pipeline": DummySklearnModel(), "version": "legacy-1"}, model_path)
            os.environ["ML_MODEL_PATH"] = str(model_path)

            service = self._reload_service()

            self.assertTrue(service.load_ml_bundle())
            status = service.ml_status()
            self.assertTrue(status["available"])
            self.assertEqual(status["backend"], "sklearn")
            self.assertEqual(status["labels"], ["economy", "sport"])

    def test_transformer_bundle_loads_and_returns_expected_contract(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bundle_dir = Path(tmpdir) / "transformer_classifier"
            bundle_dir.mkdir(parents=True, exist_ok=True)
            (bundle_dir / "meta.json").write_text(
                json.dumps(
                    {
                        "backend": "transformers",
                        "version": "transformer-1.0",
                        "label_names": ["technology", "Other"],
                        "max_length": 256,
                        "calibrated": False,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            os.environ["ML_MODEL_PATH"] = str(bundle_dir)

            service = self._reload_service()
            with mock.patch.object(
                service,
                "_import_transformer_runtime",
                return_value=(FakeTorch, FakeModel, FakeTokenizer),
            ):
                self.assertTrue(service.load_ml_bundle())
                status = service.ml_status()
                self.assertEqual(status["backend"], "transformers")
                self.assertFalse(status["calibrated"])
                self.assertEqual(status["labels"], ["technology", "Other"])

                result = service.classify_ml_text("   GPU  model   check   ")

            self.assertEqual(result["classification_kind"], "ml")
            self.assertEqual(result["predicted_category"], "technology")
            self.assertFalse(result["calibrated"])
            self.assertAlmostEqual(sum(result["all_scores_by_name"].values()), 1.0, places=6)
            self.assertTrue(math.isclose(result["confidence"], result["relative_score_share"]))
            self.assertIn("technology", result["score_shares_by_name"])
            self.assertIn("Other", result["score_shares_by_name"])


if __name__ == "__main__":
    unittest.main()
