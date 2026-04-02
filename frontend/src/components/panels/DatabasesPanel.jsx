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
  IconDatabase,
  IconPlus,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react";

export function DatabasesPanel({
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
          <IconDatabase size={22} stroke={1.5} />
          <Title order={4}>Базы (эталон)</Title>
        </Group>
        <Tooltip label="Добавить БД">
          <ActionIcon
            variant="light"
            color="violet"
            size="lg"
            radius="md"
            onClick={onAdd}
            aria-label="Добавить эталонную базу"
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
          Нет загруженных баз. Нажмите + и приложите .db / .sqlite
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
                    <Tooltip label="Скачать файл">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => onDownload(item.id, `${item.name}.db`)}
                        aria-label={`Скачать базу ${item.name}`}
                      >
                        <IconDownload size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Удалить">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete(item.id)}
                        aria-label={`Удалить базу ${item.name}`}
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
