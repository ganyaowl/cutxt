import csv
import tempfile
import unittest
from pathlib import Path

from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression

from ml.train import train_from_csv


class TrainFromCsvTests(unittest.TestCase):
    def write_dataset(self, rows: list[tuple[str, str]]) -> str:
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "train.csv"
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["text", "label"])
            writer.writerows(rows)
        return str(path)

    def test_calibration_cv_is_capped_by_smallest_class(self) -> None:
        rows = [
            ("economy budget market taxes", "economy"),
            ("economy inflation investments", "economy"),
            ("economy bank finance growth", "economy"),
            ("economy export import business", "economy"),
            ("economy company startup market", "economy"),
            ("sports team player coach", "sports"),
            ("sports football league score", "sports"),
            ("sports olympic medals match", "sports"),
            ("sports tennis grand slam", "sports"),
            ("sports athlete training stadium", "sports"),
            ("tech ai machine learning", "tech"),
            ("tech gadgets mobile apps", "tech"),
        ]
        csv_path = self.write_dataset(rows)

        pipe, meta = train_from_csv(csv_path)

        self.assertTrue(meta["calibrated"])
        self.assertEqual(meta["calibration_cv"], 2)
        self.assertEqual(meta["min_samples_per_label"], 2)
        self.assertIsInstance(pipe.named_steps["clf"], CalibratedClassifierCV)

    def test_training_falls_back_to_plain_lr_when_a_class_has_one_sample(self) -> None:
        rows = [
            ("economy budget market taxes", "economy"),
            ("economy inflation investments", "economy"),
            ("economy bank finance growth", "economy"),
            ("economy export import business", "economy"),
            ("economy company startup market", "economy"),
            ("sports team player coach", "sports"),
            ("sports football league score", "sports"),
            ("sports olympic medals match", "sports"),
            ("sports tennis grand slam", "sports"),
            ("sports athlete training stadium", "sports"),
            ("tech ai machine learning", "tech"),
        ]
        csv_path = self.write_dataset(rows)

        pipe, meta = train_from_csv(csv_path)

        self.assertFalse(meta["calibrated"])
        self.assertIsNone(meta["calibration_cv"])
        self.assertEqual(meta["min_samples_per_label"], 1)
        self.assertIsInstance(pipe.named_steps["clf"], LogisticRegression)


if __name__ == "__main__":
    unittest.main()
