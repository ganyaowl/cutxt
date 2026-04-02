import { useState, useEffect, useCallback } from "react";
import { notifications } from "@mantine/notifications";
import { formatApiError } from "../api/client.js";
import {
  fetchDatabases,
  fetchDocuments,
  fetchClassifications,
} from "../api/resources.js";

export function useDashboardData() {
  const [databases, setDatabases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState({
    databases: true,
    documents: true,
    classifications: true,
  });

  const refetchDatabases = useCallback(async () => {
    setLoading((p) => ({ ...p, databases: true }));
    try {
      setDatabases(await fetchDatabases());
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Ошибка загрузки",
        message: formatApiError(e),
        color: "red",
      });
    } finally {
      setLoading((p) => ({ ...p, databases: false }));
    }
  }, []);

  const refetchDocuments = useCallback(async () => {
    setLoading((p) => ({ ...p, documents: true }));
    try {
      setDocuments(await fetchDocuments());
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Ошибка загрузки",
        message: formatApiError(e),
        color: "red",
      });
    } finally {
      setLoading((p) => ({ ...p, documents: false }));
    }
  }, []);

  const refetchClassifications = useCallback(async () => {
    setLoading((p) => ({ ...p, classifications: true }));
    try {
      setClassifications(await fetchClassifications());
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Ошибка загрузки",
        message: formatApiError(e),
        color: "red",
      });
    } finally {
      setLoading((p) => ({ ...p, classifications: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading({
        databases: true,
        documents: true,
        classifications: true,
      });
      try {
        const [d, doc, c] = await Promise.all([
          fetchDatabases(),
          fetchDocuments(),
          fetchClassifications(),
        ]);
        if (!cancelled) {
          setDatabases(d);
          setDocuments(doc);
          setClassifications(c);
        }
      } catch (e) {
        if (!cancelled) {
          notifications.show({
            title: "Ошибка загрузки",
            message: formatApiError(e),
            color: "red",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading({
            databases: false,
            documents: false,
            classifications: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    databases,
    documents,
    classifications,
    loading,
    refetchDatabases,
    refetchDocuments,
    refetchClassifications,
  };
}
