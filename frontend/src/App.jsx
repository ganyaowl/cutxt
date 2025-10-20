import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Databases from './components/Databases';
import Documents from './components/Documents';
import Classifications from './components/Classifications';

function App() {
  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">NLP Classifier App</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/databases">Databases</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/documents">Documents</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/classifications">Classifications</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container mt-4">
        <Routes>
          <Route path="/databases" element={<Databases />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/classifications" element={<Classifications />} />
          <Route path="/" element={<h1>Welcome to NLP Classifier App</h1>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;