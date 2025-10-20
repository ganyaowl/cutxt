import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';

const API_URL = 'http://localhost:8000';

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [useText, setUseText] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/document`);
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    const formData = new FormData();
    formData.append('name', name);
    if (useText) {
      if (!text) return;
      formData.append('text', text);
    } else {
      if (!file) return;
      formData.append('file', file);
    }
    try {
      await axios.post(`${API_URL}/document`, formData);
      setShowModal(false);
      fetchDocuments();
      setName('');
      setFile(null);
      setText('');
      setUseText(false);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const response = await axios.get(`${API_URL}/document/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name); // Use name as filename
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`${API_URL}/document/${id}`);
        fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  return (
    <div>
      <h2>Documents</h2>
      <Button variant="primary" onClick={() => setShowModal(true)}>Create Document</Button>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <ListGroup className="mt-3">
          {documents.map(doc => (
            <ListGroup.Item key={doc.id} className="d-flex justify-content-between align-items-center">
              {doc.name}
              <div>
                <Button variant="outline-primary" size="sm" onClick={() => handleDownload(doc.id, doc.name)} className="me-2">Download</Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(doc.id)}>Delete</Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={name} onChange={e => setName(e.target.value)} />
            </Form.Group>
            <Form.Check 
              type="switch"
              id="use-text-switch"
              label="Use Text Instead of File"
              checked={useText}
              onChange={() => setUseText(!useText)}
            />
            {useText ? (
              <Form.Group className="mb-3">
                <Form.Label>Text Content</Form.Label>
                <Form.Control as="textarea" rows={5} value={text} onChange={e => setText(e.target.value)} />
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>File (PDF/DOC/DOCX)</Form.Label>
                <Form.Control type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleCreate}>Create</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Documents;