import { Modal, TextInput, Button, Group, Stack, Text, FileButton } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { basenameNoExt } from "../../utils/files.js";

export function DatabaseModal({
  opened,
  onClose,
  formState,
  setFormState,
  onSubmit,
  submitting,
  errors,
  onClearError,
}) {
  const ph = formState.dbFile
    ? basenameNoExt(formState.dbFile)
    : "Выберите файл — имя появится как подсказка";

  return (
    <Modal opened={opened} onClose={onClose} title="Новая эталонная база" radius="lg" centered>
      <Stack gap="md">
        <TextInput
          label="Название в списке"
          placeholder={ph}
          description={
            formState.dbFile
              ? "Пустое поле = использовать подсказку (имя файла без расширения)"
              : "Сначала выберите файл .db / .sqlite"
          }
          value={formState.dbName}
          onChange={(e) => {
            onClearError?.("dbName");
            onClearError?.("dbFile");
            setFormState((p) => ({ ...p, dbName: e.target.value }));
          }}
          error={errors.dbName}
        />
        {errors.dbFile && (
          <Text size="sm" c="red">
            {errors.dbFile}
          </Text>
        )}
        <Group>
          <FileButton
            accept=".db,.sqlite,application/octet-stream"
            onChange={(file) => {
              onClearError?.("dbFile");
              setFormState((p) => ({ ...p, dbFile: file }));
            }}
          >
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={18} />} variant="light">
                Выбрать файл БД
              </Button>
            )}
          </FileButton>
          {formState.dbFile && (
            <Text size="sm" c="dimmed" truncate maw={220}>
              {formState.dbFile.name}
            </Text>
          )}
        </Group>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button loading={submitting} onClick={onSubmit} gradient={{ from: "violet", to: "grape" }} variant="gradient">
            Загрузить
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
