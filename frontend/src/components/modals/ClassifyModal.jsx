import {
  Modal,
  Button,
  Group,
  Stack,
  Select,
  Switch,
  Alert,
  Text,
  SegmentedControl,
} from "@mantine/core";

export function ClassifyModal({
  opened,
  onClose,
  formState,
  setFormState,
  documents,
  databases,
  mlAvailable,
  onSubmit,
  submitting,
  errors,
  onClearError,
}) {
  const docOpts = documents.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));
  const dbOpts = databases.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));
  const isDict = formState.classifyMethod === "dictionary";
  const canClassify = isDict
    ? documents.length > 0 && databases.length > 0
    : documents.length > 0 && mlAvailable;

  return (
    <Modal opened={opened} onClose={onClose} title="Классификация" radius="lg" centered size="md">
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={6}>
            Метод
          </Text>
          <SegmentedControl
            fullWidth
            value={formState.classifyMethod}
            onChange={(v) =>
              setFormState((p) => ({
                ...p,
                classifyMethod: v,
                classifyDbId: v === "dictionary" ? p.classifyDbId : "",
              }))
            }
            data={[
              { label: "Эталон (словарь)", value: "dictionary" },
              { label: "ML", value: "ml" },
            ]}
          />
        </div>
        {isDict && !canClassify && (
          <Alert variant="light" color="orange" title="Недостаточно данных">
            Добавьте хотя бы один документ и одну эталонную базу.
          </Alert>
        )}
        {!isDict && !mlAvailable && (
          <Alert variant="light" color="red" title="ML-модель недоступна">
            На сервере нет активной ML-модели. Сохраните обученную модель в{" "}
            <Text span ff="monospace" size="xs">
              backend/models/transformer_classifier
            </Text>{" "}
            или задайте путь через переменную окружения <Text span ff="monospace" size="xs">ML_MODEL_PATH</Text>, затем
            перезапустите API.
          </Alert>
        )}
        <Select
          label="Документ"
          placeholder="Выберите документ"
          data={docOpts}
          value={formState.classifyDocId || null}
          onChange={(v) => {
            onClearError?.("classifyDoc");
            setFormState((p) => ({ ...p, classifyDocId: v ?? "" }));
          }}
          disabled={documents.length === 0}
          error={errors.classifyDoc}
          searchable
          nothingFoundMessage="Нет документов"
        />
        {isDict && (
          <Select
            label="Эталонная база"
            placeholder="Выберите базу"
            data={dbOpts}
            value={formState.classifyDbId || null}
            onChange={(v) => {
              onClearError?.("classifyDb");
              setFormState((p) => ({ ...p, classifyDbId: v ?? "" }));
            }}
            disabled={databases.length === 0}
            error={errors.classifyDb}
            searchable
            nothingFoundMessage="Нет баз"
          />
        )}
        <Switch
          label="Пересчитать, даже если результат уже есть"
          checked={formState.forceRecompute}
          onChange={(e) =>
            setFormState((p) => ({
              ...p,
              forceRecompute: e.currentTarget.checked,
            }))
          }
        />
        {!isDict && mlAvailable && (
          <Text size="xs" c="dimmed">
            Классы и вероятности зависят от активной обученной ML-модели, загруженной на сервере.
          </Text>
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button
            loading={submitting}
            onClick={onSubmit}
            disabled={!canClassify}
            gradient={{ from: "teal", to: "green" }}
            variant="gradient"
          >
            Классифицировать
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
