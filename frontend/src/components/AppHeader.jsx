import { AppShell, Group, Title, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

export function AppHeader() {
  return (
    <AppShell.Header px="lg" py="xs" style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}>
      <Group h="100%" justify="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <IconSparkles size={28} stroke={1.5} />
          <div>
            <Title order={3} fw={700} lh={1.2}>
              CuTxT
            </Title>
            <Text size="xs" c="dimmed" visibleFrom="sm">
              Классификация текстов по эталонному словарю
            </Text>
          </div>
        </Group>
      </Group>
    </AppShell.Header>
  );
}
