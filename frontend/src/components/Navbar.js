import React from 'react';
import { Navbar as BSNavbar, Nav, Container, Badge, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { FiShoppingCart, FiUser, FiLogOut, FiSettings, FiList } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { resolveImageUrl } from '../utils/url';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isCashier } = useAuth();
  const { getCartItemCount } = useCart();

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" className="navbar-modern">
      <Container>
        <LinkContainer to="/">
          <BSNavbar.Brand>DVP Gift Center</BSNavbar.Brand>
        </LinkContainer>
        
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Home</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/products">
              <Nav.Link>Products</Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav>
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <LinkContainer to="/admin">
                    <Nav.Link>Admin Dashboard</Nav.Link>
                  </LinkContainer>
                )}
                
                {isCashier && (
                  <>
                    <LinkContainer to="/cashier/pos">
                      <Nav.Link>
                        <FiSettings className="me-1" />
                        POS System
                      </Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/cashier/transactions">
                      <Nav.Link>
                        <FiList className="me-1" />
                        Bills
                      </Nav.Link>
                    </LinkContainer>
                  </>
                )}
                
                {/* Only show cart and orders for customers (hide for admin and cashier) */}
                {!isAdmin && !isCashier && (
                  <>
                    <LinkContainer to="/orders">
                      <Nav.Link>My Orders</Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/cart">
                      <Nav.Link>
                        <FiShoppingCart className="me-1" />
                        Cart
                        {getCartItemCount() > 0 && (
                          <Badge bg="danger" className="ms-1">
                            {getCartItemCount()}
                          </Badge>
                        )}
                      </Nav.Link>
                    </LinkContainer>
                  </>
                )}
                
                <NavDropdown
                  align="end"
                  id="user-menu-dropdown"
                  title={
                    <span className="d-inline-flex align-items-center">
                      {user?.profileImage ? (
                        <img
                          src={resolveImageUrl(user.profileImage)}
                          alt={user.username}
                          className="profile-avatar"
                        />
                      ) : (
                        <FiUser size={20} />
                      )}
                    </span>
                  }
                >
                  <NavDropdown.Header>
                    {user?.fullName || user?.username}
                  </NavDropdown.Header>
                  <LinkContainer to="/profile">
                    <NavDropdown.Item>
                      <FiSettings className="me-2" /> Settings
                    </NavDropdown.Item>
                  </LinkContainer>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={logout}>
                    <FiLogOut className="me-2" /> Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>Login</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>Register</Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;