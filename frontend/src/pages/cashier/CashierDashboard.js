import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Table, Badge, ButtonGroup, ToggleButton, Modal, ListGroup } from 'react-bootstrap';
import { FaSearch, FaBarcode, FaShoppingCart, FaReceipt, FaList, FaThLarge } from 'react-icons/fa';
import '../../styles/pos.css';
import { printHtml } from '../../utils/print';
import { useToast } from '../../contexts/ToastContext';

const CashierDashboard = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [taxRate, setTaxRate] = useState(0.0); // decimal fraction e.g., 0.10 for 10%
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cashier/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      } else {
        showToast('Failed to load products', { variant: 'danger' });
      }
    } catch (error) {
      showToast('Error loading products: ' + error.message, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load current system tax rate (public endpoint)
  useEffect(() => {
    const loadTax = async () => {
      try {
        const res = await fetch('/api/settings/tax');
        if (!res.ok) return;
        const json = await res.json();
        const rate = Number(json?.data?.taxRate ?? 0);
        if (!Number.isNaN(rate)) setTaxRate(rate);
      } catch (_) { /* ignore, default to 0 */ }
    };
    loadTax();
  }, []);

  // Live search (debounced): as the cashier types, update the product list
  useEffect(() => {
    const q = searchQuery.trim();
    // Debounce to avoid spamming the server
    const handle = setTimeout(() => {
      if (!q) {
        // Empty query -> load default list
        loadProducts();
      } else {
        // For live listing, always use name/code/barcode search endpoint
        // We reserve the dedicated barcode endpoint for Enter/explicit action
        searchProducts(q);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Derive category list from loaded products (works even if categories table isn't exposed for POS)
  const categoryOptions = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.categoryName) set.add(p.categoryName); });
    return Array.from(set).sort();
  }, [products]);

  // Apply category filter client-side on the loaded product list
  const visibleProducts = useMemo(() => {
    const list = !selectedCategory ? products : products.filter(p => p.categoryName === selectedCategory);
    // Sort by product name for a stable, predictable order during typing
    return [...list].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
  }, [products, selectedCategory]);

  // Live customer search inside modal (debounced)
  useEffect(() => {
    if (!showCustomerModal) return;
    const term = customerQuery.trim();
    const handle = setTimeout(async () => {
      try {
        setCustomerLoading(true);
        const token = localStorage.getItem('token');
        const qs = term ? `?term=${encodeURIComponent(term)}` : '';
        const res = await fetch(`/api/cashier/customers/search${qs}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to search customers');
        const { data } = await res.json();
        setCustomerResults(Array.isArray(data) ? data : []);
      } catch (e) {
        setCustomerResults([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [customerQuery, showCustomerModal]);

  const searchProducts = async (query) => {
    if (!query.trim()) {
      loadProducts();
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/cashier/products/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      } else {
        showToast('Search failed', { variant: 'danger' });
      }
    } catch (error) {
      showToast('Search error: ' + error.message, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const searchByBarcode = async (barcode) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/cashier/products/barcode/${encodeURIComponent(barcode)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          addToCart(data.data);
        } else {
          showToast('Product not found', { variant: 'warning' });
        }
      } else {
        showToast('Product not found', { variant: 'warning' });
      }
    } catch (error) {
      showToast('Barcode scan error: ' + error.message, { variant: 'danger' });
    }
  };

  const addToCart = (product) => {
    if (product.availableStock <= 0) {
      showToast('Product is out of stock', { variant: 'warning' });
      return;
    }

    const existingItem = cart.find(item => item.productId === product.productId);
    
    if (existingItem) {
      if (existingItem.quantity >= product.availableStock) {
        showToast('Cannot add more items. Insufficient stock.', { variant: 'warning' });
        return;
      }
      
      setCart(cart.map(item =>
        item.productId === product.productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.productId,
        productName: product.productName,
        productCode: product.productCode,
        unitPrice: product.unitPrice,
        quantity: 1,
        availableStock: product.availableStock
      }]);
    }
    
    showToast(`Added ${product.productName} to cart`, { variant: 'success' });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = cart.find(item => item.productId === productId);
    if (newQuantity > product.availableStock) {
      showToast('Cannot exceed available stock', { variant: 'warning' });
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
    const tax = subtotal * (taxRate || 0);
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2)
    };
  };

  const processTransaction = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', { variant: 'warning' });
      return;
    }

    // Customer is optional (walk-in). If none selected, we'll omit customerId.

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const totals = calculateTotal();
      
      const transactionRequest = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0
        })),
        discountAmount: 0,
        taxAmount: parseFloat(totals.tax),
        paymentMethod: paymentMethod
      };

      // Include customerId only if a specific customer is selected
      if (selectedCustomer?.userId) {
        transactionRequest.customerId = selectedCustomer.userId;
      }

      const response = await fetch(`/api/cashier/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionRequest)
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Transaction completed successfully!', { variant: 'success' });
        
        // Clear cart and refresh products
        setCart([]);
        setSelectedCustomer(null);
        loadProducts();

        // Auto open receipt and notify via toast
        showToast('Opening receipt…', { variant: 'info' });
        printReceipt(data.data);
      } else {
        const errorData = await response.json();
        showToast('Transaction failed: ' + (errorData.message || 'Unknown error'), { variant: 'danger' });
      }
    } catch (error) {
      showToast('Transaction error: ' + error.message, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (transactionData) => {
    const receiptHtml = generateReceiptHtml(transactionData);
    try {
      showToast('Opening receipt…', { variant: 'info' });
      await printHtml(receiptHtml, { mode: 'iframe' });
    } catch (e) {
      showToast('Print failed: ' + e.message, { variant: 'danger' });
    }
  };

  const generateReceiptHtml = (transaction) => {
    return `
      <html>
        <head>
          <title>Receipt - ${transaction.billNumber}</title>
          <style>
            body { font-family: monospace; margin: 20px; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>DVP GIFT CENTER</h2>
            <p>Receipt: ${transaction.billNumber}</p>
            <p>Date: ${new Date(transaction.transactionDate).toLocaleString()}</p>
            <p>Cashier: ${transaction.cashierName}</p>
            <p>Customer: ${transaction.customerName}</p>
          </div>
          <div class="items">
            ${transaction.items.map(item => `
              <div class="item">
                <span>${item.productName} x${item.quantity}</span>
                <span>LKR ${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <div class="item">
              <span>Subtotal:</span>
              <span>LKR ${transaction.totalAmount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Tax:</span>
              <span>LKR ${transaction.taxAmount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Total:</span>
              <span>LKR ${transaction.netAmount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Payment Method:</span>
              <span>${transaction.paymentMethod}</span>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <p>Thank you for your purchase!</p>
          </div>
        </body>
      </html>
    `;
  };

  // Toasts handle feedback globally

  const totals = calculateTotal();

  return (
    <div className="pos-system">

      <Container fluid className="py-3">
        <Row>
          {/* Product Selection */}
          <Col lg={8}>
            <Card>
              <Card.Header className="pos-header">
                <Row className="align-items-center">
                  <Col>
                    <h5 className="mb-0">
                      <FaSearch className="me-2" />
                      Product Selection
                    </h5>
                  </Col>
                  <Col xs="auto" className="d-flex align-items-center gap-2">
                    {/* View mode toggle */}
                    <ButtonGroup>
                      <ToggleButton
                        id="pos-view-grid"
                        type="radio"
                        variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                        name="view"
                        value="grid"
                        checked={viewMode === 'grid'}
                        onChange={() => setViewMode('grid')}
                      >
                        <FaThLarge className="me-1" /> Grid
                      </ToggleButton>
                      <ToggleButton
                        id="pos-view-list"
                        type="radio"
                        variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                        name="view"
                        value="list"
                        checked={viewMode === 'list'}
                        onChange={() => setViewMode('list')}
                      >
                        <FaList className="me-1" /> List
                      </ToggleButton>
                    </ButtonGroup>

                    {/* Category filter (client-side) */}
                    <Form.Select
                      size="sm"
                      style={{ minWidth: 180 }}
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Form.Select>

                    <InputGroup>
                      <Form.Control
                        placeholder="Search or scan barcode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchQuery.match(/^\d+$/)) {
                              // If query is all digits, treat as barcode
                              searchByBarcode(searchQuery);
                              setSearchQuery('');
                            } else {
                              searchProducts(searchQuery);
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          if (searchQuery.match(/^\d+$/)) {
                            searchByBarcode(searchQuery);
                            setSearchQuery('');
                          } else {
                            searchProducts(searchQuery);
                          }
                        }}
                      >
                        <FaBarcode />
                      </Button>
                    </InputGroup>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body>
                <div className="pos-scroll" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {loading ? (
                    <div className="text-center p-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : visibleProducts.length === 0 ? (
                    <div className="text-center p-4">
                      <p>No products found</p>
                    </div>
                  ) : viewMode === 'list' ? (
                    <Table hover size="sm" responsive>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Code</th>
                          <th>Category</th>
                          <th className="text-end">Price (LKR)</th>
                          <th className="text-center">Stock</th>
                          <th className="text-end">Add</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleProducts.map(product => (
                          <tr key={product.productId}>
                            <td className="text-truncate" style={{ maxWidth: 220 }}>{product.productName}</td>
                            <td>{product.productCode || '-'}</td>
                            <td>{product.categoryName || '-'}</td>
                            <td className="text-end">{Number(product.unitPrice).toFixed(2)}</td>
                            <td className="text-center">
                              <Badge bg={product.availableStock <= 0 ? 'danger' : product.availableStock <= 10 ? 'warning' : 'success'}>
                                {product.availableStock}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => addToCart(product)}
                                disabled={product.availableStock <= 0}
                              >
                                Add
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Row>
                      {visibleProducts.map(product => (
                        <Col sm={6} md={4} lg={3} key={product.productId} className="mb-3">
                          <Card
                            className={`product-card ${product.availableStock <= 0 ? 'out-of-stock' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => addToCart(product)}
                          >
                            <div className="pos-img-box">
                              <img
                                className="pos-product-img"
                                loading="lazy"
                                alt={product.productName}
                                src={product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                              />
                            </div>
                            <Card.Body className="p-2">
                              <Card.Title className="h6 text-truncate">
                                {product.productName}
                              </Card.Title>
                              <Card.Text className="small">
                                <div>Code: {product.productCode}</div>
                                <div>Price: LKR {product.unitPrice}</div>
                                <div>
                                  Stock:
                                  <Badge bg={product.availableStock <= 0 ? 'danger' : product.availableStock <= 10 ? 'warning' : 'success'} className="ms-1">
                                    {product.availableStock}
                                  </Badge>
                                </div>
                              </Card.Text>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Cart and Checkout */}
          <Col lg={4}>
            <Card className="mb-3">
              <Card.Header>
                <h5 className="mb-0">
                  <FaShoppingCart className="me-2" />
                  Cart ({cart.length} items)
                </h5>
              </Card.Header>
              <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {cart.length === 0 ? (
                  <p className="text-muted text-center">Cart is empty</p>
                ) : (
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={item.productId}>
                          <td>
                            <small className="text-truncate d-block" style={{ maxWidth: '100px' }}>
                              {item.productName}
                            </small>
                            <small className="text-muted">LKR {item.unitPrice}</small>
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              size="sm"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value))}
                              style={{ width: '60px' }}
                            />
                          </td>
                          <td>
                            LKR {(item.unitPrice * item.quantity).toFixed(2)}
                          </td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {/* Totals and Checkout */}
            <Card>
              <Card.Header>
                <h5 className="mb-0">Checkout</h5>
              </Card.Header>
              <Card.Body>
                <Table size="sm" borderless>
                  <tbody>
                    <tr>
                      <td>Subtotal:</td>
                      <td className="text-end">LKR {totals.subtotal}</td>
                    </tr>
                    <tr>
                      <td>Tax ({Math.round((taxRate || 0) * 100)}%):</td>
                      <td className="text-end">LKR {totals.tax}</td>
                    </tr>
                    <tr className="fw-bold border-top">
                      <td>Total:</td>
                      <td className="text-end">LKR {totals.total}</td>
                    </tr>
                  </tbody>
                </Table>

                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Customer</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Walk-in Customer"
                      value={selectedCustomer ? `${selectedCustomer.fullName} (${selectedCustomer.phone || selectedCustomer.email || 'N/A'})` : 'Walk-in Customer'}
                      readOnly
                    />
                    <Button variant="outline-secondary" onClick={() => setShowCustomerModal(true)}>
                      Select Customer
                    </Button>
                    {selectedCustomer && (
                      <Button variant="outline-danger" onClick={() => setSelectedCustomer(null)}>
                        Clear
                      </Button>
                    )}
                  </InputGroup>
                  <Form.Text className="text-muted">Leave as Walk-in Customer if not registered</Form.Text>
                </Form.Group>

                <div className="d-grid">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={processTransaction}
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaReceipt className="me-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Select Customer Modal */}
      <Modal show={showCustomerModal} onHide={() => setShowCustomerModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <Form.Control
              placeholder="Search name, email, phone..."
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              autoFocus
            />
          </InputGroup>
          {customerLoading ? (
            <div className="text-center p-3">
              <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
          ) : customerResults.length === 0 ? (
            <p className="text-muted text-center m-0">No customers found</p>
          ) : (
            <ListGroup style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {customerResults.map(c => (
                <ListGroup.Item key={c.userId} className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{c.fullName}</div>
                    <div className="small text-muted">{c.email || '—'} · {c.phone || '—'}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); }}
                  >
                    Select
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomerModal(false)}>Close</Button>
          <Button variant="outline-danger" onClick={() => { setSelectedCustomer(null); setShowCustomerModal(false); }}>Use Walk-in Customer</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CashierDashboard;