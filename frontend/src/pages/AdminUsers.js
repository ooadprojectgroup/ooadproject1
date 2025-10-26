import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Row, Col, Card, Table, Form, Button, Badge, Modal, InputGroup, Spinner } from 'react-bootstrap';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';

const roles = ['admin','cashier','customer'];

const AdminUsers = () => {
  const { getAuthToken, user: authUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [totalPages, setTotalPages] = useState(0);

  const [term, setTerm] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL'); // ALL/ACTIVE/INACTIVE
  const [sort, setSort] = useState('createdAt,desc');

  const [editUser, setEditUser] = useState(null);
  // Single toggle button (activate/deactivate). Hard delete removed per requirement

  const headers = useMemo(() => ({ Authorization: `Bearer ${getAuthToken()}` }), [getAuthToken]);

  const fetchUsers = useCallback(async (pageArg, sizeArg) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (term) params.set('term', term);
      if (role && role !== 'ALL') params.set('role', role);
      if (status === 'ACTIVE') params.set('active', 'true');
      if (status === 'INACTIVE') params.set('active', 'false');
      params.set('page', String(pageArg));
  params.set('size', String(sizeArg));
      params.set('sort', sort);
      const res = await axios.get(`/api/admin/users?${params.toString()}`, { headers });
      const pg = res.data?.data;
      setUsers(pg?.content || []);
      setTotalPages(pg?.totalPages || 0);
    } catch (e) {
      console.error(e);
      showToast('Failed to load users', { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [headers, term, role, status, sort, showToast]);

  // on filters/sort change: reset to first page and fetch
  useEffect(() => {
    setPage(0);
    fetchUsers(0, PAGE_SIZE);
  }, [fetchUsers, term, role, status, sort]);

  // on initial mount
  useEffect(() => {
    fetchUsers(page, PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRole = async (u, newRole) => {
    if (authUser && u.username === authUser.username) {
      showToast("You can't change your own role here.", { variant: 'warning' });
      return;
    }
    try {
      await axios.put(`/api/admin/users/${u.userId}/role`, newRole, { headers: { ...headers, 'Content-Type': 'text/plain' } });
      showToast('Role updated', { variant: 'success' });
      fetchUsers(page, PAGE_SIZE);
    } catch (e) {
      showToast('Failed to update role', { variant: 'danger' });
    }
  };

  const toggleActive = async (u) => {
    if (authUser && u.username === authUser.username) {
      showToast("You can't deactivate your own account here.", { variant: 'warning' });
      return;
    }
    try {
      if (u.isActive) {
        await axios.put(`/api/admin/users/${u.userId}/deactivate`, {}, { headers });
        showToast('User deactivated', { variant: 'success' });
      } else {
        await axios.put(`/api/admin/users/${u.userId}/activate`, {}, { headers });
        showToast('User activated', { variant: 'success' });
      }
      fetchUsers(page, PAGE_SIZE);
    } catch (e) {
      showToast('Failed to update status', { variant: 'danger' });
    }
  };

  // Hard delete removed; using deactivate/activate only

  const saveEdit = async () => {
    try {
      const payload = {
        email: editUser.email,
        fullName: editUser.fullName,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        phone: editUser.phone,
        address: editUser.address,
        age: editUser.age,
        gender: editUser.gender,
      };
      await axios.put(`/api/admin/users/${editUser.userId}`, payload, { headers });
      showToast('User updated', { variant: 'success' });
      setEditUser(null);
      fetchUsers(page, PAGE_SIZE);
    } catch (e) {
      showToast('Failed to update user', { variant: 'danger' });
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Manage Users</h2>
        </div>

        <Card className="mb-3">
          <Card.Header>
            <Row className="gy-2 align-items-end">
              <Col md={4}>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control placeholder="Search username, email, name" value={term} onChange={e => setTerm(e.target.value)} />
                  <Button variant="outline-secondary" onClick={() => { setPage(0); fetchUsers(0, PAGE_SIZE); }}>Go</Button>
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Label>Role</Form.Label>
                <Form.Select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="ALL">All</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Sort</Form.Label>
                <Form.Select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="createdAt,desc">Newest</option>
                  <option value="createdAt,asc">Oldest</option>
                  <option value="username,asc">Username A-Z</option>
                </Form.Select>
              </Col>
              <Col md={2} className="text-end">
                <Button variant="outline-primary" onClick={() => fetchUsers(page, PAGE_SIZE)}>Refresh</Button>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-4"><Spinner animation="border" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted my-3">No users found.</p>
            ) : (
              <Table responsive hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.userId}>
                      <td>{u.username}</td>
                      <td>{u.fullName || `${u.firstName || ''} ${u.lastName || ''}`}</td>
                      <td>{u.email}</td>
                      <td style={{minWidth:120}}>
                        <Form.Select size="sm" value={u.role} disabled={authUser && u.username === authUser.username} onChange={e => changeRole(u, e.target.value)}>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </Form.Select>
                      </td>
                      <td>
                        <Badge bg={u.isActive ? 'success' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setEditUser({...u})}>Edit</Button>
                        <Button size="sm" variant={u.isActive ? 'outline-warning' : 'outline-success'} disabled={authUser && u.username === authUser.username} onClick={() => toggleActive(u)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
          <Card.Footer className="d-flex justify-content-between align-items-center">
            <div>Page {page + 1} of {Math.max(totalPages, 1)}</div>
            <div className="d-inline-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={page <= 0} onClick={() => { const p = page - 1; setPage(p); fetchUsers(p, PAGE_SIZE); }}>Prev</Button>
              <Button size="sm" variant="outline-secondary" disabled={page + 1 >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchUsers(p, PAGE_SIZE); }}>Next</Button>
            </div>
          </Card.Footer>
        </Card>

        {/* Edit Modal */}
        <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit User</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editUser && (
              <Form>
                <Row className="gy-2">
                  <Col md={6}>
                    <Form.Label>First Name</Form.Label>
                    <Form.Control value={editUser.firstName || ''} onChange={e => setEditUser({ ...editUser, firstName: e.target.value })} />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control value={editUser.lastName || ''} onChange={e => setEditUser({ ...editUser, lastName: e.target.value })} />
                  </Col>
                  <Col md={12}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control value={editUser.fullName || ''} onChange={e => setEditUser({ ...editUser, fullName: e.target.value })} />
                  </Col>
                  <Col md={12}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={editUser.email || ''} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
                  </Col>
                  <Col md={12}>
                    <Form.Label>Phone</Form.Label>
                    <Form.Control value={editUser.phone || ''} onChange={e => setEditUser({ ...editUser, phone: (e.target.value || '').replace(/[^0-9+\-() ]/g,'') })} />
                  </Col>
                  <Col md={12}>
                    <Form.Label>Address</Form.Label>
                    <Form.Control as="textarea" rows={2} value={editUser.address || ''} onChange={e => setEditUser({ ...editUser, address: e.target.value })} />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Age</Form.Label>
                    <Form.Control type="number" min={0} max={150} value={editUser.age ?? ''} onChange={e => setEditUser({ ...editUser, age: e.target.value === '' ? null : Number(e.target.value) })} />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select value={editUser.gender || ''} onChange={e => setEditUser({ ...editUser, gender: e.target.value })}>
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Col>
                </Row>
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save</Button>
          </Modal.Footer>
        </Modal>

        {/* Hard delete removed per requirements */}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
