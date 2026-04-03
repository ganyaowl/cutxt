"""
Train a transformer text classifier from CSV with columns text,label.

Example:
  cd backend && python -m ml.train_transformer --data data/your_dataset.csv --out-dir models/transformer_classifier
"""

from __future__ import annotations

import argparse
import inspect
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split

from ml.transformer_utils import (
    OTHER_LABEL,
    RARE_LABEL_POLICY,
    RARE_LABEL_THRESHOLD,
    TRANSFORMER_BACKEND,
    TRANSFORMER_MAX_LENGTH,
    TRANSFORMER_MODEL_NAME,
    TRANSFORMER_MODEL_VERSION,
    PreparedTransformerData,
    merge_rare_labels,
    normalize_text_for_transformer,
    ordered_label_names,
)


@dataclass(frozen=True)
class SplitData:
    train_texts: list[str]
    train_labels: list[int]
    val_texts: list[str]
    val_labels: list[int]
    test_texts: list[str]
    test_labels: list[int]


def _require_transformer_training_dependencies():
    try:
        import torch
        from datasets import Dataset
        from transformers import (
            AutoModelForSequenceClassification,
            AutoTokenizer,
            DataCollatorWithPadding,
            EarlyStoppingCallback,
            Trainer,
            TrainingArguments,
        )
    except ImportError as exc:
        raise RuntimeError(
            "Transformer training dependencies are missing. "
            "Install torch, transformers, datasets, accelerate, evaluate, and safetensors."
        ) from exc

    return {
        "torch": torch,
        "Dataset": Dataset,
        "AutoModelForSequenceClassification": AutoModelForSequenceClassification,
        "AutoTokenizer": AutoTokenizer,
        "DataCollatorWithPadding": DataCollatorWithPadding,
        "EarlyStoppingCallback": EarlyStoppingCallback,
        "Trainer": Trainer,
        "TrainingArguments": TrainingArguments,
    }


def prepare_training_data(
    csv_path: str,
    *,
    rare_label_threshold: int = RARE_LABEL_THRESHOLD,
    other_label: str = OTHER_LABEL,
) -> PreparedTransformerData:
    df = pd.read_csv(csv_path, encoding="utf-8")
    if "text" not in df.columns or "label" not in df.columns:
        raise ValueError("CSV must contain columns: text, label")

    df = df.dropna(subset=["text", "label"])
    texts = [normalize_text_for_transformer(str(text)) for text in df["text"]]
    labels = [str(label).strip() for label in df["label"]]
    pairs = [(text, label) for text, label in zip(texts, labels, strict=True) if text.strip()]
    if len(pairs) < 2:
        raise ValueError("Need at least 2 non-empty documents after normalization")

    texts, labels = zip(*pairs, strict=True)
    merged_labels, label_mapping, original_counts, merged_counts = merge_rare_labels(
        list(labels),
        rare_label_threshold=rare_label_threshold,
        other_label=other_label,
    )
    label_names = ordered_label_names(merged_labels, other_label=other_label)
    if len(label_names) < 2:
        raise ValueError("Need at least 2 different labels after rare-label merge")

    return PreparedTransformerData(
        texts=list(texts),
        labels=merged_labels,
        label_names=label_names,
        label_mapping=label_mapping,
        original_label_counts=original_counts,
        merged_label_counts=merged_counts,
    )


def split_training_data(
    prepared: PreparedTransformerData,
    *,
    test_fraction: float = 0.2,
    validation_fraction_of_temp: float = 0.5,
    random_state: int = 42,
) -> tuple[SplitData, dict[str, int], dict[int, str]]:
    label_to_id = {label: idx for idx, label in enumerate(prepared.label_names)}
    encoded_labels = [label_to_id[label] for label in prepared.labels]

    train_texts, temp_texts, train_labels, temp_labels = train_test_split(
        prepared.texts,
        encoded_labels,
        test_size=test_fraction,
        random_state=random_state,
        stratify=encoded_labels,
    )
    val_texts, test_texts, val_labels, test_labels = train_test_split(
        temp_texts,
        temp_labels,
        test_size=validation_fraction_of_temp,
        random_state=random_state,
        stratify=temp_labels,
    )

    return (
        SplitData(
            train_texts=train_texts,
            train_labels=train_labels,
            val_texts=val_texts,
            val_labels=val_labels,
            test_texts=test_texts,
            test_labels=test_labels,
        ),
        label_to_id,
        {idx: label for label, idx in label_to_id.items()},
    )


def _dataset_from_texts(dataset_cls, texts: list[str], labels: list[int]):
    return dataset_cls.from_dict({"text": texts, "labels": labels})


def _tokenize_dataset(dataset, tokenizer, *, max_length: int):
    def tokenize_batch(batch):
        return tokenizer(batch["text"], truncation=True, max_length=max_length)

    tokenized = dataset.map(tokenize_batch, batched=True)
    tensor_columns = ["input_ids", "attention_mask", "labels"]
    if "token_type_ids" in tokenized.column_names:
        tensor_columns.append("token_type_ids")
    tokenized.set_format(type="torch", columns=tensor_columns)
    return tokenized


def _class_weight_tensor(torch_module, labels: list[int], num_labels: int):
    counts = np.bincount(labels, minlength=num_labels).astype(np.float32)
    weights = np.zeros_like(counts, dtype=np.float32)
    nonzero = counts > 0
    weights[nonzero] = counts.sum() / (num_labels * counts[nonzero])
    return torch_module.tensor(weights, dtype=torch_module.float32)


def _compute_eval_metrics(eval_pred) -> dict[str, float]:
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    _, _, macro_f1, _ = precision_recall_fscore_support(
        labels, predictions, average="macro", zero_division=0
    )
    _, _, weighted_f1, _ = precision_recall_fscore_support(
        labels, predictions, average="weighted", zero_division=0
    )
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
    }


def _make_training_arguments(
    training_arguments_cls,
    *,
    output_dir: str,
    random_state: int,
    use_cuda: bool,
):
    kwargs = {
        "output_dir": output_dir,
        "overwrite_output_dir": True,
        "do_train": True,
        "do_eval": True,
        "num_train_epochs": 3,
        "per_device_train_batch_size": 16,
        "per_device_eval_batch_size": 32,
        "learning_rate": 5e-5,
        "save_strategy": "epoch",
        "logging_strategy": "epoch",
        "load_best_model_at_end": True,
        "metric_for_best_model": "weighted_f1",
        "greater_is_better": True,
        "save_total_limit": 1,
        "report_to": [],
        "seed": random_state,
    }
    signature = inspect.signature(training_arguments_cls.__init__)
    if "dataloader_pin_memory" in signature.parameters:
        kwargs["dataloader_pin_memory"] = use_cuda
    if "evaluation_strategy" in signature.parameters:
        kwargs["evaluation_strategy"] = "epoch"
    elif "eval_strategy" in signature.parameters:
        kwargs["eval_strategy"] = "epoch"
    else:
        raise RuntimeError("TrainingArguments does not support eval/evaluation strategy parameter")
    return training_arguments_cls(**kwargs)


def train_transformer_from_csv(
    csv_path: str,
    out_dir: str,
    *,
    model_name: str = TRANSFORMER_MODEL_NAME,
    max_length: int = TRANSFORMER_MAX_LENGTH,
    rare_label_threshold: int = RARE_LABEL_THRESHOLD,
    random_state: int = 42,
) -> dict[str, Any]:
    deps = _require_transformer_training_dependencies()
    torch = deps["torch"]
    dataset_cls = deps["Dataset"]
    auto_model_cls = deps["AutoModelForSequenceClassification"]
    auto_tokenizer_cls = deps["AutoTokenizer"]
    data_collator_cls = deps["DataCollatorWithPadding"]
    early_stopping_callback_cls = deps["EarlyStoppingCallback"]
    trainer_cls = deps["Trainer"]
    training_arguments_cls = deps["TrainingArguments"]

    prepared = prepare_training_data(csv_path, rare_label_threshold=rare_label_threshold)
    split_data, label_to_id, id_to_label = split_training_data(prepared, random_state=random_state)
    use_cuda = bool(torch.cuda.is_available())
    device_label = torch.cuda.get_device_name(0) if use_cuda else "CPU"
    print(f"Training device: {'cuda' if use_cuda else 'cpu'} ({device_label})")

    tokenizer = auto_tokenizer_cls.from_pretrained(model_name)
    model = auto_model_cls.from_pretrained(
        model_name,
        num_labels=len(prepared.label_names),
        id2label=id_to_label,
        label2id=label_to_id,
    )

    train_dataset = _tokenize_dataset(
        _dataset_from_texts(dataset_cls, split_data.train_texts, split_data.train_labels),
        tokenizer,
        max_length=max_length,
    )
    val_dataset = _tokenize_dataset(
        _dataset_from_texts(dataset_cls, split_data.val_texts, split_data.val_labels),
        tokenizer,
        max_length=max_length,
    )
    test_dataset = _tokenize_dataset(
        _dataset_from_texts(dataset_cls, split_data.test_texts, split_data.test_labels),
        tokenizer,
        max_length=max_length,
    )

    class_weights = _class_weight_tensor(torch, split_data.train_labels, len(prepared.label_names))

    class WeightedTrainer(trainer_cls):
        def __init__(self, *args, class_weights=None, **kwargs):
            super().__init__(*args, **kwargs)
            self.class_weights = class_weights

        def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
            labels = inputs.pop("labels")
            outputs = model(**inputs)
            logits = outputs.logits
            loss_fct = torch.nn.CrossEntropyLoss(weight=self.class_weights.to(logits.device))
            loss = loss_fct(logits, labels)
            return (loss, outputs) if return_outputs else loss

    os.makedirs(out_dir, exist_ok=True)
    trainer_output_dir = os.path.join(out_dir, "_trainer")
    args = _make_training_arguments(
        training_arguments_cls,
        output_dir=trainer_output_dir,
        random_state=random_state,
        use_cuda=use_cuda,
    )

    trainer = WeightedTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator_cls(tokenizer=tokenizer),
        compute_metrics=_compute_eval_metrics,
        callbacks=[early_stopping_callback_cls(early_stopping_patience=2)],
        class_weights=class_weights,
    )
    trainer.train()

    prediction_output = trainer.predict(test_dataset)
    test_predictions = np.argmax(prediction_output.predictions, axis=-1)
    labels = np.asarray(split_data.test_labels)
    test_metrics = _compute_eval_metrics((prediction_output.predictions, labels))
    test_metrics["loss"] = float(prediction_output.metrics.get("test_loss", 0.0))
    test_confusion_matrix = confusion_matrix(
        labels,
        test_predictions,
        labels=list(range(len(prepared.label_names))),
    ).tolist()

    trainer.save_model(out_dir)
    tokenizer.save_pretrained(out_dir)
    save_transformer_metadata(
        out_dir=out_dir,
        label_names=prepared.label_names,
        label_mapping=prepared.label_mapping,
        model_name=model_name,
        max_length=max_length,
        rare_label_threshold=rare_label_threshold,
        original_label_counts=prepared.original_label_counts,
        merged_label_counts=prepared.merged_label_counts,
        train_samples=len(split_data.train_texts),
        validation_samples=len(split_data.val_texts),
        test_samples=len(split_data.test_texts),
        test_metrics=test_metrics,
        confusion_matrix_rows=test_confusion_matrix,
    )

    return {
        "label_names": prepared.label_names,
        "train_samples": len(split_data.train_texts),
        "validation_samples": len(split_data.val_texts),
        "test_samples": len(split_data.test_texts),
        "metrics": test_metrics,
    }


def save_transformer_metadata(
    *,
    out_dir: str,
    label_names: list[str],
    label_mapping: dict[str, str],
    model_name: str,
    max_length: int,
    rare_label_threshold: int,
    original_label_counts: dict[str, int],
    merged_label_counts: dict[str, int],
    train_samples: int,
    validation_samples: int,
    test_samples: int,
    test_metrics: dict[str, float],
    confusion_matrix_rows: list[list[int]],
) -> None:
    meta = {
        "backend": TRANSFORMER_BACKEND,
        "version": TRANSFORMER_MODEL_VERSION,
        "base_model_name": model_name,
        "label_names": label_names,
        "rare_label_policy": RARE_LABEL_POLICY,
        "rare_label_threshold": rare_label_threshold,
        "other_label": OTHER_LABEL,
        "max_length": max_length,
        "calibrated": False,
        "train_samples": train_samples,
        "validation_samples": validation_samples,
        "test_samples": test_samples,
        "num_labels": len(label_names),
        "original_label_counts": original_label_counts,
        "merged_label_counts": merged_label_counts,
    }
    metrics = {
        **test_metrics,
        "labels": label_names,
        "confusion_matrix": confusion_matrix_rows,
    }

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    (out_path / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (out_path / "label_mapping.json").write_text(
        json.dumps(label_mapping, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (out_path / "metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train CuTxT transformer classifier (GPU-friendly in Colab)"
    )
    parser.add_argument("--data", required=True, help="Path to CSV (text,label)")
    parser.add_argument("--out-dir", required=True, help="Output directory for model artifacts")
    args = parser.parse_args()

    summary = train_transformer_from_csv(args.data, args.out_dir)
    print(
        "Saved transformer model to "
        f"{os.path.abspath(args.out_dir)} "
        f"({summary['train_samples']} train / {summary['validation_samples']} val / "
        f"{summary['test_samples']} test, metrics={summary['metrics']})"
    )


if __name__ == "__main__":
    main()
