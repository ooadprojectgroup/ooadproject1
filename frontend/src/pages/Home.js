import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaShippingFast, FaShieldAlt, FaHeadset } from 'react-icons/fa';
import axios from 'axios';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const navigate = useNavigate();

  // Helper to format price and ensure numeric value
  const formatPrice = (value) => {
    const num = Number(value || 0);
    try {
      return new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    } catch (e) {
      return num.toFixed(2);
    }
  };

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        // Fetch server-side computed trending (most bought) products, limited to 10
        const response = await axios.get('/api/online/products/trending', { params: { limit: 10 } });
        if (response.data.success && Array.isArray(response.data.data)) {
          setFeaturedProducts(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchMoreProducts = async () => {
      try {
        const res = await axios.get('/api/online/products');
        if (res.data.success && Array.isArray(res.data.data)) {
          setAllProducts(res.data.data);
        }
      } catch (e) {
        console.error('Error fetching products:', e);
      } finally {
        setMoreLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await axios.get('/api/online/categories');
        if (res.data.success && Array.isArray(res.data.data)) {
          setCategories(res.data.data.slice(0, 10));
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
      } finally {
        setCatLoading(false);
      }
    };

    fetchFeaturedProducts();
    fetchMoreProducts();
    fetchCategories();
  }, []);

  return (
    <div>
      {/* Hero Section - modern full-bleed */}
      <section className="hero-modern">
        <Container>
          <Row className="align-items-center">
            <Col lg={7} className="text-white">
              <h1 className="display-4 fw-bold mb-3">Gifts that make moments</h1>
              <p className="lead mb-4">
                From trending tech to timeless keepsakes—discover thoughtful gifts, curated for every occasion.
              </p>
              <div className="d-flex gap-3">
                <Link to="/products">
                  <Button size="lg" variant="light" className="hero-cta">Shop Now</Button>
                </Link>
                <Link to="/products">
                  <Button size="lg" variant="outline-light">Browse All</Button>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Categories quick picks */}
      <Container className="my-5">
        <Row className="mb-3">
          <Col><h2 className="h4 mb-0">Shop by Category</h2></Col>
        </Row>
        {catLoading ? (
          <div className="text-center py-3">
            <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {categories.map(c => (
              <Link key={c.categoryId} to={`/products?categoryId=${c.categoryId}`} className="text-decoration-none">
                <Badge bg="light" text="dark" className="category-chip">
                  {c.categoryName}
                </Badge>
              </Link>
            ))}
            {categories.length === 0 && (
              <div className="text-muted">No categories available.</div>
            )}
          </div>
        )}
      </Container>

      {/* Trending Products (2 rows, 5x5 like AliExpress) */}
      <Container className="my-5">
        <Row className="mb-3">
          <Col><h2 className="h4 mb-0">Trending Now</h2></Col>
        </Row>
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          </div>
        ) : (
          <>
            {featuredProducts.length > 0 ? (
              <div className="grid-5 home-grid">
                {featuredProducts.slice(0, 10).map(product => (
                  <Card
                    className="product-card"
                    key={product.productId}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/products/${product.productId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/products/${product.productId}`);
                      }
                    }}
                  >
                    <Card.Img 
                      variant="top" 
                      src={product.imageUrl || '/api/placeholder/300/200'} 
                      className="product-image"
                      alt={product.productName}
                      loading="lazy"
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="fs-6 text-truncate" title={product.productName}>{product.productName}</Card.Title>
                      <Card.Text className="small text-truncate">
                        {product.onlineDescription || product.description}
                      </Card.Text>
                      {product.promotionalDetails && (
                        <Card.Text className="text-success small">
                          <strong>{product.promotionalDetails}</strong>
                        </Card.Text>
                      )}
                        <div className="mt-auto d-flex justify-content-between align-items-center">
                        <div className="price-block d-flex align-items-baseline gap-2">
                          <span className="price-lkr text-muted">LKR</span>
                          <span className="price-amount text-primary">{formatPrice(product.onlinePrice || product.price)}</span>
                        </div>
                          {/* Hover/focus indicator to suggest click-through */}
                          <div className="click-indicator" aria-hidden="true">View ›</div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted">No products available.</div>
            )}
          </>
        )}
      </Container>

      {/* More Products with Load More */}
      <Container className="my-5">
        <Row className="mb-3">
          <Col><h2 className="h4 mb-0">More Products</h2></Col>
        </Row>
        {moreLoading ? (
          <div className="text-center py-3">
            <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          </div>
        ) : (
          <>
            {allProducts.length > 0 ? (
              <>
                <div className="grid-5 home-grid">
                  {allProducts.slice(0, visibleCount).map(product => (
                    <Card
                      className="product-card"
                      key={product.productId}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/products/${product.productId}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/products/${product.productId}`);
                        }
                      }}
                    >
                      <Card.Img 
                        variant="top" 
                        src={product.imageUrl || '/api/placeholder/300/200'} 
                        className="product-image"
                        alt={product.productName}
                        loading="lazy"
                      />
                      <Card.Body className="d-flex flex-column">
                        <Card.Title className="fs-6 text-truncate" title={product.productName}>{product.productName}</Card.Title>
                        <Card.Text className="small text-truncate">
                          {product.onlineDescription || product.description}
                        </Card.Text>
                        {product.promotionalDetails && (
                          <Card.Text className="text-success small">
                            <strong>{product.promotionalDetails}</strong>
                          </Card.Text>
                        )}
                        <div className="mt-auto d-flex justify-content-between align-items-center">
                          <div className="price-block d-flex align-items-baseline gap-2">
                            <span className="price-lkr text-muted">LKR</span>
                            <span className="price-amount text-primary">{formatPrice(product.onlinePrice || product.price)}</span>
                          </div>
                          {/* Hover/focus indicator to suggest click-through */}
                          <div className="click-indicator" aria-hidden="true">View ›</div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
                {allProducts.length > visibleCount && (
                  <div className="text-center mt-4">
                    <Button variant="primary" onClick={() => setVisibleCount(c => c + 10)}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted">No products available.</div>
            )}
          </>
        )}
      </Container>

      {/* Features Section */}
      <Container className="my-5">
        <Row>
          <Col>
            <h2 className="text-center mb-5">Why Choose DVP Gift Center?</h2>
          </Col>
        </Row>
        <Row>
          <Col md={4} className="text-center mb-4">
            <div className="mb-3 text-primary"><FaShippingFast size={48} /></div>
            <h4>Fast Shipping</h4>
            <p>Quick and reliable delivery to your doorstep.</p>
          </Col>
          <Col md={4} className="text-center mb-4">
            <div className="mb-3 text-success"><FaShieldAlt size={48} /></div>
            <h4>Secure Shopping</h4>
            <p>Your data and transactions are always protected.</p>
          </Col>
          <Col md={4} className="text-center mb-4">
            <div className="mb-3 text-info"><FaHeadset size={48} /></div>
            <h4>24/7 Support</h4>
            <p>Our customer service team is here to help anytime.</p>
          </Col>
        </Row>
      </Container>

      {/* Newsletter CTA */}
      <Container className="my-5">
        <Card className="border-0 bg-light">
          <Card.Body className="p-4 p-md-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between">
            <div className="mb-3 mb-md-0">
              <h5 className="mb-1">Stay in the loop</h5>
              <div className="text-muted">Get the latest deals and new arrivals in your inbox.</div>
            </div>
            <div className="d-flex gap-2">
              <input type="email" className="form-control" placeholder="Your email" aria-label="Email" />
              <Button variant="primary">Subscribe</Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Home;