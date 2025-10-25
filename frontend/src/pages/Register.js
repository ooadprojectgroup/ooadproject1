import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    age: '',
    gender: ''
  });
  const [profileFile, setProfileFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'phone') {
      // Filter out invalid characters live
      v = (v || '').replace(/[^0-9+\-() ]/g, '');
    }
    setFormData(prev => ({
      ...prev,
      [name]: v
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Phone validation (optional but must conform if provided)
    if (formData.phone) {
      const phonePattern = /^[0-9+\-() ]{7,20}$/;
      if (!phonePattern.test(formData.phone)) {
        setError('Phone must be 7-20 chars: digits, spaces, + - ( ) only');
        setLoading(false);
        return;
      }
    }

    // Username validation (same as backend)
    const usernamePattern = /^[a-zA-Z0-9._-]{3,50}$/;
    if (!usernamePattern.test(formData.username)) {
      setError('Username must be 3-50 chars, letters/numbers/dot/underscore/hyphen only');
      setLoading(false);
      return;
    }

    // Age validation (optional but must be between 0-150 if provided)
    if (formData.age !== '' && (isNaN(formData.age) || Number(formData.age) < 0 || Number(formData.age) > 150)) {
      setError('Age must be a number between 0 and 150');
      setLoading(false);
      return;
    }

    // Build payload: if file present -> multipart, else JSON (no online image URL)
    const { confirmPassword, ...payload } = formData;
    let result;
    if (profileFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      fd.append('profileImage', profileFile);
      result = await register(fd);
    } else {
      // Coerce age to number if provided
      const jsonPayload = { ...payload };
      if (jsonPayload.age === '') delete jsonPayload.age; else jsonPayload.age = Number(jsonPayload.age);
      result = await register(jsonPayload);
    }
    
    if (result.success) {
      setSuccess('Registration successful! Please login to continue.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (error) {
      showToast(error, { variant: 'danger' });
    }
  }, [error, showToast]);

  useEffect(() => {
    if (success) {
      showToast(success, { variant: 'success' });
    }
  }, [success, showToast]);

  return (
    <section className="auth-hero py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <Card className="auth-card border-0 shadow-sm">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold mb-1">Create your account</h2>
                  <div className="text-muted">Join DVP Gift Center</div>
                </div>

                {/* Errors and success messages are shown via toasts */}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Username *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FiUser /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Choose a username"
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FiMail /></InputGroup.Text>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Password *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FiLock /></InputGroup.Text>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength="6"
                            placeholder="Create a password"
                            required
                          />
                          <Button variant="outline-secondary" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Confirm Password *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FiLock /></InputGroup.Text>
                          <Form.Control
                            type={showConfirm ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            minLength="6"
                            placeholder="Re-enter password"
                            required
                          />
                          <Button variant="outline-secondary" onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>
                            {showConfirm ? <FiEyeOff /> : <FiEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FiPhone /></InputGroup.Text>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            pattern="[0-9+\-() ]{7,20}"
                            title="7-20 characters; digits, spaces, + - ( ) only"
                            placeholder="required format: +94 77 123 4567"
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Age</Form.Label>
                        <Form.Control
                          type="number"
                          name="age"
                          min="0"
                          max="150"
                          value={formData.age}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Profile Image (Upload)</Form.Label>
                        <Form.Control
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <div className="d-grid">
                    <Button type="submit" className="btn-gift" disabled={loading}>
                      {loading ? 'Registering...' : (<><FiUserPlus className="me-2" /> Register</>)}
                    </Button>
                  </div>

                  <div className="text-center mt-3">
                    <small className="text-muted">By creating an account, you agree to our Terms and Privacy Policy.</small>
                  </div>
                </Form>

                <div className="text-center mt-4">
                  <span className="text-muted">Already have an account? </span>
                  <Link to="/login">Sign in</Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Register;