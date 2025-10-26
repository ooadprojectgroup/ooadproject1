import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { formatLKR } from '../utils/currency';
import { useToast } from '../contexts/ToastContext';

const ProductDetail = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isAdmin, isCashier } = useAuth();

  const fetchProduct = useCallback(async () => {
    try {
      const response = await axios.get(`/api/online/products/${id}`);
      if (response.data.success) {
        setProduct(response.data.data);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      setError('Failed to load product details');
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Show error via toast (must be declared before any early returns)
  useEffect(() => {
    if (error) {
      showToast(error, { variant: 'danger' });
    }
  }, [error, showToast]);

  const handleAddToCart = async () => {
    if (product.currentStock <= 0) {
      setError('This product is out of stock');
      return;
    }
    if (isAdmin || isCashier) {
      showToast('This action is not allowed for your role.', { variant: 'info' });
      return;
    }
    
    setAddingToCart(true);
    try {
      await addToCart(product, 1);
      // Show success toast
      showToast(`${product.productName} added to cart!`, { variant: 'success' });
    } catch (error) {
      setError('Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const formatPrice = (price) => formatLKR(price);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading product details...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Button onClick={() => navigate('/products')}>Back to Products</Button>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-5">
        <Button onClick={() => navigate('/products')}>Back to Products</Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row>
        <Col md={6}>
          <Card className="border-0">
            <div className="pd-img-box">
              <img
                src={product.imageUrl || '/placeholder-product.jpg'}
                alt={product.productName}
                className="pd-img"
                loading="lazy"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-product.jpg'; }}
              />
            </div>
          </Card>
        </Col>
        <Col md={6}>
          <div className="ps-md-4">
            <h1 className="mb-3">{product.productName}</h1>
            
            <div className="mb-3">
              <Badge 
                bg={product.categoryName === 'Gift Cards' ? 'primary' : 'secondary'}
                className="me-2"
              >
                {product.categoryName}
              </Badge>
              <Badge 
                bg={product.currentStock > 0 ? 'success' : 'danger'}
              >
                {product.currentStock > 0 ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>

            <h2 className="text-primary mb-3">
              {formatPrice(product.onlinePrice)}
            </h2>

            <div className="mb-4">
              <h5>Description</h5>
              <p>{product.onlineDescription || product.description || 'No description available'}</p>
            </div>

            {product.promotionalDetails && (
              <div className="mb-4 p-3 bg-success-subtle border border-success rounded">
                <h6 className="text-success mb-2">Promotion</h6>
                <p className="mb-0 text-success">
                  <strong>{product.promotionalDetails}</strong>
                </p>
              </div>
            )}

            {product.categoryName === 'Gift Cards' && (
              <div className="mb-4">
                <h6>Gift Card Details</h6>
                <ul>
                  <li>Digital delivery via email</li>
                  <li>Valid for 12 months from purchase date</li>
                  <li>Can be used for any products in store</li>
                  <li>Non-refundable but transferable</li>
                </ul>
              </div>
            )}

            <div className="mb-4">
              <strong>Stock Available: </strong>
              <span className={product.currentStock < 10 ? 'text-warning' : 'text-success'}>
                {product.currentStock} units
              </span>
            </div>

            <div className="d-grid gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                disabled={product.currentStock === 0 || addingToCart || isAdmin || isCashier}
              >
                {addingToCart ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Adding to Cart...
                  </>
                ) : (
                  product.currentStock > 0 ? 'Add to Cart' : 'Out of Stock'
                )}
              </Button>
              
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/products')}
              >
                Continue Shopping
              </Button>
            </div>

            {product.category === 'Gift Cards' && (
              <div className="mt-4 p-3 bg-light rounded">
                <small>
                  <strong>Note:</strong> Gift cards are delivered digitally and will be sent to your email address after purchase completion.
                </small>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Errors are shown via toasts; keeping layout clean */}
    </Container>
  );
};

export default ProductDetail;