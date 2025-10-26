import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatLKR } from '../utils/currency';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [taxRate, setTaxRate] = useState(0.0); // fraction e.g., 0.10

  const formatPrice = (price) => formatLKR(price);

  const handleQuantityChange = (productId, newQuantity) => {
    const item = cartItems.find(item => item.productId === productId);
    
    if (newQuantity < 1) {
      removeFromCart(productId);
    } else if (newQuantity > item.currentStock) {
      // Show toast for exceeding stock
      showToast(`Sorry, only ${item.currentStock} units available in stock for ${item.productName}`, { variant: 'warning' });
      return; // Don't update quantity
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  // Load current global tax rate for display
  useEffect(() => {
    const loadTax = async () => {
      try {
        const res = await axios.get('/api/settings/tax');
        const rate = Number(res?.data?.data?.taxRate ?? 0);
        if (!Number.isNaN(rate)) setTaxRate(rate);
      } catch (_) {
        // ignore, default 0
      }
    };
    loadTax();
  }, []);

  if (cartItems.length === 0) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <Card>
              <Card.Body className="py-5">
                <h2 className="mb-4">Your Cart is Empty</h2>
                <p className="text-muted mb-4">
                  Looks like you haven't added any items to your cart yet.
                </p>
                <Button 
                  as={Link} 
                  to="/products" 
                  variant="primary"
                  size="lg"
                >
                  Start Shopping
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Shopping Cart</h2>
      
      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Items in Your Cart ({cartItems.length})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img 
                            src={item.imageUrl || '/placeholder-product.jpg'}
                            alt={item.productName}
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            className="rounded me-3"
                          />
                          <div>
                            <h6 className="mb-1">{item.productName}</h6>
                            <small className="text-muted">{item.categoryName}</small>
                          </div>
                        </div>
                      </td>
                      <td className="align-middle">
                        {formatPrice(item.onlinePrice)}
                      </td>
                      <td className="align-middle">
                        <Form.Control
                          type="number"
                          min="1"
                          max={item.currentStock}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                          style={{ width: '80px' }}
                        />
                      </td>
                      <td className="align-middle">
                        <strong>{formatPrice(item.onlinePrice * item.quantity)}</strong>
                      </td>
                      <td className="align-middle">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="mt-3 d-flex justify-content-between">
            <Button 
              as={Link} 
              to="/products" 
              variant="outline-primary"
            >
              Continue Shopping
            </Button>
            <Button 
              variant="outline-danger"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </div>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Summary</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <span>Subtotal:</span>
                <span>{formatPrice(getCartTotal())}</span>
              </div>
              
              <div className="d-flex justify-content-between mb-3">
                <span>Shipping:</span>
                <span className="text-success">Free</span>
              </div>
              
              <div className="d-flex justify-content-between mb-3">
                <span>Tax ({Math.round((taxRate || 0) * 100)}%):</span>
                <span>{formatPrice(getCartTotal() * (taxRate || 0))}</span>
              </div>
              
              <hr />
              
              <div className="d-flex justify-content-between mb-4">
                <strong>Total:</strong>
                <strong>{formatPrice(getCartTotal() + (getCartTotal() * (taxRate || 0)))}</strong>
              </div>

              <div className="d-grid">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
              </div>

              <div className="mt-3 text-center">
                <small className="text-muted">
                  Secure checkout powered by SSL encryption
                </small>
              </div>
            </Card.Body>
          </Card>

          <div className="mt-3 p-2 bg-light rounded">
            <small>
              <strong>Free Shipping!</strong> We offer free shipping on all orders.
            </small>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Cart;