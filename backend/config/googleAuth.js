import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export const isGoogleAuthConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// Configure Google OAuth strategy only if credentials are provided
if (isGoogleAuthConfigured) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Here you would typically save the user to your database
            // For now, we'll just pass the profile
            const user = {
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                picture: profile.photos[0].value,
                accessToken
            };
            
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

export default passport;