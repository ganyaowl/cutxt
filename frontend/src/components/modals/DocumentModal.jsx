import {
  Modal,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  Switch,
  FileButton,
} from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { basenameNoExt } from "../../utils/files.js";

export function DocumentModal({
  opened,
  onClose,
  formState,
  setFormState,
  onSubmit,
  submitting,
  errors,
  onClearError,
}) {
  const ph = formState.useText
    ? "Например: договор от 2024"
    : formState.docFile
      ? basenameNoExt(formState.docFile)
      : "Выберите файл — подсказка появится здесь";

  return (
    <Modal opened={opened} onClose={onClose} title="Новый документ" radius="lg" centered size="lg">
      <Stack gap="md">
        <TextInput
          label="Название в списке"
          placeholder={ph}
          description={
            formState.useText
              ? "Обязательно заполните для режима текста"
              : formState.docFile
                ? "Пустое поле = взять имя из подсказки"
                : "Выберите PDF/DOCX или переключитесь на текст"
          }
          value={formState.docName}
          onChange={(e) => {
            onClearError?.("docName");
            setFormState((p) => ({ ...p, docName: e.target.value }));
          }}
          error={errors.docName}
        />
        <Switch
          label="Вставить текст вместо файла"
          checked={formState.useText}
          onChange={(e) => {
            onClearError?.("docText");
            onClearError?.("docFile");
            setFormState((p) => ({
              ...p,
              useText: e.currentTarget.checked,
              docFile: e.currentTarget.checked ? null : p.docFile,
            }));
          }}
        />
        {formState.useText ? (
          <Textarea
            label="Текст"
            placeholder="Вставьте фрагмент или целый текст…"
            minRows={5}
            autosize
            maxRows={12}
            name="docText"
            value={formState.docText}
            onChange={(e) => {
              onClearError?.("docText");
              setFormState((p) => ({ ...p, docText: e.target.value }));
            }}
            error={errors.docText}
          />
        ) : (
          <Group align="flex-end">
            <FileButton accept=".pdf,.docx,application/pdf" onChange={(file) => {
              onClearError?.("docFile");
              setFormState((p) => ({ ...p, docFile: file }));
            }}>
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={18} />} variant="light">
                  PDF или DOCX
                </Button>
              )}
            </FileButton>
            {formState.docFile && (
              <Text size="sm" c="dimmed" truncate maw={280}>
                {formState.docFile.name}
              </Text>
            )}
            {errors.docFile && (
              <Text size="sm" c="red">
                {errors.docFile}
              </Text>
            )}
          </Group>
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button
            loading={submitting}
            onClick={onSubmit}
            gradient={{ from: "cyan", to: "blue" }}
            variant="gradient"
          >
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
