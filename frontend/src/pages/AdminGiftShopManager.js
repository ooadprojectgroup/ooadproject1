import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { formatLKR } from '../utils/currency';

// Lightweight manager UI ported from member project
const AdminGiftShopManager = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/simple-products');
      const api = res.data; // ApiResponse wrapper
      setProducts(api.data || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/simple-products', {
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock || '0', 10)
      });
      setForm({ name: '', price: '', stock: '' });
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add product');
    }
  };

  const updateStock = async (id, newStock) => {
    try {
      if (newStock < 0) return; // guard
      await axios.put(`/api/admin/simple-products/${id}/stock`, { stock: newStock });
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update stock');
    }
  };

  const onDelete = async (id) => {
    try {
      await axios.delete(`/api/admin/simple-products/${id}`);
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete product');
    }
  };

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => (p.stock ?? 0) < 10).length;
  const avgPriceNumber = products.length
    ? (products.reduce((sum, p) => sum + Number(p.price || 0), 0) / products.length)
    : 0;

  return (
    <AdminLayout>
      <div className="p-3">
        <h3 className="mb-3">Gift Shop Manager</h3>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-flex gap-3 mb-4">
          <div className="card p-3"><div className="text-muted">Total Products</div><div className="fs-4">{totalProducts}</div></div>
          <div className="card p-3"><div className="text-muted">Low Stock (&lt; 10)</div><div className="fs-4">{lowStockCount}</div></div>
          <div className="card p-3"><div className="text-muted">Average Price</div><div className="fs-4">{formatLKR(avgPriceNumber, { currencyDisplay: 'code' })}</div></div>
        </div>

        <div className="mb-2 text-muted">Rows in light red are <strong>Low Stock (&lt; 10)</strong>.</div>

        <form className="row g-2 mb-3" onSubmit={onSubmit}>
          <div className="col-md-4">
            <input className="form-control" placeholder="Name" value={form.name}
                   onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <input type="number" className="form-control" placeholder="Price" value={form.price}
                   onChange={e => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <input type="number" className="form-control" placeholder="Stock" value={form.stock}
                   onChange={e => setForm({ ...form, stock: e.target.value })} required />
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-primary" type="submit" disabled={loading}>Add Product</button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th style={{width: '80px'}}>ID</th>
                <th>Name</th>
                <th style={{width: '160px'}}>Price (LKR)</th>
                <th style={{width: '120px'}}>Stock</th>
                <th style={{width: '200px'}}>Update Stock</th>
                <th style={{width: '120px'}}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={(p.stock ?? 0) < 10 ? 'table-danger' : ''}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{formatLKR(p.price, { currencyDisplay: 'code' })}</td>
                  <td>
                    <span className={`badge ${ (p.stock ?? 0) < 10 ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis' }`}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-success" onClick={() => updateStock(p.id, (p.stock ?? 0) + 1)}>+1</button>
                      <button className="btn btn-sm btn-warning" onClick={() => updateStock(p.id, Math.max(0, (p.stock ?? 0) - 1))}>-1</button>
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted">No products</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGiftShopManager;
