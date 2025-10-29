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
} from "@mui/material";
import { Add, Delete, Download } from "@mui/icons-material";

const API_URL = "http://localhost:8000";

function Databases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/database`);
      setDatabases(response.data);
    } catch (error) {
      console.error("Error fetching databases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !file) return;
    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", file);
    try {
      await axios.post(`${API_URL}/database`, formData);
      setShowModal(false);
      setName("");
      setFile(null);
      fetchDatabases();
    } catch (error) {
      console.error("Error creating database:", error);
    }
  };

  const handleDownload = async (id, dbName) => {
    try {
      const response = await axios.get(`${API_URL}/database/${id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${dbName}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading database:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this database?")) {
      try {
        await axios.delete(`${API_URL}/database/${id}`);
        fetchDatabases();
      } catch (error) {
        console.error("Error deleting database:", error);
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
        <Typography variant="h4">Databases</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowModal(true)}
        >
          Create Database
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
              {databases.map((db) => (
                <TableRow key={db.id}>
                  <TableCell>{db.name}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleDownload(db.id, db.name)}
                      color="primary"
                    >
                      <Download />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(db.id)}
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

      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Create New Database</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Database Name"
            type="text"
            fullWidth
            variant="standard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" component="label">
            Upload File
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Button>
          {file && (
            <Typography sx={{ display: "inline", ml: 2 }}>
              {file.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Databases;
