const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../config/mailer');
const router = express.Router();

const SALT_ROUNDS = 12;

// POST /api/auth/register — email/password signup (sends verification email)
router.post('/register', async (req, res) => {
    const db = req.app.locals.db;
    const { email, password, name, phone, shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existing = db.prepare('SELECT id, verified FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const token = crypto.randomBytes(32).toString('hex');

        db.prepare(
            `INSERT INTO users (email, password_hash, name, provider, verified, verification_token,
             phone, shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip)
             VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        ).run(email, passwordHash, name || null, 'local', token,
              phone || null, shipping_address || null, shipping_address2 || null,
              shipping_city || null, shipping_state || null, shipping_zip || null);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;

        // Always log the verification link to the console for development
        console.log(`\n📧 Verification link for ${email}:\n   ${verifyUrl}\n`);

        try {
            await sendVerificationEmail(email, token, baseUrl);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr.message);
            // Don't fail registration — account is created, link is in the console
        }

        res.json({ message: 'Registration successful. Please check your email to verify your account.' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// GET /api/auth/verify — email verification link
router.get('/verify', (req, res) => {
    const db = req.app.locals.db;
    const { token } = req.query;

    if (!token) {
        return res.redirect('/verify.html?status=error&message=Missing+token');
    }

    const user = db.prepare('SELECT id, email, name, verified FROM users WHERE verification_token = ?').get(token);

    if (!user) {
        return res.redirect('/verify.html?status=error&message=Invalid+or+expired+link');
    }

    if (user.verified) {
        return res.redirect('/verify.html?status=already');
    }

    db.prepare('UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

    // Auto-login the user and redirect to profile completion
    req.login({ id: user.id, email: user.email, name: user.name }, (err) => {
        if (err) {
            // If auto-login fails, still show success but go to login page
            return res.redirect('/verify.html?status=success');
        }
        return res.redirect('/complete-profile.html');
    });
});

// POST /api/auth/login — email/password login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ error: 'Login failed.' });
        if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password.' });
        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: 'Login failed.' });
            res.json({ user: { id: user.id, email: user.email, name: user.name } });
        });
    })(req, res, next);
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.logout(() => {
        res.json({ message: 'Logged out.' });
    });
});

// GET /api/auth/me — current user
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, is_admin: req.user.is_admin } });
    } else {
        res.json({ user: null });
    }
});

// GET /api/auth/profile — full profile with shipping info
router.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in.' });
    }
    const db = req.app.locals.db;
    const user = db.prepare(
        'SELECT id, email, name, phone, organization, shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ profile: user });
});

// PUT /api/auth/profile — update shipping info
router.put('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in.' });
    }
    const db = req.app.locals.db;
    const { name, phone, organization, shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip } = req.body;

    db.prepare(
        `UPDATE users SET name = COALESCE(?, name), phone = ?, organization = ?, shipping_address = ?, shipping_address2 = ?,
         shipping_city = ?, shipping_state = ?, shipping_zip = ? WHERE id = ?`
    ).run(name || null, phone || null, organization || null, shipping_address || null, shipping_address2 || null,
          shipping_city || null, shipping_state || null, shipping_zip || null, req.user.id);

    res.json({ message: 'Profile updated.' });
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// POST /api/auth/forgot-password — generate reset token, print link to terminal
router.post('/forgot-password', async (req, res) => {
    const db = req.app.locals.db;
    const { email } = req.body;

    // Always return success to prevent user enumeration
    const genericMsg = 'If an account with that email exists, a password reset link has been generated. Check the terminal.';

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const user = db.prepare("SELECT id, email FROM users WHERE email = ? AND provider = 'local'").get(email);

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
                .run(token, expires, user.id);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const resetUrl = `${baseUrl}/reset-password.html?token=${encodeURIComponent(token)}`;

            console.log(`\n🔑 Password reset link for ${email}:\n   ${resetUrl}\n`);
        }

        res.json({ message: genericMsg });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// POST /api/auth/reset-password — validate token and set new password
router.post('/reset-password', async (req, res) => {
    const db = req.app.locals.db;
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    try {
        const user = db.prepare(
            "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')"
        ).get(token);

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
            .run(passwordHash, user.id);

        res.json({ message: 'Password has been reset. You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
    (req, res) => {
        res.redirect('/');
    }
);

// Apple OAuth
router.post('/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/login.html?error=apple' }),
    (req, res) => {
        res.redirect('/');
    }
);

router.get('/apple', passport.authenticate('apple'));

module.exports = router;
