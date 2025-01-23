const express = require('express');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

// Type definitions (as comments for JS)
// Equivalent interfaces from TypeScript are represented as comments

const app = express();

// In-memory user store
const users = new Map();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.get(id);
  if (user) {
    done(null, user);
  } else {
    done(new Error('User not found'), null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback',
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Create or update user object
      const user = {
        id: profile.id,
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value ?? '',
        accessToken,
        refreshToken,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory
      users.set(profile.id, user);
      return done(null, user);
    } catch (error) {
      console.error('Error during user creation:', error);
      return done(error, null);
    }
  }
));

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Calendar service
const getCalendarEvents = async (accessToken, refreshToken, startDate, endDate) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate || new Date().toISOString(),
      timeMax: endDate,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Routes
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { 
    successRedirect: process.env.CLIENT_URL || 'http://localhost:3000/dashboard',
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:3000/login' 
  })
);

app.get('/api/calendar/events', 
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const user = req.user;

      console.log('Fetching events for user:', startDate, endDate, user);

      const events = await getCalendarEvents(
        user.accessToken,
        user.refreshToken,
        startDate,
        endDate
      );
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  }
);

app.get('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

// Error handler
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
};

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;