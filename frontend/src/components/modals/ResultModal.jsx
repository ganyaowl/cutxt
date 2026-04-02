import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  Table,
  ScrollArea,
  Alert,
  Title,
  Badge,
} from "@mantine/core";
import { formatRelativeShare, interpretClassification, scoreRowsForDisplay } from "../../utils/classification.js";

export function ResultModal({ opened, onClose, selectedResult }) {
  const meta =
    selectedResult != null ? interpretClassification(selectedResult) : null;
  const isMl = selectedResult?.classification_kind === "ml";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Результат классификации"
      radius="lg"
      size="lg"
    >
      {selectedResult && meta && (
        <Stack gap="md">
          <Group gap="sm">
            <Badge color={isMl ? "grape" : "blue"} variant="light">
              {isMl ? "ML" : "Словарь"}
            </Badge>
            {isMl && selectedResult.model_version && (
              <Text size="xs" c="dimmed">
                модель v{selectedResult.model_version}
                {selectedResult.calibrated ? " · калибровка" : ""}
              </Text>
            )}
          </Group>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              {isMl ? "Предсказанный класс" : "Категория по словарю"}
            </Text>
            <Title order={4}>{selectedResult.predicted_category}</Title>
          </div>
          {isMl ? (
            <Text size="sm" c="dimmed">
              <Text span inherit fw={600} c="gray.3">
                Вероятность лучшего класса:{" "}
              </Text>
              {formatRelativeShare(meta.share)} — оценка из{" "}
              {selectedResult.calibrated ? "калиброванной " : ""}
              модели (сумма вероятностей по классам = 100%).
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              <Text span inherit fw={600} c="gray.3">
                Доля лидера (relative score share):{" "}
              </Text>
              {formatRelativeShare(meta.share)} — доля суммарного сырого скора по совпадениям
              в эталоне, не вероятность класса.
            </Text>
          )}
          {meta.onlyOne && !isMl && (
            <Alert color="yellow" variant="light">
              Только один класс набрал ненулевой скор по словарю. Высокая доля не означает
              абсолютную уверенность — нет второго кандидата.
            </Alert>
          )}
          {meta.onlyOne && isMl && (
            <Alert color="yellow" variant="light">
              Остальные классы почти с нулевой вероятностью — смотрите таблицу ниже.
            </Alert>
          )}
          {!meta.onlyOne && meta.marginRaw != null && (
            <Text size="sm">
              <Text span fw={600}>
                Отрыв от 2-го места (margin):
              </Text>{" "}
              {isMl
                ? `по вероятности — ${Number(meta.marginRaw).toFixed(4)}`
                : `по сырому скору — ${Number(meta.marginRaw).toFixed(2)}`}
              {meta.marginShare != null && (
                <>
                  ; по доле — {(Number(meta.marginShare) * 100).toFixed(1)} п.п.
                </>
              )}
              {meta.runnerUp && (
                <>
                  {" "}
                  (второй: «{meta.runnerUp}»)
                </>
              )}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {isMl
              ? "Таблица — вероятности по классам модели (обучение на вашем CSV)."
              : "«Сырой балл» — сумма percent×weight по совпадениям в эталонном словаре."}
          </Text>
          <ScrollArea h={320} type="auto" offsetScrollbars>
            <Table striped highlightOnHover verticalSpacing="xs" withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{isMl ? "Класс" : "Категория"}</Table.Th>
                  <Table.Th ta="right">{isMl ? "Вероятность" : "Доля"}</Table.Th>
                  <Table.Th ta="right">{isMl ? "P (сырое)" : "Сырой балл"}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {scoreRowsForDisplay(selectedResult).map((row) => (
                  <Table.Tr key={row.category}>
                    <Table.Td maw={360}>
                      <Text size="sm" lineClamp={4}>
                        {row.category}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      {row.share != null && !Number.isNaN(row.share)
                        ? `${(row.share * 100).toFixed(1)} %`
                        : "—"}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" c="dimmed" ff="monospace">
                        {Number(row.raw).toFixed(isMl ? 4 : 2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="flex-end">
            <Button onClick={onClose} variant="light">
              Закрыть
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
