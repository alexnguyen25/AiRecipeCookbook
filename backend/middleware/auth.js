import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json ({
                success: false,
                message: 'No authentication token provided, access denied.'
            });
        }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {
                id: decoded.userId,
                email: decoded.email
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error)
            res.status(401).json({
                success: false,
                message: 'Invalid or expired authentication token.'
            });
        }

    };

    export default authMiddleware;

