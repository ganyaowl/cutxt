import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Add, Delete, Visibility } from "@mui/icons-material";

const API_URL = "http://localhost:8000";

function Classifications() {
  const [classifications, setClassifications] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [documentId, setDocumentId] = useState("");
  const [databaseId, setDatabaseId] = useState("");

  useEffect(() => {
    fetchClassifications();
    fetchDatabases();
    fetchDocuments();
  }, []);

  const resetForm = () => {
    setDocumentId("");
    setDatabaseId("");
  };

  const fetchClassifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/classify`);
      setClassifications(response.data);
    } catch (error) {
      console.error("Error fetching classifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // ... (fetchDatabases and fetchDocuments remain the same)
  const fetchDatabases = async () => {
    try {
      const response = await axios.get(`${API_URL}/database`);
      setDatabases(response.data);
    } catch (error) {
      console.error("Error fetching databases:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/document`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleCreate = async () => {
    if (!documentId || !databaseId) return;
    try {
      const response = await axios.post(`${API_URL}/classify`, {
        document_id: parseInt(documentId),
        database_id: parseInt(databaseId),
      });
      setShowCreateModal(false);
      resetForm();
      fetchClassifications();
      setSelectedResult(response.data.classification_result);
      setShowResultModal(true);
    } catch (error) {
      console.error("Error creating classification:", error);
    }
  };

  const handleView = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/classify/${id}`);
      setSelectedResult(response.data.classification_result);
      setShowResultModal(true);
    } catch (error) {
      console.error("Error fetching classification:", error);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this classification?")
    ) {
      try {
        await axios.delete(`${API_URL}/classify/${id}`);
        fetchClassifications();
      } catch (error) {
        console.error("Error deleting classification:", error);
      }
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">Classifications</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateModal(true)}
        >
          New Classification
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Classification ID</TableCell>
                <TableCell>Document ID</TableCell>
                <TableCell>Database ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classifications.map((c) => (
                <TableRow key={c.classification_id}>
                  <TableCell>{c.classification_id}</TableCell>
                  <TableCell>{c.document_id}</TableCell>
                  <TableCell>{c.database_id}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleView(c.classification_id)}
                      color="primary"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(c.classification_id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        fullWidth
      >
        <DialogTitle>Create New Classification</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Document</InputLabel>
            <Select
              value={documentId}
              label="Document"
              onChange={(e) => setDocumentId(e.target.value)}
            >
              {documents.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.name} (ID: {doc.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Database</InputLabel>
            <Select
              value={databaseId}
              label="Database"
              onChange={(e) => setDatabaseId(e.target.value)}
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name} (ID: {db.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Result Modal */}
      <Dialog
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        maxWidth="md"
      >
        <DialogTitle>Classification Result</DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Typography variant="h6">
                Predicted Category:{" "}
                <strong>{selectedResult.predicted_category}</strong>
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Confidence:{" "}
                <strong>{selectedResult.confidence.toFixed(2)}</strong>
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(selectedResult.all_scores).map(
                      ([category, score]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell align="right">
                            {score.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResultModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Classifications;
