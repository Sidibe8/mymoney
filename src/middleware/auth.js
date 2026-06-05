const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Non authentifié. Veuillez vous connecter.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Session expirée. Veuillez vous reconnecter.'
            });
        }
        return res.status(401).json({
            message: 'Token invalide. Veuillez vous reconnecter.'
        });
    }
};
