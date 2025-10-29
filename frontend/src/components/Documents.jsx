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
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Add, Delete, Download } from "@mui/icons-material";

const API_URL = "http://localhost:8000";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [useText, setUseText] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const resetForm = () => {
    setName("");
    setFile(null);
    setText("");
    setUseText(false);
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/document`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || (!useText && !file) || (useText && !text)) return;
    const formData = new FormData();
    formData.append("name", name);
    if (useText) {
      formData.append("text", text);
    } else {
      formData.append("file", file);
    }
    try {
      await axios.post(`${API_URL}/document`, formData);
      setShowModal(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const handleDownload = async (id, docName) => {
    try {
      const response = await axios.get(`${API_URL}/document/${id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", docName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await axios.delete(`${API_URL}/document/${id}`);
        fetchDocuments();
      } catch (error) {
        console.error("Error deleting document:", error);
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
        <Typography variant="h4">Documents</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowModal(true)}
        >
          Create Document
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
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.name}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleDownload(doc.id, doc.name)}
                      color="primary"
                    >
                      <Download />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(doc.id)}
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

      <Dialog
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Name"
            type="text"
            fullWidth
            variant="standard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch checked={useText} onChange={() => setUseText(!useText)} />
            }
            label="Use Text Instead of File"
          />
          {useText ? (
            <TextField
              margin="dense"
              label="Text Content"
              type="text"
              fullWidth
              multiline
              rows={5}
              variant="outlined"
              value={text}
              onChange={(e) => setText(e.target.value)}
              sx={{ mt: 2 }}
            />
          ) : (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="label">
                Upload File (PDF/DOC/DOCX)
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </Button>
              {file && (
                <Typography sx={{ display: "inline", ml: 2 }}>
                  {file.name}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Documents;
