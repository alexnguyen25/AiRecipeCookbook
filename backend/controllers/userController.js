import User from '../models/user.js';
import UserPreferences from '../models/UserPreferences.js';

/**
 * Get user profile
 */
export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const preferences = await UserPreferences.findByUserId(req.user.id);

        res.json({
            success: true,
            data: {
                user,
                preferences
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        const user = await User.update(req.user.id, { name, email });

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (req, res, next) => {
    try {
        const preferences = await UserPreferences.upsert(req.user.id, req.body);

        res.json({
            success: true,
            message: 'Preferences updated successfully.',
            data: {
                preferences
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required.'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const isPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid current password.'
            });
        }

        await User.updatePassword(req.user.id, newPassword);

        res.json({
            success: true,
            message: 'Password updated successfully.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user account
 */
export const deleteAccount = async (req, res, next) => {
    try {
        await User.delete(req.user.id);

        res.json({
            success: true,
            message: 'Account deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
