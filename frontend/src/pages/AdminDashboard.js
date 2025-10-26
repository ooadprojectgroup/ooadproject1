import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Table, Spinner, Button } from 'react-bootstrap';
import AdminLayout from '../components/AdminLayout';
import { formatLKR } from '../utils/currency';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { FaMoneyBillWave, FaShoppingCart, FaGlobe, FaCashRegister, FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend);

const dateKey = (dt) => `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;

const AdminDashboard = () => {
  const { getAuthToken } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [rangeDays, setRangeDays] = useState(7);

    const fetchAll = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [prodRes, orderRes, txRes] = await Promise.all([
          axios.get('/api/admin/products', { headers }),
          axios.get('/api/admin/orders', { headers }),
          axios.get('/api/admin/transactions', { headers }),
        ]);
        setProducts(prodRes?.data?.data || []);
        setOrders(orderRes?.data?.data || []);
        setTransactions(txRes?.data?.data || []);
      } catch (err) {
        console.error('Dashboard fetch failed', err);
        showToast('Failed to load dashboard data', { variant: 'danger' });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const todayKey = dateKey(new Date());

    const metrics = useMemo(() => {
      const totalProducts = (products || []).length;
      const lowStockList = (products || [])
        .filter(p => {
          const stock = Number(p.stockQuantity ?? 0);
          const min = Number(p.minStockLevel ?? 0);
          return stock <= Math.max(min, 0);
        })
        .sort((a, b) => Number(a.stockQuantity ?? 0) - Number(b.stockQuantity ?? 0));
      const lowStockCount = lowStockList.filter(p => Number(p.stockQuantity ?? 0) > 0).length;
      const outOfStockCount = lowStockList.filter(p => Number(p.stockQuantity ?? 0) === 0).length;

      let revenueToday = 0;
      (transactions || []).forEach(t => {
        if (!t?.transactionDate) return;
        const d = new Date(t.transactionDate);
        if (dateKey(d) === todayKey) {
          const amt = Number(t.netAmount ?? t.totalAmount ?? 0);
          if (!isNaN(amt)) revenueToday += amt;
        }
      });

      let ordersTodayCount = 0;
      (orders || []).forEach(o => {
        if (!o?.placedAt) return;
        const d = new Date(o.placedAt);
        if (dateKey(d) === todayKey) ordersTodayCount += 1;
      });

      const recentOrders = [...(orders || [])]
        .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
        .slice(0, 10);

      return {
        totalProducts,
        lowStockList,
        lowStockCount,
        outOfStockCount,
        revenueToday,
        ordersTodayCount,
        recentOrders,
      };
    }, [products, orders, transactions, todayKey]);

    const lastNDays = (n) => {
      const out = [];
      const base = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const day = new Date(base);
        day.setDate(base.getDate() - i);
        out.push({ key: dateKey(day), label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
      }
      return out;
    };

    const days = useMemo(() => lastNDays(rangeDays), [rangeDays]);

    const revenueSeries = useMemo(() => {
      const revMap = new Map();
      (transactions || []).forEach(t => {
        if (!t?.transactionDate) return;
        const d = new Date(t.transactionDate);
        const k = dateKey(d);
        const amt = Number(t.netAmount ?? t.totalAmount ?? 0);
        revMap.set(k, (revMap.get(k) || 0) + (isNaN(amt) ? 0 : amt));
      });

      const orderMap = new Map();
      (orders || []).forEach(o => {
        if (!o?.placedAt) return;
        const d = new Date(o.placedAt);
        const k = dateKey(d);
        orderMap.set(k, (orderMap.get(k) || 0) + 1);
      });

      const revVals = days.map(d => revMap.get(d.key) || 0);
      const orderVals = days.map(d => orderMap.get(d.key) || 0);

      return {
        labels: days.map(d => d.label),
        datasets: [
          {
            label: 'Revenue',
            data: revVals,
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            tension: 0.25,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Orders',
            data: orderVals,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.15)',
            tension: 0.25,
            fill: true,
            yAxisID: 'y1',
          },
        ],
      };
    }, [transactions, orders, days]);

    const revenueDelta = useMemo(() => {
      const map = new Map();
      (transactions || []).forEach(t => {
        if (!t?.transactionDate) return;
        const d = new Date(t.transactionDate);
        const k = dateKey(d);
        const amt = Number(t.netAmount ?? t.totalAmount ?? 0);
        map.set(k, (map.get(k) || 0) + (isNaN(amt) ? 0 : amt));
      });
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const tVal = map.get(dateKey(today)) || 0;
      const yVal = map.get(dateKey(yesterday)) || 0;
      const diff = tVal - yVal;
      const pct = yVal === 0 ? null : (diff / yVal) * 100;
      return { diff, pct };
    }, [transactions]);

    const ordersByStatusData = useMemo(() => {
      const map = new Map();
      (orders || []).forEach(o => {
        const s = (o.orderStatus || 'UNKNOWN').toUpperCase();
        map.set(s, (map.get(s) || 0) + 1);
      });
      return {
        labels: Array.from(map.keys()),
        datasets: [
          {
            data: Array.from(map.values()),
            backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'],
            borderWidth: 0,
          },
        ],
      };
    }, [orders]);

    const salesBySourceData = useMemo(() => {
      const map = new Map();
      (transactions || []).forEach(t => {
        const s = (t.source || 'UNKNOWN').toUpperCase();
        map.set(s, (map.get(s) || 0) + 1);
      });
      return {
        labels: Array.from(map.keys()),
        datasets: [
          {
            data: Array.from(map.values()),
            backgroundColor: ['#0dcaf0', '#6610f2', '#20c997', '#fd7e14', '#6f42c1'],
            borderWidth: 0,
          },
        ],
      };
    }, [transactions]);

    // Aggregate POS vs ONLINE totals for top KPI cards
    const posOnlineTotals = useMemo(() => {
      const summary = { POS: { count: 0, amount: 0 }, ONLINE: { count: 0, amount: 0 }, OTHER: { count: 0, amount: 0 } };
      (transactions || []).forEach(t => {
        const src = (t.source || 'OTHER').toUpperCase();
        const amt = Number(t.netAmount ?? t.totalAmount ?? 0) || 0;
        if (src.includes('POS')) {
          summary.POS.count += 1;
          summary.POS.amount += amt;
        } else if (src.includes('ONLINE') || src.includes('WEB') || src.includes('E-COM')) {
          summary.ONLINE.count += 1;
          summary.ONLINE.amount += amt;
        } else {
          summary.OTHER.count += 1;
          summary.OTHER.amount += amt;
        }
      });
      return summary;
    }, [transactions]);

    const lowStockBarData = useMemo(() => {
      const list = (metrics.lowStockList || []).slice(0, 5);
      return {
        labels: list.map(p => p.name),
        datasets: [
          {
            label: 'Stock',
            data: list.map(p => Number(p.stockQuantity ?? 0)),
            backgroundColor: 'rgba(255, 193, 7, 0.5)',
            borderColor: '#ffc107',
            borderWidth: 1,
          },
        ],
      };
    }, [metrics.lowStockList]);

    if (loading) {
      return (
        <AdminLayout>
          <div className="py-5 text-center">
            <Spinner animation="border" />
            <p className="mt-3">Loading dashboard...</p>
          </div>
        </AdminLayout>
      );
    }

    const KpiCard = ({ title, value, sub, icon, color, borderColor }) => (
      <Card className="h-100" style={{ borderTop: `3px solid ${borderColor}` }}>
        <Card.Body className="d-flex align-items-center gap-3 py-3">
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}22` // light tint
          }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <div className="flex-grow-1">
            <div className="text-muted small mb-1">{title}</div>
            <div className="fw-semibold" style={{ lineHeight: 1 }}>{value}</div>
            {sub && <div className="small text-muted" style={{ lineHeight: 1.2 }}>{sub}</div>}
          </div>
        </Card.Body>
      </Card>
    );

    return (
      <AdminLayout>
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0">Admin Dashboard</h2>
            <div className="d-inline-flex gap-2 align-items-center">
              <select
                className="form-select form-select-sm w-auto"
                value={rangeDays}
                onChange={(e) => setRangeDays(Number(e.target.value))}
                aria-label="Select range"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <Button size="sm" variant="outline-primary" onClick={fetchAll}>Refresh</Button>
            </div>
          </div>

          {/* KPI Row */}
          <Row className="mb-3 g-3">
            <Col md={6} lg={2}>
              <KpiCard
                title="Revenue Today"
                value={<span className="text-dark">{formatLKR(metrics.revenueToday)}</span>}
                sub={revenueDelta.diff > 0 ? (
                  <span className="text-success">▲ {formatLKR(revenueDelta.diff)}{revenueDelta.pct !== null ? ` (${revenueDelta.pct.toFixed(1)}%)` : ''}</span>
                ) : revenueDelta.diff < 0 ? (
                  <span className="text-danger">▼ {formatLKR(Math.abs(revenueDelta.diff))}{revenueDelta.pct !== null ? ` (${Math.abs(revenueDelta.pct).toFixed(1)}%)` : ''}</span>
                ) : (
                  <span className="text-muted">No change vs yesterday</span>
                )}
                icon={<FaMoneyBillWave />}
                color="#ffc107"
                borderColor="#ffc107"
              />
            </Col>
            <Col md={6} lg={2}>
              <KpiCard
                title="Orders Today"
                value={<span className="text-dark">{metrics.ordersTodayCount}</span>}
                sub={null}
                icon={<FaShoppingCart />}
                color="#0d6efd"
                borderColor="#0d6efd"
              />
            </Col>
            <Col md={6} lg={2}>
              <KpiCard
                title="Online Sales"
                value={<span className="text-dark">{posOnlineTotals.ONLINE.count} orders</span>}
                sub={formatLKR(posOnlineTotals.ONLINE.amount)}
                icon={<FaGlobe />}
                color="#0dcaf0"
                borderColor="#0dcaf0"
              />
            </Col>
            <Col md={6} lg={2}>
              <KpiCard
                title="POS Sales"
                value={<span className="text-dark">{posOnlineTotals.POS.count} orders</span>}
                sub={formatLKR(posOnlineTotals.POS.amount)}
                icon={<FaCashRegister />}
                color="#198754"
                borderColor="#198754"
              />
            </Col>
            <Col md={6} lg={2}>
              <KpiCard
                title="Total Products"
                value={<span className="text-dark">{metrics.totalProducts}</span>}
                sub={null}
                icon={<FaBoxOpen />}
                color="#0d6efd"
                borderColor="#0d6efd"
              />
            </Col>
            <Col md={6} lg={2}>
              <KpiCard
                title="Low / Out of Stock"
                value={<span className="text-dark">{metrics.lowStockCount}/{metrics.outOfStockCount}</span>}
                sub={null}
                icon={<FaExclamationTriangle />}
                color="#dc3545"
                borderColor="#dc3545"
              />
            </Col>
          </Row>

          {/* Main revenue chart */}
          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Revenue & Orders (Last {rangeDays} Days)</h5>
                </Card.Header>
                <Card.Body>
                  {transactions.length === 0 && orders.length === 0 ? (
                    <p className="text-muted mb-0">No transaction data.</p>
                  ) : (
                    <Line
                      data={revenueSeries}
                      options={{
                        plugins: { legend: { display: true, position: 'bottom' } },
                        scales: {
                          y: { type: 'linear', position: 'left', ticks: { callback: (v) => formatLKR(v) } },
                          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true },
                        },
                      }}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Secondary charts */}
          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Header>
                  <h6 className="mb-0">Orders by Status</h6>
                </Card.Header>
                <Card.Body>
                  {orders.length === 0 ? (
                    <p className="text-muted mb-0">No order data.</p>
                  ) : (
                    <Doughnut data={ordersByStatusData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Header>
                  <h6 className="mb-0">Sales by Source</h6>
                </Card.Header>
                <Card.Body>
                  {transactions.length === 0 ? (
                    <p className="text-muted mb-0">No transaction data.</p>
                  ) : (
                    <Doughnut data={salesBySourceData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Low stock + Recent orders */}
          <Row>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Low Stock (Top 5)</h5>
                  <Button size="sm" variant="outline-secondary" href="/admin/products">Manage Products</Button>
                </Card.Header>
                <Card.Body>
                  {metrics.lowStockList.length === 0 ? (
                    <p className="text-muted mb-0">All products are healthy.</p>
                  ) : (
                    <Bar data={lowStockBarData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Recent Orders</h5>
                  <div className="d-inline-flex gap-2">
                    <Button size="sm" variant="outline-secondary" href="/admin/orders">View All</Button>
                    <Button size="sm" variant="outline-success" onClick={() => {
                      try {
                        const rows = metrics.recentOrders || [];
                        const headers = ['Order','Bill Number','Customer','Status','Total','Placed At'];
                        const csv = [headers.join(',')]
                          .concat(rows.map(o => [
                            o.orderId,
                            o.billNumber || '',
                            (o.customerUsername || o.customerEmail || '').replaceAll(',', ' '),
                            o.orderStatus || '',
                            Number(o.netAmount ?? o.totalAmount ?? 0),
                            o.placedAt || ''
                          ].join(',')))
                          .join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'recent-orders.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast('Exported recent orders CSV', { variant: 'success' });
                      } catch (e) {
                        console.error('CSV export failed', e);
                        showToast('Failed to export CSV', { variant: 'danger' });
                      }
                    }}>Export CSV</Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {metrics.recentOrders.length === 0 ? (
                    <p className="text-muted mb-0">No recent orders.</p>
                  ) : (
                    <Table responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.recentOrders.map(o => (
                          <tr key={o.orderId}>
                            <td>#{o.billNumber || o.orderId}</td>
                            <td>{o.customerUsername || o.customerEmail || '-'}</td>
                            <td>{o.orderStatus}</td>
                            <td className="text-end">{formatLKR(Number(o.netAmount ?? o.totalAmount ?? 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </AdminLayout>
    );
  };

  export default AdminDashboard;