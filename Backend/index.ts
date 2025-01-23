// index.ts
import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { google } from 'googleapis';
import cors from 'cors';
import dotenv from 'dotenv';

// Type definitions
interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status: string;
  created: string;
  updated: string;
}

interface CalendarQueryParams {
  startDate?: string;
  endDate?: string;
}

// Initialize
dotenv.config();
const app = express();

// In-memory user store
const users = new Map<string, User>();

// Extend Express Session types
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: string;
    };
  }
}

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
  done(null, (user as User).id);
});

passport.deserializeUser((id: string, done) => {
  const user = users.get(id);
  if (user) {
    done(null, user);
  } else {
    done(new Error('User not found'), null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback',
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
  },
  async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any) => void) => {
    try {
      // Create or update user object
      const user: User = {
        id: profile.id,
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0].value ?? '',
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
const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authenticatedReq = req as AuthenticatedRequest;
  if (authenticatedReq.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Calendar service
const getCalendarEvents = async (
  accessToken: string,
  refreshToken: string | undefined,
  startDate?: string,
  endDate?: string
): Promise<GoogleCalendarEvent[]> => {
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

    return response.data.items as GoogleCalendarEvent[];
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

// app.get('/api/profile', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
//   res.json({ user: req.user });
// });

app.get('/api/calendar/events', 
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const { startDate, endDate } = authenticatedReq.query as CalendarQueryParams;
      const user = authenticatedReq.user as User;

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

app.get('/api/logout', (req: Request, res: Response) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

// Error handler
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
};

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;