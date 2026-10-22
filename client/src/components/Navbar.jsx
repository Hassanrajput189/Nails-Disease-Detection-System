import { Navbar as BsNavbar, Nav, Button } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import { APP_NAME } from './AuthLayout.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <BsNavbar className="glass top-nav mx-auto mt-3 px-3" expand={false}>
      <BsNavbar.Brand className="logo"><Logo size={34} /><span className="d-none d-sm-inline">{APP_NAME}</span></BsNavbar.Brand>
      <Nav className="flex-row gap-1">
        <Nav.Link as={NavLink} to="/" end className="pill-link">Predict</Nav.Link>
        <Nav.Link as={NavLink} to="/results" className="pill-link">Results</Nav.Link>
      </Nav>
      <div className="d-flex align-items-center gap-2">
        <span className="d-none d-md-inline">{user.name}</span>
        <div className="avatar">{user.name[0].toUpperCase()}</div>
        <Button variant="outline-light" size="sm" className="rounded-pill" onClick={logout}>Log out</Button>
      </div>
    </BsNavbar>
  );
}
