import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup, Modal, Spinner, Table } from 'react-bootstrap';

const API_URL = 'http://localhost:8000';

function Classifications() {
  const [classifications, setClassifications] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [documentId, setDocumentId] = useState('');
  const [databaseId, setDatabaseId] = useState('');

  useEffect(() => {
    fetchClassifications();
    fetchDatabases();
    fetchDocuments();
  }, []);

  const fetchClassifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/classify`);
      setClassifications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classifications:', error);
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const response = await axios.get(`${API_URL}/database`);
      setDatabases(response.data);
    } catch (error) {
      console.error('Error fetching databases:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/document`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleCreate = async () => {
    if (!documentId || !databaseId) return;
    try {
      const response = await axios.post(`${API_URL}/classify`, { document_id: parseInt(documentId), database_id: parseInt(databaseId) });
      setShowCreateModal(false);
      fetchClassifications();
      setDocumentId('');
      setDatabaseId('');
      // Show the new result
      setSelectedResult(response.data.classification_result);
      setShowResultModal(true);
    } catch (error) {
      console.error('Error creating classification:', error);
    }
  };

  const handleView = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/classify/${id}`);
      setSelectedResult(response.data.classification_result);
      setShowResultModal(true);
    } catch (error) {
      console.error('Error fetching classification:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this classification?')) {
      try {
        await axios.delete(`${API_URL}/classify/${id}`);
        fetchClassifications();
      } catch (error) {
        console.error('Error deleting classification:', error);
      }
    }
  };

  return (
    <div>
      <h2>Classifications</h2>
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>Create Classification</Button>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document ID</th>
              <th>Database ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classifications.map(classif => (
              <tr key={classif.classification_id}>
                <td>{classif.classification_id}</td>
                <td>{classif.document_id}</td>
                <td>{classif.database_id}</td>
                <td>
                  <Button variant="outline-primary" size="sm" onClick={() => handleView(classif.classification_id)} className="me-2">View</Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(classif.classification_id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Classification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Document</Form.Label>
              <Form.Select value={documentId} onChange={e => setDocumentId(e.target.value)}>
                <option value="">Select Document</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} (ID: {doc.id})</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Database</Form.Label>
              <Form.Select value={databaseId} onChange={e => setDatabaseId(e.target.value)}>
                <option value="">Select Database</option>
                {databases.map(db => (
                  <option key={db.id} value={db.id}>{db.name} (ID: {db.id})</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleCreate}>Create</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showResultModal} onHide={() => setShowResultModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Classification Result</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedResult && (
            <div>
              <p><strong>Predicted Category:</strong> {selectedResult.predicted_category}</p>
              <p><strong>Confidence:</strong> {selectedResult.confidence.toFixed(2)}</p>
              <h5>Scores per Category:</h5>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedResult.all_scores).map(([category, score]) => (
                    <tr key={category}>
                      <td>{category}</td>
                      <td>{score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResultModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Classifications;