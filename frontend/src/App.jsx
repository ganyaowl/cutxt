import { useState, useCallback, useEffect } from "react";
import { AppShell, Container, SimpleGrid, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useDashboardData } from "./hooks/useDashboardData.js";
import { formatApiError } from "./api/client.js";
import {
  createDatabaseApi,
  createDocumentApi,
  createClassificationApi,
  deleteResource,
  downloadResourceBlob,
  fetchClassificationResult,
  fetchMlStatus,
} from "./api/resources.js";
import { basenameNoExt } from "./utils/files.js";
import { saveBlobAsFile } from "./utils/download.js";
import { AppHeader } from "./components/AppHeader.jsx";
import { DatabasesPanel } from "./components/panels/DatabasesPanel.jsx";
import { DocumentsPanel } from "./components/panels/DocumentsPanel.jsx";
import { ClassificationsPanel } from "./components/panels/ClassificationsPanel.jsx";
import { DatabaseModal } from "./components/modals/DatabaseModal.jsx";
import { DocumentModal } from "./components/modals/DocumentModal.jsx";
import { ClassifyModal } from "./components/modals/ClassifyModal.jsx";
import { ResultModal } from "./components/modals/ResultModal.jsx";

const initialForm = {
  dbName: "",
  dbFile: null,
  docName: "",
  docFile: null,
  docText: "",
  useText: false,
  classifyDocId: "",
  classifyDbId: "",
  classifyMethod: "dictionary",
  forceRecompute: false,
};

export default function App() {
  const {
    databases,
    documents,
    classifications,
    loading,
    refetchDatabases,
    refetchDocuments,
    refetchClassifications,
  } = useDashboardData();

  const [modal, setModal] = useState({
    db: false,
    doc: false,
    classify: false,
    result: false,
  });
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState({
    db: false,
    doc: false,
    classify: false,
  });
  const [selectedResult, setSelectedResult] = useState(null);
  const [mlAvailable, setMlAvailable] = useState(false);

  useEffect(() => {
    fetchMlStatus()
      .then((s) => setMlAvailable(!!s.available))
      .catch(() => setMlAvailable(false));
  }, []);

  const closeModal = useCallback((key) => {
    setModal((m) => ({ ...m, [key]: false }));
    if (key !== "result") {
      setForm(initialForm);
      setFormErrors({});
    }
  }, []);

  const openModal = useCallback((key) => {
    setForm(initialForm);
    setFormErrors({});
    setModal((m) => ({ ...m, [key]: true }));
  }, []);

  const clearFieldError = useCallback((field) => {
    setFormErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  }, []);

  const submitDatabase = async () => {
    const err = {};
    if (!form.dbFile) err.dbFile = "Выберите файл эталонной базы";
    const title = form.dbName.trim() || basenameNoExt(form.dbFile);
    if (!title) err.dbName = "Укажите название или выберите файл с осмысленным именем";
    if (Object.keys(err).length) {
      setFormErrors(err);
      return;
    }
    setSubmitting((s) => ({ ...s, db: true }));
    try {
      await createDatabaseApi(title, form.dbFile);
      notifications.show({ title: "Готово", message: "База загружена", color: "teal" });
      await refetchDatabases();
      closeModal("db");
    } catch (e) {
      notifications.show({ title: "Ошибка", message: formatApiError(e), color: "red" });
    } finally {
      setSubmitting((s) => ({ ...s, db: false }));
    }
  };

  const submitDocument = async () => {
    const err = {};
    if (form.useText) {
      if (!form.docText?.trim()) err.docText = "Введите текст документа";
      if (!form.docName.trim()) err.docName = "Укажите название для списка";
    } else {
      if (!form.docFile) err.docFile = "Выберите PDF или DOCX";
    }
    const title = form.useText
      ? form.docName.trim()
      : form.docName.trim() || basenameNoExt(form.docFile);
    if (!title) err.docName = "Нужно название (или оставьте поле пустым при выбранном файле)";
    if (Object.keys(err).length) {
      setFormErrors(err);
      return;
    }
    setSubmitting((s) => ({ ...s, doc: true }));
    try {
      await createDocumentApi(title, form.docFile, form.docText, form.useText);
      notifications.show({ title: "Готово", message: "Документ добавлен", color: "teal" });
      await refetchDocuments();
      closeModal("doc");
    } catch (e) {
      notifications.show({ title: "Ошибка", message: formatApiError(e), color: "red" });
    } finally {
      setSubmitting((s) => ({ ...s, doc: false }));
    }
  };

  const submitClassify = async () => {
    const err = {};
    if (!form.classifyDocId) err.classifyDoc = "Выберите документ";
    if (form.classifyMethod === "dictionary" && !form.classifyDbId) {
      err.classifyDb = "Выберите базу";
    }
    if (Object.keys(err).length) {
      setFormErrors(err);
      return;
    }
    setSubmitting((s) => ({ ...s, classify: true }));
    try {
      const payload = {
        document_id: parseInt(form.classifyDocId, 10),
        force_recompute: form.forceRecompute,
        method: form.classifyMethod,
      };
      if (form.classifyMethod === "dictionary") {
        payload.database_id = parseInt(form.classifyDbId, 10);
      }
      const data = await createClassificationApi(payload);
      notifications.show({ title: "Готово", message: "Классификация выполнена", color: "teal" });
      await refetchClassifications();
      setSelectedResult(data.classification_result);
      closeModal("classify");
      setModal((m) => ({ ...m, result: true }));
    } catch (e) {
      notifications.show({ title: "Ошибка", message: formatApiError(e), color: "red" });
    } finally {
      setSubmitting((s) => ({ ...s, classify: false }));
    }
  };

  const onDelete = (endpoint, id, refresh) => {
    modals.openConfirmModal({
      title: "Удалить запись?",
      children: (
        <Text size="sm">Действие необратимо. Продолжить?</Text>
      ),
      labels: { confirm: "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteResource(endpoint, id);
          notifications.show({ title: "Удалено", message: "Запись удалена", color: "gray" });
          await refresh();
        } catch (e) {
          notifications.show({ title: "Ошибка", message: formatApiError(e), color: "red" });
        }
      },
    });
  };

  const onDownload = async (endpoint, id, filename) => {
    try {
      const res = await downloadResourceBlob(endpoint, id);
      saveBlobAsFile(res.data, filename);
    } catch (e) {
      notifications.show({ title: "Ошибка скачивания", message: formatApiError(e), color: "red" });
    }
  };

  const onViewResult = async (id) => {
    try {
      const result = await fetchClassificationResult(id);
      setSelectedResult(result);
      setModal((m) => ({ ...m, result: true }));
    } catch (e) {
      notifications.show({ title: "Ошибка", message: formatApiError(e), color: "red" });
    }
  };

  const closeResult = () => {
    setModal((m) => ({ ...m, result: false }));
    setSelectedResult(null);
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />
      <AppShell.Main>
        <Container size="xl" py="lg">
          <SimpleGrid cols={{ base: 1, sm: 1, lg: 3 }} spacing="lg">
            <DatabasesPanel
              items={databases}
              loading={loading.databases}
              onAdd={() => openModal("db")}
              onDownload={(id, name) => onDownload("database", id, name)}
              onDelete={(id) =>
                onDelete("database", id, refetchDatabases)
              }
            />
            <DocumentsPanel
              items={documents}
              loading={loading.documents}
              onAdd={() => openModal("doc")}
              onDownload={(id, name) => onDownload("document", id, name)}
              onDelete={(id) =>
                onDelete("document", id, refetchDocuments)
              }
            />
            <ClassificationsPanel
              items={classifications}
              loading={loading.classifications}
              onAdd={() => openModal("classify")}
              onView={onViewResult}
              onDelete={(id) =>
                onDelete("classify", id, refetchClassifications)
              }
            />
          </SimpleGrid>
        </Container>
      </AppShell.Main>

      <DatabaseModal
        opened={modal.db}
        onClose={() => closeModal("db")}
        formState={form}
        setFormState={setForm}
        onSubmit={submitDatabase}
        submitting={submitting.db}
        errors={formErrors}
        onClearError={clearFieldError}
      />
      <DocumentModal
        opened={modal.doc}
        onClose={() => closeModal("doc")}
        formState={form}
        setFormState={setForm}
        onSubmit={submitDocument}
        submitting={submitting.doc}
        errors={formErrors}
        onClearError={clearFieldError}
      />
      <ClassifyModal
        opened={modal.classify}
        onClose={() => closeModal("classify")}
        formState={form}
        setFormState={setForm}
        documents={documents}
        databases={databases}
        mlAvailable={mlAvailable}
        onSubmit={submitClassify}
        submitting={submitting.classify}
        errors={formErrors}
        onClearError={clearFieldError}
      />
      <ResultModal
        opened={modal.result}
        onClose={closeResult}
        selectedResult={selectedResult}
      />
    </AppShell>
  );
}
