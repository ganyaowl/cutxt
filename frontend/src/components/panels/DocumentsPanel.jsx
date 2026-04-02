import {
  Paper,
  Title,
  Group,
  ActionIcon,
  ScrollArea,
  Stack,
  Text,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import {
  IconFileText,
  IconPlus,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react";

export function DocumentsPanel({
  items,
  loading,
  onAdd,
  onDownload,
  onDelete,
}) {
  return (
    <Paper shadow="md" p="lg" radius="lg" withBorder h="100%" style={{ minHeight: 320 }}>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap="xs">
          <IconFileText size={22} stroke={1.5} />
          <Title order={4}>Документы</Title>
        </Group>
        <Tooltip label="Добавить документ">
          <ActionIcon
            variant="light"
            color="cyan"
            size="lg"
            radius="md"
            onClick={onAdd}
            aria-label="Добавить документ"
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading ? (
        <Stack gap="sm">
          <Skeleton height={36} radius="md" />
          <Skeleton height={36} radius="md" />
          <Skeleton height={36} radius="md" />
        </Stack>
      ) : items.length === 0 ? (
        <Text c="dimmed" size="sm" py="xl" ta="center">
          Нет документов. Загрузите PDF/DOCX или вставьте текст
        </Text>
      ) : (
        <ScrollArea h={280} type="auto" offsetScrollbars>
          <Stack gap="xs">
            {items.map((item) => (
              <Paper key={item.id} p="sm" radius="md" withBorder bg="dark.6">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="sm" fw={500} lineClamp={2} title={item.name} maw="75%">
                    {item.name}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Скачать">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => onDownload(item.id, item.name)}
                        aria-label={`Скачать документ ${item.name}`}
                      >
                        <IconDownload size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Удалить">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete(item.id)}
                        aria-label={`Удалить документ ${item.name}`}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  );
}
