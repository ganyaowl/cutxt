import {
  Paper,
  Title,
  Group,
  ActionIcon,
  Table,
  Text,
  Skeleton,
  Tooltip,
  ScrollArea,
  Badge,
} from "@mantine/core";
import { IconListDetails, IconPlus, IconTrash, IconEye } from "@tabler/icons-react";

export function ClassificationsPanel({
  items,
  loading,
  onAdd,
  onView,
  onDelete,
}) {
  return (
    <Paper shadow="md" p="lg" radius="lg" withBorder h="100%" style={{ minHeight: 320 }}>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap="xs">
          <IconListDetails size={22} stroke={1.5} />
          <Title order={4}>Классификации</Title>
        </Group>
        <Tooltip label="Новая классификация">
          <ActionIcon
            variant="light"
            color="teal"
            size="lg"
            radius="md"
            onClick={onAdd}
            aria-label="Создать классификацию"
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading ? (
        <StackLikeSkeleton />
      ) : items.length === 0 ? (
        <Text c="dimmed" size="sm" py="xl" ta="center">
          Пока нет результатов. Нужен документ; для словаря — ещё эталонная база, для ML —
          обученная модель на сервере.
        </Text>
      ) : (
        <ScrollArea h={280} type="auto" offsetScrollbars>
          <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Тип</Table.Th>
                <Table.Th>Док / БД</Table.Th>
                <Table.Th style={{ width: 100 }} ta="right">
                  Действия
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((c) => {
                const method = c.classifier_method || "dictionary";
                const isMl = method === "ml";
                return (
                  <Table.Tr key={c.classification_id}>
                    <Table.Td>{c.classification_id}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={isMl ? "grape" : "blue"}>
                        {isMl ? "ML" : "Словарь"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {c.document_id} / {isMl ? "—" : c.database_id}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Результат">
                          <ActionIcon
                            variant="light"
                            color="grape"
                            size="sm"
                            onClick={() => onView(c.classification_id)}
                            aria-label={`Открыть результат классификации ${c.classification_id}`}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Удалить">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => onDelete(c.classification_id)}
                            aria-label={`Удалить классификацию ${c.classification_id}`}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Paper>
  );
}

function StackLikeSkeleton() {
  return (
    <>
      <Skeleton height={28} radius="md" mb="xs" />
      <Skeleton height={28} radius="md" mb="xs" />
      <Skeleton height={28} radius="md" />
    </>
  );
}
