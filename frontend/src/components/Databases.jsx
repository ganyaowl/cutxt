import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';

const API_URL = 'http://localhost:8000';

function Databases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const response = await axios.get(`${API_URL}/database`);
      setDatabases(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching databases:', error);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !file) return;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/database`, formData);
      setShowModal(false);
      fetchDatabases();
      setName('');
      setFile(null);
    } catch (error) {
      console.error('Error creating database:', error);
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const response = await axios.get(`${API_URL}/database/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}.db`); // Assuming db file
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading database:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this database?')) {
      try {
        await axios.delete(`${API_URL}/database/${id}`);
        fetchDatabases();
      } catch (error) {
        console.error('Error deleting database:', error);
      }
    }
  };

  return (
    <div>
      <h2>Databases</h2>
      <Button variant="primary" onClick={() => setShowModal(true)}>Create Database</Button>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <ListGroup className="mt-3">
          {databases.map(db => (
            <ListGroup.Item key={db.id} className="d-flex justify-content-between align-items-center">
              {db.name}
              <div>
                <Button variant="outline-primary" size="sm" onClick={() => handleDownload(db.id, db.name)} className="me-2">Download</Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(db.id)}>Delete</Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Database</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={name} onChange={e => setName(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>File</Form.Label>
              <Form.Control type="file" onChange={e => setFile(e.target.files[0])} />
            </Form.Group>
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

export default Databases;