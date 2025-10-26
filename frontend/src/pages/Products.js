import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { formatLKR } from '../utils/currency';
import { useToast } from '../contexts/ToastContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    categoryId: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  });
  const [error, setError] = useState('');

  const { addToCart } = useCart();
  const { isAuthenticated, isAdmin, isCashier } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/online/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const response = await axios.get('/api/online/products', { params });
      
      if (response.data.success) {
        setProducts(response.data.data);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error fetching products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Initialize filters from URL query (e.g., /products?categoryId=3&search=phone)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryId = params.get('categoryId') || '';
    const search = params.get('search') || '';
    const minPrice = params.get('minPrice') || '';
    const maxPrice = params.get('maxPrice') || '';
    if (categoryId || search || minPrice || maxPrice) {
      setFilters(prev => ({
        ...prev,
        categoryId,
        search,
        minPrice,
        maxPrice
      }));
    }
    // run once on mount for initial URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      categoryId: '',
      search: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      showToast('Please login to add items to cart', { variant: 'warning' });
      return;
    }
    if (isAdmin || isCashier) {
      showToast('This action is not allowed for your role.', { variant: 'info' });
      return;
    }
    addToCart(product);
    showToast('Product added to cart!', { variant: 'success' });
  };

  // Show errors via toasts
  useEffect(() => {
    if (error) {
      showToast(error, { variant: 'danger' });
    }
  }, [error, showToast]);

  // Informative toast when no products match filters
  useEffect(() => {
    if (!loading && Array.isArray(products) && products.length === 0) {
      showToast('No products found matching your criteria.', { variant: 'info' });
    }
  }, [loading, products, showToast]);

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">Our Products</h1>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      name="categoryId"
                      value={filters.categoryId}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.categoryId} value={category.categoryId}>
                          {category.categoryName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <Form.Control
                      type="text"
                      name="search"
                      placeholder="Search products..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Min Price</Form.Label>
                    <Form.Control
                      type="number"
                      name="minPrice"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Max Price</Form.Label>
                    <Form.Control
                      type="number"
                      name="maxPrice"
                      placeholder="1000"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Errors are shown via toasts */}

      {/* Products Grid */}
      {loading ? (
        <Row>
          <Col className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        </Row>
      ) : products.length === 0 ? (
        <Row>
          <Col className="text-center text-muted">No products found.</Col>
        </Row>
      ) : (
        <Row>
          {products.map(product => (
            <Col lg={4} md={6} className="mb-4" key={product.productId}>
              <Card className="product-card h-100">
                <Card.Img 
                  variant="top" 
                  src={product.imageUrl || '/api/placeholder/300/200'} 
                  className="product-image product-image-contain"
                  alt={product.productName}
                />
                <Card.Body className="d-flex flex-column">
                  <Card.Title>{product.productName}</Card.Title>
                  <Card.Text className="flex-grow-1">
                    {product.onlineDescription || product.description}
                  </Card.Text>
                  
                  {product.promotionalDetails && (
                    <Card.Text className="text-success small">
                      <strong>{product.promotionalDetails}</strong>
                    </Card.Text>
                  )}
                  
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="price-tag">
                        {formatLKR(product.onlinePrice)}
                      </div>
                      <small className="text-muted">
                        Stock: {product.currentStock}
                      </small>
                    </div>
                    
                    <div className="d-grid gap-2">
                      <Link to={`/products/${product.productId}`}>
                        <Button variant="outline-primary" className="w-100">
                          View Details
                        </Button>
                      </Link>
                      {product.currentStock > 0 ? (
                        <Button 
                          variant="primary" 
                          onClick={() => handleAddToCart(product)}
                          disabled={!isAuthenticated || isAdmin || isCashier}
                        >
                          Add to Cart
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled>
                          Out of Stock
                        </Button>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Products;