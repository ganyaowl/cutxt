import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Paper,
  Alert,
} from "@mui/material";
import {
  Add,
  Delete,
  Download,
  Visibility,
  CloudUpload,
  TextFields,
  Storage,
  Description,
  Schema,
} from "@mui/icons-material";

const API_URL = "http://localhost:8000";

function App() {
  // State for data
  const [databases, setDatabases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [classifications, setClassifications] = useState([]);

  // State for loading indicators
  const [loading, setLoading] = useState({
    databases: true,
    documents: true,
    classifications: true,
  });

  // State for modals
  const [modalOpen, setModalOpen] = useState({
    db: false,
    doc: false,
    classify: false,
    result: false,
  });

  // State for forms
  const [formState, setFormState] = useState({
    dbName: "",
    dbFile: null,
    docName: "",
    docFile: null,
    docText: "",
    useText: false,
    classifyDocId: "",
    classifyDbId: "",
  });

  // State for results and notifications
  const [selectedResult, setSelectedResult] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // --- DATA FETCHING ---
  const fetchData = useCallback(async (endpoint, setData, key) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await axios.get(`${API_URL}/${endpoint}`);
      setData(response.data);
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      setSnackbar({
        open: true,
        message: `Failed to load ${key}.`,
        severity: "error",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    fetchData("database", setDatabases, "databases");
    fetchData("document", setDocuments, "documents");
    fetchData("classify", setClassifications, "classifications");
  }, [fetchData]);

  const handleModalOpen = (modal) =>
    setModalOpen((prev) => ({ ...prev, [modal]: true }));
  const handleModalClose = (modal) => {
    setModalOpen((prev) => ({ ...prev, [modal]: false }));
    // Reset form on close
    setFormState({
      dbName: "",
      dbFile: null,
      docName: "",
      docFile: null,
      docText: "",
      useText: false,
      classifyDocId: "",
      classifyDbId: "",
    });
  };

  // --- HANDLERS ---
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormState((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleSwitchChange = (event) => {
    setFormState((prev) => ({ ...prev, useText: event.target.checked }));
  };

  // --- API ACTIONS ---
  const createDatabase = async () => {
    if (!formState.dbName || !formState.dbFile) return;
    const formData = new FormData();
    formData.append("name", formState.dbName);
    formData.append("file", formState.dbFile);
    try {
      await axios.post(`${API_URL}/database`, formData);
      setSnackbar({
        open: true,
        message: "Database created successfully!",
        severity: "success",
      });
      fetchData("database", setDatabases, "databases");
      handleModalClose("db");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error creating database.",
        severity: "error",
      });
    }
  };

  const createDocument = async () => {
    const { docName, useText, docText, docFile } = formState;
    if (!docName || (useText && !docText) || (!useText && !docFile)) return;
    const formData = new FormData();
    formData.append("name", docName);
    if (useText) {
      formData.append("text", docText);
    } else {
      formData.append("file", docFile);
    }
    try {
      await axios.post(`${API_URL}/document`, formData);
      setSnackbar({
        open: true,
        message: "Document created successfully!",
        severity: "success",
      });
      fetchData("document", setDocuments, "documents");
      handleModalClose("doc");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error creating document.",
        severity: "error",
      });
    }
  };

  const createClassification = async () => {
    const { classifyDocId, classifyDbId } = formState;
    if (!classifyDocId || !classifyDbId) return;
    try {
      const response = await axios.post(`${API_URL}/classify`, {
        document_id: parseInt(classifyDocId),
        database_id: parseInt(classifyDbId),
      });
      setSnackbar({
        open: true,
        message: "Classification created successfully!",
        severity: "success",
      });
      fetchData("classify", setClassifications, "classifications");
      setSelectedResult(response.data.classification_result);
      handleModalClose("classify");
      handleModalOpen("result");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error creating classification.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (endpoint, id, callback) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await axios.delete(`${API_URL}/${endpoint}/${id}`);
        setSnackbar({
          open: true,
          message: "Item deleted successfully!",
          severity: "success",
        });
        callback();
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error deleting item.",
          severity: "error",
        });
      }
    }
  };

  const handleDownload = async (endpoint, id, filename) => {
    try {
      const response = await axios.get(`${API_URL}/${endpoint}/${id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error downloading file.",
        severity: "error",
      });
    }
  };

  const handleViewResult = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/classify/${id}`);
      setSelectedResult(response.data.classification_result);
      handleModalOpen("result");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching classification result.",
        severity: "error",
      });
    }
  };

  const renderList = (
    items,
    loading,
    onDownload,
    onDelete,
    titleKey,
    endpoint,
    downloadExt,
  ) =>
    loading ? (
      <CircularProgress sx={{ m: 2 }} />
    ) : items.length === 0 ? (
      <Typography sx={{ p: 2 }}>No items found.</Typography>
    ) : (
      <List dense>
        {items.map((item) => (
          <ListItem
            key={item.id || item.classification_id}
            secondaryAction={
              <>
                {onDownload && (
                  <IconButton
                    edge="end"
                    onClick={() =>
                      onDownload(
                        endpoint,
                        item.id,
                        `${item[titleKey]}${downloadExt}`,
                      )
                    }
                  >
                    <Download />
                  </IconButton>
                )}
                <IconButton
                  edge="end"
                  onClick={() =>
                    onDelete(endpoint, item.id || item.classification_id, () =>
                      fetchData(
                        endpoint,
                        endpoint === "database" ? setDatabases : setDocuments,
                        endpoint + "s",
                      ),
                    )
                  }
                >
                  <Delete />
                </IconButton>
              </>
            }
          >
            <ListItemText
              primary={
                item[titleKey] || `Classification ${item.classification_id}`
              }
            />
          </ListItem>
        ))}
      </List>
    );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NLP Classifier Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Databases Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader
                avatar={<Storage />}
                title="Databases"
                action={
                  <IconButton onClick={() => handleModalOpen("db")}>
                    <Add />
                  </IconButton>
                }
              />
              <CardContent>
                {renderList(
                  databases,
                  loading.databases,
                  handleDownload,
                  handleDelete,
                  "name",
                  "database",
                  ".db",
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Documents Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader
                avatar={<Description />}
                title="Documents"
                action={
                  <IconButton onClick={() => handleModalOpen("doc")}>
                    <Add />
                  </IconButton>
                }
              />
              <CardContent>
                {renderList(
                  documents,
                  loading.documents,
                  handleDownload,
                  handleDelete,
                  "name",
                  "document",
                  "",
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Classifications Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader
                avatar={<Schema />}
                title="Classifications"
                action={
                  <IconButton onClick={() => handleModalOpen("classify")}>
                    <Add />
                  </IconButton>
                }
              />
              <CardContent>
                {loading.classifications ? (
                  <CircularProgress sx={{ m: 2 }} />
                ) : classifications.length === 0 ? (
                  <Typography sx={{ p: 2 }}>
                    No classifications found.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Doc/DB</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classifications.map((c) => (
                          <TableRow key={c.classification_id}>
                            <TableCell>{c.classification_id}</TableCell>
                            <TableCell>
                              {c.document_id}/{c.database_id}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleViewResult(c.classification_id)
                                }
                              >
                                <Visibility />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleDelete(
                                    "classify",
                                    c.classification_id,
                                    () =>
                                      fetchData(
                                        "classify",
                                        setClassifications,
                                        "classifications",
                                      ),
                                  )
                                }
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Modals */}
      {/* Create DB Modal */}
      <Dialog open={modalOpen.db} onClose={() => handleModalClose("db")}>
        <DialogTitle>Create New Database</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="dbName"
            label="Database Name"
            type="text"
            fullWidth
            variant="standard"
            onChange={handleInputChange}
          />
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUpload />}
            sx={{ mt: 2 }}
          >
            Upload File{" "}
            <input
              type="file"
              name="dbFile"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {formState.dbFile && (
            <Typography sx={{ display: "inline", ml: 2 }}>
              {formState.dbFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleModalClose("db")}>Cancel</Button>
          <Button onClick={createDatabase}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Doc Modal */}
      <Dialog open={modalOpen.doc} onClose={() => handleModalClose("doc")}>
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="docName"
            label="Document Name"
            type="text"
            fullWidth
            variant="standard"
            onChange={handleInputChange}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formState.useText}
                onChange={handleSwitchChange}
              />
            }
            label="Use Text Instead of File"
          />
          {formState.useText ? (
            <TextField
              margin="dense"
              label="Text Content"
              name="docText"
              type="text"
              fullWidth
              multiline
              rows={4}
              onChange={handleInputChange}
            />
          ) : (
            <>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ mt: 2 }}
              >
                Upload File{" "}
                <input
                  type="file"
                  name="docFile"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </Button>
              {formState.docFile && (
                <Typography sx={{ display: "inline", ml: 2 }}>
                  {formState.docFile.name}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleModalClose("doc")}>Cancel</Button>
          <Button onClick={createDocument}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Classification Modal */}
      <Dialog
        open={modalOpen.classify}
        onClose={() => handleModalClose("classify")}
        fullWidth
      >
        <DialogTitle>Create New Classification</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Document</InputLabel>
            <Select
              name="classifyDocId"
              label="Document"
              value={formState.classifyDocId}
              onChange={handleInputChange}
            >
              {documents.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Database</InputLabel>
            <Select
              name="classifyDbId"
              label="Database"
              value={formState.classifyDbId}
              onChange={handleInputChange}
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleModalClose("classify")}>Cancel</Button>
          <Button onClick={createClassification}>Classify</Button>
        </DialogActions>
      </Dialog>

      {/* Result Modal */}
      <Dialog
        open={modalOpen.result}
        onClose={() => handleModalClose("result")}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Classification Result</DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Typography variant="h6">
                Predicted Category:{" "}
                <strong>{selectedResult.predicted_category}</strong>
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Confidence: {selectedResult.confidence.toFixed(2)}
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(selectedResult.all_scores).map(
                      ([cat, score]) => (
                        <TableRow key={cat}>
                          <TableCell>{cat}</TableCell>
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
          <Button onClick={() => handleModalClose("result")}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
