const jwt = require('jsonwebtoken');

/**
 * Authentication middleware - verifies JWT token
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado. Faça login novamente.' });
        }
        return res.status(401).json({ message: 'Token inválido' });
    }
};

/**
 * Admin-only middleware - must be used AFTER authMiddleware
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autenticado' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

/**
 * Optional auth - attaches user if token exists, but doesn't block
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Token invalid, but we allow the request to continue
            req.user = null;
        }
    }
    next();
};

module.exports = { authMiddleware, adminOnly, optionalAuth };
