import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import AdminLayout from '../components/AdminLayout';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

const AdminSettings = () => {
  const [taxRate, setTaxRate] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/admin/settings/tax');
        if (res.data?.success) {
          const rate = res.data.data?.taxRate ?? 0;
          setTaxRate(String(rate));
        }
      } catch (e) {
        showToast('Failed to load tax rate', 'danger');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const parseRate = (v) => {
    const n = Number(v);
    if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
    return n;
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { taxRate: parseRate(taxRate) };
      const res = await axios.put('/api/admin/settings/tax', body);
      if (res.data?.success) {
        showToast('Tax rate updated', 'success');
      } else {
        showToast(res.data?.message || 'Failed to update', 'danger');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to update tax rate', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Card>
        <Card.Header>
          <h5 className="mb-0">System Settings</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            <Form onSubmit={onSave}>
              <Row className="align-items-end g-3">
                <Col md={4}>
                  <Form.Label>Tax Rate (as decimal fraction)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                  <Form.Text muted>Example: 0.05 = 5% VAT</Form.Text>
                </Col>
                <Col md="auto">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                </Col>
              </Row>
            </Form>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
};

export default AdminSettings;
