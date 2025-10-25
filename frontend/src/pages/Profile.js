import React, { useEffect, useState } from 'react';
import { Card, Form, Button, Row, Col, Spinner, Modal } from 'react-bootstrap';
import CenteredToast from '../components/CenteredToast';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/url';

const Profile = () => {
  const { logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [toast, setToast] = useState({ show: false, text: '', variant: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios.get('/api/auth/me')
      .then(res => {
        const me = res.data?.data;
        if (mounted && me) {
          setUsername(me.username || '');
          setEmail(me.email || '');
          // best effort split fullName if first/last absent in response
          if (me.firstName || me.lastName) {
            setFirstName(me.firstName || '');
            setLastName(me.lastName || '');
          } else if (me.fullName) {
            const parts = me.fullName.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
          setPhone(me.phone || '');
          setAddress(me.address || '');
          setAge(me.age ?? '');
          setGender(me.gender || '');
          setImagePreview(me.profileImage ? resolveImageUrl(me.profileImage) : null);
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Failed to load profile';
        setToast({ show: true, text: msg, variant: 'danger' });
      })
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  const validate = () => {
    // local validation only; notifications shown via toast
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email.';
    if (phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) return 'Please enter a valid phone number.';
    if (age !== '' && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 150)) return 'Please enter a valid age (0-150).';
    return null;
  };

  const onSave = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) { 
      setToast({ show: true, text: errMsg, variant: 'danger' });
      return; 
    }
    try {
      await axios.put('/api/auth/me', {
        email,
        firstName,
        lastName,
        phone,
        address,
        age: age === '' ? null : Number(age),
        gender
      });
      setToast({ show: true, text: 'Profile updated successfully.', variant: 'success' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed';
      setToast({ show: true, text: msg, variant: 'danger' });
    }
  };

  const onDelete = () => setShowDeleteModal(true);
  const confirmDelete = async () => {
    try {
      await axios.delete('/api/auth/me');
      setToast({ show: true, text: 'Account deleted. Signing out...', variant: 'success' });
      setShowDeleteModal(false);
      setTimeout(() => logout(), 800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      setToast({ show: true, text: msg, variant: 'danger' });
    }
  };

  const onSelectImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onUploadImage = async () => {
    if (!imageFile) return;
    try {
      const fd = new FormData();
      fd.append('profileImage', imageFile);
      await axios.put('/api/auth/me/profile-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setToast({ show: true, text: 'Profile image updated.', variant: 'success' });
      setImageFile(null);
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.message || 'Image upload failed';
      setToast({ show: true, text: msg, variant: 'danger' });
    }
  };

  const onRemoveImage = async () => {
    try {
      await axios.delete('/api/auth/me/profile-image');
      setToast({ show: true, text: 'Profile image removed.', variant: 'success' });
      setImagePreview(null);
      setImageFile(null);
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.message || 'Removing image failed';
      setToast({ show: true, text: msg, variant: 'danger' });
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    // use toast for notifications
    if (!pwdCurrent || !pwdNew || !pwdConfirm) { 
      const msg = 'All password fields are required.';
      setToast({ show: true, text: msg, variant: 'danger' });
      return; 
    }
    if (pwdNew.length < 8) { 
      const msg = 'New password must be at least 8 characters.';
      setToast({ show: true, text: msg, variant: 'danger' });
      return; 
    }
    if (pwdNew !== pwdConfirm) { 
      const msg = 'Passwords do not match.';
      setToast({ show: true, text: msg, variant: 'danger' });
      return; 
    }
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        confirmNewPassword: pwdConfirm
      });
      setToast({ show: true, text: 'Password changed successfully.', variant: 'success' });
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Password change failed';
      setToast({ show: true, text: msg, variant: 'danger' });
    }
  };

  return (
    <Row className="justify-content-center my-4">
      <Col md={8} lg={6}>
        <Card>
          <Card.Header>Account Settings</Card.Header>
          <Card.Body>
            {/* Centered toast used for all notifications; inline alerts removed */}
            {loading ? (
              <div className="d-flex align-items-center"><Spinner size="sm" className="me-2"/> Loading...</div>
            ) : (
              <Form onSubmit={onSave}>
                <div className="d-flex align-items-center mb-3">
                  <img src={imagePreview || 'https://via.placeholder.com/64'} alt="avatar" style={{width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginRight: 12}}/>
                  <div>
                    <Form.Control type="file" accept="image/*" onChange={onSelectImage} />
                    <div className="mt-2 d-flex gap-2">
                      <Button size="sm" variant="secondary" disabled={!imageFile} onClick={onUploadImage}>Update Photo</Button>
                      <Button size="sm" variant="outline-danger" onClick={onRemoveImage}>Remove Photo</Button>
                    </div>
                  </div>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control value={username} readOnly />
                  <Form.Text className="text-muted">Username cannot be changed.</Form.Text>
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone((e.target.value || '').replace(/[^0-9+\-() ]/g, ''))}
                    placeholder="e.g. +1 555 123 4567"
                    pattern="[0-9+\-() ]{7,20}"
                    title="7-20 characters; digits, spaces, + - ( ) only"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control as="textarea" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Age</Form.Label>
                      <Form.Control type="number" min={0} max={150} value={age} onChange={(e) => setAge(e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-between">
                  <Button variant="primary" type="submit">Save Changes</Button>
                  <Button variant="outline-danger" type="button" onClick={onDelete}>Delete Account</Button>
                </div>
              </Form>
            )}
          </Card.Body>
        </Card>
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete your account? This action cannot be undone.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Account</Button>
          </Modal.Footer>
        </Modal>
        <CenteredToast
          show={toast.show}
          onClose={() => setToast(t => ({ ...t, show: false }))}
          message={toast.text}
          variant={toast.variant}
        />
        <Card className="mt-3">
          <Card.Header>Change Password</Card.Header>
          <Card.Body>
            <Form onSubmit={onChangePassword}>
              <Form.Group className="mb-3">
                <Form.Label>Current Password</Form.Label>
                <Form.Control type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} required />
                <Form.Text className="text-muted">At least 8 characters.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} required />
              </Form.Group>
              <Button variant="primary" type="submit">Change Password</Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default Profile;
