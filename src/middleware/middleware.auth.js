import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('🔍 Decoded token ID:', decoded.id);
    
    req.user = await User.findById(decoded.id).select('-password');
    
    console.log('👤 User from DB:', req.user);
    console.log('📋 User role specifically:', req.user?.role);
    console.log('🔎 Role type:', typeof req.user?.role);

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('❌ Protect error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('roles allowed:', roles);
    console.log('user object:', req.user);
    console.log('user role:', req.user?.role);
    console.log('role type:', typeof req.user?.role);
    console.log('includes check:', roles.includes(req.user?.role));
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Only ${roles.join(', ')} can do this.`
      });
    }
    next();
  };
};