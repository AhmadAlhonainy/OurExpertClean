import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { createGoogleMeetMeeting } from "./googleCalendar";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail, sendNewBookingNotificationToMentor, sendPasswordResetEmail } from "./sendgrid";
import crypto from "crypto";
import { 
  insertExperienceSchema, 
  insertAvailabilitySchema, 
  insertBookingSchema, 
  insertReviewSchema,
  insertCommissionRuleSchema,
  insertUserSchema,
  insertMessageSchema
} from "@shared/schema";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// WebSocket connections map: conversationId -> Set of WebSocket connections
const conversationConnections = new Map<string, Set<WebSocket>>();
const userConnections = new Map<string, Set<WebSocket>>();

function broadcastToConversation(conversationId: string, message: any) {
  const connections = conversationConnections.get(conversationId);
  if (connections) {
    console.log(`🔊 Conversation ${conversationId} has ${connections.size} connected clients`);
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        console.log(`✅ Sent message to client in conversation ${conversationId}`);
      }
    });
  } else {
    console.log(`⚠️ No connections in conversation ${conversationId}`);
  }
}

function broadcastToUser(userId: string, message: any) {
  const connections = userConnections.get(userId);
  if (connections) {
    console.log(`🔊 User ${userId} has ${connections.size} connected clients`);
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        console.log(`✅ Sent message to user ${userId}`);
      }
    });
  } else {
    console.log(`⚠️ User ${userId} has no active WebSocket connections`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (from Replit Auth blueprint)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      console.log(`📧 User request: ID=${userId}, Email=${email}`);
      
      let user = await storage.getUser(userId);
      console.log(`👤 User from DB: role=${user?.role}, email=${user?.email}`);
      
      // Check if this email should be an admin
      const isAdmin = await storage.isAdminEmail(email);
      console.log(`🔐 Is admin email check for ${email}: ${isAdmin}`);
      
      if (user && email && isAdmin) {
        // Auto-promote to admin if not already
        if (user.role !== 'admin') {
          console.log(`🔐 Auto-promoting ${email} to admin role`);
          user = await storage.updateUser(userId, { role: 'admin' }) || user;
          console.log(`✅ Updated user role to: ${user?.role}`);
        } else {
          console.log(`✅ User ${email} already has admin role`);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sign Up endpoint
  app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "This email is already registered" });
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Create user
      const userId = await storage.createUser({
        email,
        name,
        passwordHash,
        role: role || 'learner',
      });

      // Check if this email should be an admin
      const isAdmin = await storage.isAdminEmail(email);
      if (isAdmin && userId.role !== 'admin') {
        await storage.updateUser(userId.id, { role: 'admin' });
      }

      // Create a session
      const userSession: any = {
        claims: { sub: userId.id, email: email },
        access_token: '',
        refresh_token: '',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
      };

      req.login(userSession, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after signup" });
        }
        res.status(201).json({ success: true, user: userId });
      });
    } catch (error) {
      console.error("Sign up error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Sign In endpoint - Production mode with email and password
  app.post('/api/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      }

      console.log(`🔑 Signin attempt for email: ${email}`);

      // Find user by email
      let user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      console.log(`👤 Found user: ID=${user.id}, Role=${user.role}`);

      // Verify password
      if (!user.passwordHash) {
        return res.status(401).json({ message: "هذا الحساب مسجّل عبر Google. الرجاء استخدام تسجيل الدخول بـ Google" });
      }

      const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`❌ Invalid password for user: ${email}`);
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      console.log(`✅ Password verified for user: ${email}`);

      // Check if this email should be an admin and update role if needed
      const isAdmin = await storage.isAdminEmail(email);
      console.log(`🔐 Is admin email: ${isAdmin}`);
      
      if (isAdmin && user.role !== 'admin') {
        console.log(`🔄 Updating user role to admin`);
        user = await storage.updateUser(user.id, { role: 'admin' }) || user;
      }

      // Create a session matching OIDC structure for compatibility with isAuthenticated
      const userSession: any = {
        claims: { 
          sub: user.id, 
          email: email,
          first_name: user.name?.split(' ')[0] || '',
          last_name: user.name?.split(' ').slice(1).join(' ') || '',
        },
        access_token: 'email-signin-token',
        refresh_token: 'email-signin-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
      };

      console.log(`📝 Creating session for user: ${user.id}`);

      req.login(userSession, (err) => {
        if (err) {
          console.error(`❌ Login error:`, err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Ensure session is saved before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error(`❌ Session save error:`, saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log(`✅ Session saved successfully for ${email}, role: ${user!.role}`);
          res.json({ success: true, user });
        });
      });
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  // Forgot Password - Request reset link
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      console.log(`🔑 Password reset request for email: ${email}`);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
        return res.json({ success: true, message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور" });
      }

      // Check if user uses Google auth (no password)
      if (!user.passwordHash) {
        console.log(`⚠️ Password reset requested for Google-only account: ${email}`);
        return res.json({ success: true, message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to user
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpires,
      } as any);

      // Build reset link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      // Send email
      const emailSent = await sendPasswordResetEmail({
        recipientEmail: email,
        recipientName: user.name || 'المستخدم',
        resetLink,
      });

      if (!emailSent) {
        console.error(`❌ Failed to send password reset email to ${email}`);
        return res.status(500).json({ message: "فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً" });
      }

      console.log(`✅ Password reset email sent to ${email}`);
      res.json({ success: true, message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "حدث خطأ. يرجى المحاولة لاحقاً" });
    }
  });

  // Reset Password - Verify token and set new password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "التوكن وكلمة المرور مطلوبان" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
      }

      console.log(`🔑 Password reset attempt with token`);

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        console.log(`❌ Invalid or expired reset token`);
        return res.status(400).json({ message: "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية" });
      }

      // Check if token is expired
      if (user.resetTokenExpires && new Date() > new Date(user.resetTokenExpires)) {
        console.log(`❌ Expired reset token for user: ${user.email}`);
        return res.status(400).json({ message: "رابط إعادة تعيين كلمة المرور منتهي الصلاحية" });
      }

      // Hash new password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      } as any);

      console.log(`✅ Password reset successful for user: ${user.email}`);
      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "حدث خطأ. يرجى المحاولة لاحقاً" });
    }
  });

  // ==================== EXPERIENCE ROUTES ====================

  // GET /api/experiences - Get all experiences with optional filters
  app.get('/api/experiences', async (req, res) => {
    try {
      const { category, city, mentorId, search } = req.query;
      const filters: any = {};
      
      if (category) filters.category = category as string;
      if (city) filters.cities = city as string;
      if (mentorId) filters.mentorId = mentorId as string;
      if (search) filters.search = search as string;
      
      // Only show approved experiences to public
      filters.approvalStatus = 'approved';
      
      const experiences = await storage.getExperiences(filters);
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      res.status(500).json({ message: "Failed to fetch experiences" });
    }
  });

  // GET /api/my-experiences - Get mentor's own experiences (all statuses)
  app.get('/api/my-experiences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'mentor' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Only mentors and admins can access their experiences" });
      }

      // Get all experiences for this mentor/admin (pending, approved, rejected)
      const experiences = await storage.getExperiences({ mentorId: userId });
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching mentor experiences:", error);
      res.status(500).json({ message: "Failed to fetch experiences" });
    }
  });

  // GET /api/experiences/:id - Get single experience
  app.get('/api/experiences/:id', async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      res.json(experience);
    } catch (error) {
      console.error("Error fetching experience:", error);
      res.status(500).json({ message: "Failed to fetch experience" });
    }
  });

  // POST /api/experiences - Create experience (protected, mentor or admin)
  app.post('/api/experiences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'mentor' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Only mentors and admins can create experiences" });
      }

      // Note: Stripe Connect is now optional - mentors can create experiences without it
      // They will need to connect Stripe later to receive payments

      console.log("📝 Creating experience - Received data:", JSON.stringify(req.body, null, 2));

      const validatedData = insertExperienceSchema.parse({
        ...req.body,
        mentorId: userId,
        price: req.body.price?.toString() || "0",
      });

      console.log("✅ Validated data:", JSON.stringify(validatedData, null, 2));

      const experience = await storage.createExperience(validatedData);
      res.status(201).json(experience);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating experience:", error);
      res.status(500).json({ message: "Failed to create experience" });
    }
  });

  // PATCH /api/experiences/:id - Update experience (protected, owner only)
  app.patch('/api/experiences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      if (experience.mentorId !== userId) {
        return res.status(403).json({ message: "You can only update your own experiences" });
      }

      const validatedData = insertExperienceSchema.partial().parse(req.body);
      const updated = await storage.updateExperience(req.params.id, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating experience:", error);
      res.status(500).json({ message: "Failed to update experience" });
    }
  });

  // DELETE /api/experiences/:id - Delete experience (protected, owner only)
  app.delete('/api/experiences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      if (experience.mentorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own experiences" });
      }

      await storage.deleteExperience(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting experience:", error);
      res.status(500).json({ message: "Failed to delete experience" });
    }
  });

  // ==================== AVAILABILITY ROUTES ====================

  // GET /api/experiences/:id/availability - Get available slots for an experience (public - needed for booking)
  app.get('/api/experiences/:id/availability', async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      // Return only non-booked availability slots for public view
      const availability = await storage.getAvailability(req.params.id);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // GET /api/availability/slot/:id - Get a single availability slot
  app.get('/api/availability/slot/:id', async (req, res) => {
    try {
      const availability = await storage.getAvailabilityById(req.params.id);
      if (!availability) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability slot:", error);
      res.status(500).json({ message: "Failed to fetch availability slot" });
    }
  });

  // POST /api/experiences/:id/availability - Add availability slots (protected, mentor only)
  app.post('/api/experiences/:id/availability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      if (experience.mentorId !== userId) {
        return res.status(403).json({ message: "You can only add availability to your own experiences" });
      }

      const validatedData = insertAvailabilitySchema.parse({
        ...req.body,
        experienceId: req.params.id
      });

      // Database unique constraint prevents duplicates (race-condition safe)
      const availability = await storage.createAvailability(validatedData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      // Handle unique constraint violation from database
      if (error instanceof Error && (error.message.includes("duplicate key") || error.message.includes("unique constraint"))) {
        return res.status(400).json({ message: "هذا الوقت موجود بالفعل في قائمة الأوقات المتاحة" });
      }
      console.error("Error creating availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  // DELETE /api/availability/:id - Delete availability slot (protected, mentor only)
  app.delete('/api/availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const availability = await storage.getAvailabilityById(req.params.id);
      
      if (!availability) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // SECURITY: Verify ownership FIRST before revealing booking status
      const experience = await storage.getExperience(availability.experienceId);
      if (!experience || experience.mentorId !== userId) {
        return res.status(403).json({ message: "You can only delete availability from your own experiences" });
      }
      
      // THEN check if the availability is already booked
      if (availability.isBooked) {
        return res.status(400).json({ message: "Cannot delete a booked slot" });
      }

      const deleted = await storage.deleteAvailability(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete availability" });
      }
      
      res.json({ success: true, message: "تم حذف الوقت المتاح بنجاح" });
    } catch (error) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // ==================== BOOKING ROUTES ====================

  // GET /api/bookings - Get user's bookings with populated experience and learner/mentor details
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let bookings;
      if (user.role === 'mentor' || user.role === 'admin') {
        // For mentors and admins, get bookings where they are the mentor
        const mentorBookings = await storage.getBookingsByMentor(userId);
        const learnerBookings = await storage.getBookingsByLearner(userId);
        // Combine both and remove duplicates
        const allBookingsMap = new Map();
        [...mentorBookings, ...learnerBookings].forEach(b => allBookingsMap.set(b.id, b));
        bookings = Array.from(allBookingsMap.values());
      } else {
        bookings = await storage.getBookingsByLearner(userId);
      }
      
      // Populate each booking with experience and user details
      const populatedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const experience = await storage.getExperience(booking.experienceId);
          const learner = await storage.getUser(booking.learnerId);
          const mentor = await storage.getUser(booking.mentorId);
          return {
            ...booking,
            experience,
            learner,
            mentor
          };
        })
      );
      
      res.json(populatedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // GET /api/bookings/:id - Get single booking with populated details
  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is either the learner or the mentor for this booking
      if (booking.learnerId !== userId && booking.mentorId !== userId) {
        return res.status(403).json({ message: "You don't have access to this booking" });
      }
      
      // Populate with experience and user details
      const experience = await storage.getExperience(booking.experienceId);
      const learner = await storage.getUser(booking.learnerId);
      const mentor = await storage.getUser(booking.mentorId);
      
      const populatedBooking = {
        ...booking,
        experience,
        learner,
        mentor
      };
      
      res.json(populatedBooking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // POST /api/bookings - Create booking (protected)
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { experienceId, availabilityId } = req.body;
      
      const experience = await storage.getExperience(experienceId);
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }

      // Verify availability exists, belongs to this experience, and is not booked
      const availability = await storage.getAvailabilityById(availabilityId);
      if (!availability) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      if (availability.experienceId !== experienceId) {
        return res.status(400).json({ message: "Availability slot does not belong to this experience" });
      }
      
      if (availability.isBooked) {
        return res.status(400).json({ message: "This time slot is already booked" });
      }

      // Calculate fees
      const commissionRate = await storage.getCommissionRate(experienceId, experience.mentorId);
      const totalAmount = parseFloat(experience.price);
      const platformFee = (totalAmount * commissionRate) / 100;
      const mentorAmount = totalAmount - platformFee;

      // Calculate review deadline (24 hours after session)
      const reviewDeadline = new Date(availability.date);
      reviewDeadline.setHours(reviewDeadline.getHours() + 24);

      const validatedData = insertBookingSchema.parse({
        experienceId,
        learnerId: userId,
        mentorId: experience.mentorId,
        availabilityId,
        sessionDate: availability.date, // Use date from availability, not client
        reviewDeadline,
        totalAmount: totalAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        mentorAmount: mentorAmount.toFixed(2),
        status: 'pending',
        paymentStatus: 'pending'
      });

      const booking = await storage.createBooking(validatedData);
      
      // NOTE: Availability will be marked as booked only after payment is confirmed
      // This prevents blocking slots without payment
      
      // Send email notification to mentor about new booking
      try {
        const mentor = await storage.getUser(experience.mentorId);
        const learner = await storage.getUser(userId);
        
        if (mentor?.email) {
          const sessionDateFormatted = format(new Date(availability.date), "EEEE d MMMM yyyy - h:mm a", { locale: ar });
          
          await sendNewBookingNotificationToMentor({
            mentorEmail: mentor.email,
            mentorName: mentor.name || 'المرشد',
            learnerName: learner?.name || 'المتعلم',
            experienceTitle: experience.title,
            sessionDate: sessionDateFormatted,
          });
          console.log(`📧 New booking notification sent to mentor: ${mentor.email}`);
        }
      } catch (emailError) {
        console.error("Error sending new booking notification email:", emailError);
        // Don't fail the booking creation if email fails
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // POST /api/bookings/:id/accept - Mentor accepts a booking
  app.post('/api/bookings/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify user is actually a mentor or admin
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'mentor' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Only mentors or admins can accept bookings" });
      }
      
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the mentor who owns this booking or an admin can accept it
      if (booking.mentorId !== userId && user.role !== 'admin') {
        return res.status(403).json({ message: "Only the mentor can accept this booking" });
      }
      
      // Can only accept pending bookings
      if (booking.status !== 'pending') {
        return res.status(400).json({ message: `Cannot accept booking with status: ${booking.status}` });
      }

      // Get experience and learner details for meeting
      const experience = await storage.getExperience(booking.experienceId);
      const learner = await storage.getUser(booking.learnerId);
      
      let meetingLink = null;
      let meetingEventId = null;
      
      // Create Google Meet meeting
      try {
        const attendeeEmails = [];
        if (learner?.email) attendeeEmails.push(learner.email);
        if (user?.email) attendeeEmails.push(user.email);
        
        const meetingTitle = `جلسة: ${experience?.title || 'تجربة'} - ${learner?.name || 'متعلم'} و ${user?.name || 'مرشد'}`;
        const meetingDescription = `تجربة تعليمية عبر منصة WisdomConnect\n\nالتجربة: ${experience?.title}\nالمرشد: ${user?.name}\nالمتعلم: ${learner?.name}`;
        
        const meetingDetails = await createGoogleMeetMeeting(
          meetingTitle,
          meetingDescription,
          new Date(booking.sessionDate),
          60, // 60 minutes duration
          attendeeEmails
        );
        
        meetingLink = meetingDetails.meetingLink;
        meetingEventId = meetingDetails.eventId;
        console.log(`✅ Created Google Meet: ${meetingLink}`);
      } catch (meetError: any) {
        console.error("Error creating Google Meet:", meetError);
        // Continue without meeting - don't fail the booking acceptance
      }
      
      // Update booking status to confirmed
      const updated = await storage.updateBooking(req.params.id, { 
        status: 'confirmed'
      });
      
      // Create conversation between mentor and learner
      const conversation = await storage.createConversation({
        bookingId: booking.id,
        mentorId: booking.mentorId,
        learnerId: booking.learnerId,
        meetingLink: meetingLink,
        meetingEventId: meetingEventId,
        isActive: true,
      });
      
      // Send automatic first message with meeting details
      const sessionDateFormatted = format(new Date(booking.sessionDate), "EEEE d MMMM yyyy - h:mm a", { locale: ar });
      
      let welcomeMessage = `🎉 تم قبول حجزك!\n\n📅 موعد الجلسة: ${sessionDateFormatted}\n\n📚 التجربة: ${experience?.title || 'تجربة'}`;
      
      if (meetingLink) {
        welcomeMessage += `\n\n🔗 رابط الاجتماع (Google Meet):\n${meetingLink}\n\n⏰ انضم للاجتماع في الوقت المحدد`;
      }
      
      welcomeMessage += `\n\nيمكنكم التواصل هنا قبل الجلسة. نتمنى لكم تجربة مثمرة! ✨`;
      
      await storage.createMessage({
        conversationId: conversation.id,
        senderId: booking.mentorId,
        content: welcomeMessage,
        messageType: 'system',
        isRead: false,
      });
      
      // Notify connected WebSocket clients
      broadcastToConversation(conversation.id, {
        type: 'new_conversation',
        conversationId: conversation.id,
        meetingLink: meetingLink,
      });
      
      // Send confirmation emails to both mentor and learner
      try {
        // Send email to learner
        if (learner?.email) {
          await sendBookingConfirmationEmail({
            recipientEmail: learner.email,
            recipientName: learner.name || 'المتعلم',
            experienceTitle: experience?.title || 'تجربة',
            mentorName: user?.name || 'المرشد',
            learnerName: learner.name || 'المتعلم',
            sessionDate: sessionDateFormatted,
            meetingLink: meetingLink,
            isMentor: false
          });
        }
        
        // Send email to mentor
        if (user?.email) {
          await sendBookingConfirmationEmail({
            recipientEmail: user.email,
            recipientName: user.name || 'المرشد',
            experienceTitle: experience?.title || 'تجربة',
            mentorName: user.name || 'المرشد',
            learnerName: learner?.name || 'المتعلم',
            sessionDate: sessionDateFormatted,
            meetingLink: meetingLink,
            isMentor: true
          });
        }
        console.log('✅ Confirmation emails sent to both parties');
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Continue even if email fails - booking is already confirmed
      }
      
      res.json({ 
        success: true, 
        booking: updated, 
        conversation: conversation,
        meetingLink: meetingLink,
        message: "تم قبول الحجز وإنشاء غرفة الدردشة بنجاح" 
      });
    } catch (error) {
      console.error("Error accepting booking:", error);
      res.status(500).json({ message: "Failed to accept booking" });
    }
  });

  // POST /api/bookings/:id/reject - Mentor rejects a booking
  app.post('/api/bookings/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      // Verify user is actually a mentor or admin
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'mentor' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Only mentors or admins can reject bookings" });
      }
      
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the mentor who owns this booking or an admin can reject it
      if (booking.mentorId !== userId && user.role !== 'admin') {
        return res.status(403).json({ message: "Only the mentor can reject this booking" });
      }
      
      // Can only reject pending bookings
      if (booking.status !== 'pending') {
        return res.status(400).json({ message: `Cannot reject booking with status: ${booking.status}` });
      }
      
      // Get experience and learner for email notification
      const experience = await storage.getExperience(booking.experienceId);
      const learner = await storage.getUser(booking.learnerId);

      // Update booking status to cancelled
      const updated = await storage.updateBooking(req.params.id, { 
        status: 'cancelled',
        paymentStatus: 'refunded' // Mark for refund if payment was made
      });
      
      // Free up the availability slot using storage method
      const released = await storage.releaseAvailability(booking.availabilityId, booking.id);
      if (!released) {
        console.warn(`Failed to release availability slot ${booking.availabilityId} for booking ${booking.id}`);
      }
      
      // If payment was already held, trigger refund
      if (booking.paymentStatus === 'held' && booking.stripePaymentIntentId) {
        try {
          await storage.refundPayment(booking.id);
        } catch (refundError) {
          console.error("Failed to refund payment:", refundError);
          // Continue with rejection even if refund fails - it can be handled manually
        }
      }
      
      // Send rejection email to learner
      try {
        if (learner?.email) {
          await sendBookingRejectionEmail({
            recipientEmail: learner.email,
            recipientName: learner.name || 'المتعلم',
            experienceTitle: experience?.title || 'تجربة',
            mentorName: user?.name || 'المرشد',
            reason: reason
          });
          console.log('✅ Rejection email sent to learner');
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
      }
      
      res.json({ success: true, booking: updated, message: "تم رفض الحجز وتحرير الموعد" });
    } catch (error) {
      console.error("Error rejecting booking:", error);
      res.status(500).json({ message: "Failed to reject booking" });
    }
  });

  // PATCH /api/bookings/:id - Update booking status (protected)
  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the learner or mentor can update the booking
      if (booking.learnerId !== userId && booking.mentorId !== userId) {
        return res.status(403).json({ message: "You don't have access to this booking" });
      }

      const updated = await storage.updateBooking(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // ==================== REVIEW ROUTES ====================

  // GET /api/experiences/:id/reviews - Get reviews for an experience
  app.get('/api/experiences/:id/reviews', async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      const reviews = await storage.getReviewsByMentor(experience.mentorId);
      const experienceReviews = reviews.filter(r => r.experienceId === req.params.id);
      res.json(experienceReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // GET /api/mentors/:id/reviews - Get reviews for a mentor
  app.get('/api/mentors/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getReviewsByMentor(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching mentor reviews:", error);
      res.status(500).json({ message: "Failed to fetch mentor reviews" });
    }
  });

  // POST /api/reviews - Create review (protected, within 24h deadline, rating 1-5)
  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bookingId, rating, comment } = req.body;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is the learner for this booking
      if (booking.learnerId !== userId) {
        return res.status(403).json({ message: "Only the learner can review this booking" });
      }
      
      // Check if booking is completed
      if (booking.status !== 'completed') {
        return res.status(400).json({ message: "Can only review completed bookings" });
      }
      
      // Check if review already exists
      const existingReview = await storage.getReview(bookingId);
      if (existingReview) {
        return res.status(400).json({ message: "Review already submitted for this booking" });
      }
      
      // Check if within 24h deadline
      const now = new Date();
      if (now > booking.reviewDeadline) {
        return res.status(400).json({ message: "Review deadline has passed" });
      }
      
      // Validate rating
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const validatedData = insertReviewSchema.parse({
        bookingId,
        learnerId: userId,
        mentorId: booking.mentorId,
        experienceId: booking.experienceId,
        rating,
        comment: comment || null
      });

      const review = await storage.createReview(validatedData);
      
      // Handle payment based on review rating
      if (rating >= 3) {
        // Good review - release payment to mentor automatically
        // This will be processed by the payment processor
      } else {
        // Bad review (< 3 stars) - Create complaint for admin review
        // Payment stays held until admin decides
        const experience = await storage.getExperience(booking.experienceId);
        await storage.createComplaint({
          reporterId: userId,
          reportedUserId: booking.mentorId,
          bookingId: bookingId,
          title: `تقييم منخفض: ${rating} نجوم - ${experience?.title || 'تجربة'}`,
          description: `قام المتعلم بتقييم الجلسة بـ ${rating} نجوم.\n\nتعليق المتعلم: ${comment || 'لا يوجد تعليق'}\n\nالمبلغ المحجوز: ${booking.totalAmount} ريال\nنسبة المرشد: ${booking.mentorAmount} ريال\n\nيرجى مراجعة الحجز واتخاذ قرار: إيداع كامل، إيداع جزئي، أو استرداد.`,
          status: 'pending'
        });
        
        // Update booking to indicate it's under admin review
        await storage.updateBooking(bookingId, { 
          status: 'under_review'
        });
      }
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // ==================== STRIPE PAYMENT ROUTES ====================

  // GET /api/stripe/publishable-key - Get Stripe publishable key for frontend
  app.get('/api/stripe/publishable-key', isAuthenticated, async (req: any, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      // Cache for 1 hour - publishable key doesn't change frequently
      res.set('Cache-Control', 'private, max-age=3600');
      res.json({ publishableKey });
    } catch (error) {
      console.error('Error getting Stripe publishable key:', error);
      res.status(500).json({ message: "Failed to get Stripe configuration" });
    }
  });

  // ==================== STRIPE CONNECT ROUTES (MENTOR ONBOARDING) ====================

  // GET /api/stripe/connect/status - Check mentor's Stripe Connect status
  app.get('/api/stripe/connect/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      if (user.role !== 'mentor' && user.role !== 'admin') {
        return res.status(403).json({ message: "هذه الخدمة متاحة للمرشدين والمسؤولين فقط" });
      }

      // Check if mentor/admin has Stripe account
      if (!user.stripeAccountId) {
        return res.json({
          connected: false,
          accountId: null,
          payoutsEnabled: false,
          chargesEnabled: false
        });
      }

      // Get account details from Stripe
      try {
        const stripe = await getUncachableStripeClient();
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        
        return res.json({
          connected: true,
          accountId: user.stripeAccountId,
          payoutsEnabled: account.payouts_enabled,
          chargesEnabled: account.charges_enabled,
          detailsSubmitted: account.details_submitted
        });
      } catch (stripeError) {
        console.error("Stripe account check error:", stripeError);
        return res.json({
          connected: false,
          accountId: user.stripeAccountId,
          payoutsEnabled: false,
          chargesEnabled: false,
          error: "تعذر التحقق من حالة الحساب"
        });
      }
    } catch (error) {
      console.error("Error checking Stripe Connect status:", error);
      res.status(500).json({ message: "فشل في التحقق من حالة الاتصال" });
    }
  });

  // POST /api/stripe/connect/onboard - Create Stripe Connect account and get onboarding link
  app.post('/api/stripe/connect/onboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      if (user.role !== 'mentor') {
        return res.status(403).json({ message: "هذه الخدمة متاحة للمرشدين فقط" });
      }

      const stripe = await getUncachableStripeClient();
      let accountId = user.stripeAccountId;

      // Create Stripe Express account if not exists
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'SA', // Saudi Arabia
          email: user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          },
          business_type: 'individual',
          metadata: {
            userId: user.id,
            platform: 'wisdom_connect'
          }
        });
        
        accountId = account.id;
        
        // Save the Stripe account ID to user
        await storage.updateUser(userId, { stripeAccountId: accountId });
      }

      // Get the base URL for redirects
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/mentor/stripe-connect?refresh=true`,
        return_url: `${baseUrl}/mentor/stripe-connect?success=true`,
        type: 'account_onboarding'
      });

      res.json({
        url: accountLink.url,
        accountId: accountId
      });
    } catch (error) {
      console.error("Error creating Stripe Connect onboarding:", error);
      res.status(500).json({ message: "فشل في إنشاء رابط الربط" });
    }
  });

  // POST /api/stripe/connect/dashboard - Get link to Stripe Express dashboard
  app.post('/api/stripe/connect/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      if (!user.stripeAccountId) {
        return res.status(400).json({ message: "لم يتم ربط حساب Stripe بعد" });
      }

      const stripe = await getUncachableStripeClient();
      
      const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

      res.json({
        url: loginLink.url
      });
    } catch (error) {
      console.error("Error creating Stripe dashboard link:", error);
      res.status(500).json({ message: "فشل في إنشاء رابط لوحة التحكم" });
    }
  });

  // POST /api/payments/create-intent - Create payment intent for booking
  app.post('/api/payments/create-intent', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const userId = req.user.claims.sub;
      if (booking.learnerId !== userId) {
        return res.status(403).json({ message: "You can only pay for your own bookings" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(booking.totalAmount) * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          bookingId: booking.id,
          learnerId: booking.learnerId,
          mentorId: booking.mentorId
        },
        capture_method: 'manual' // Hold the funds
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // POST /api/payments/confirm - Confirm payment and hold funds
  app.post('/api/payments/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId, paymentIntentId } = req.body;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const userId = req.user.claims.sub;
      if (booking.learnerId !== userId) {
        return res.status(403).json({ message: "You can only confirm your own payments" });
      }

      // Verify availability is still available
      const availability = await storage.getAvailabilityById(booking.availabilityId);
      if (!availability || availability.isBooked) {
        return res.status(400).json({ message: "Time slot is no longer available" });
      }

      const stripe = await getUncachableStripeClient();
      let paymentCaptured = false;
      let slotMarked = false;
      
      try {
        // Step 1: Mark availability as booked FIRST (compare-and-set semantics)
        const marked = await storage.markAvailabilityBooked(booking.availabilityId, bookingId);
        if (!marked) {
          return res.status(400).json({ message: "Time slot no longer available" });
        }
        slotMarked = true;
        
        // Step 2: Capture the payment
        try {
          await stripe.paymentIntents.capture(paymentIntentId);
          paymentCaptured = true;
        } catch (captureError) {
          // Payment capture failed, release the slot we just marked
          await storage.releaseAvailability(booking.availabilityId, bookingId);
          throw captureError;
        }
        
        // Step 3: Update booking status
        try {
          await storage.holdPayment(bookingId, paymentIntentId);
          await storage.updateBooking(bookingId, { 
            status: 'confirmed',
            paymentStatus: 'held'
          });
        } catch (storageError) {
          // Storage update failed - refund and release slot
          try {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
            await storage.releaseAvailability(booking.availabilityId, bookingId);
            await storage.flagForManualReview(bookingId, `Storage update failed: ${storageError}`);
          } catch (cleanupError) {
            console.error("Cleanup failed:", cleanupError);
            await storage.flagForManualReview(bookingId, `Critical: cleanup failed after storage error`);
          }
          throw storageError;
        }

        res.json({ success: true, message: "Payment confirmed and held" });
      } catch (error) {
        // Final catch-all for unexpected errors
        console.error("Payment confirmation error:", error);
        
        // If we marked the slot but something went wrong, try to clean up
        if (slotMarked && !paymentCaptured) {
          await storage.releaseAvailability(booking.availabilityId, bookingId);
        }
        
        throw error;
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // POST /api/payments/release - Release payment to mentor (after good review or deadline)
  app.post('/api/payments/release', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.paymentStatus !== 'held') {
        return res.status(400).json({ message: "Payment is not in held status" });
      }

      // Check if review exists with rating >= 3 or deadline has passed
      const review = await storage.getReview(bookingId);
      const now = new Date();
      const canRelease = (review && review.rating >= 3) || now > booking.reviewDeadline;
      
      if (!canRelease) {
        return res.status(400).json({ message: "Cannot release payment yet" });
      }

      const stripe = await getUncachableStripeClient();
      const mentor = await storage.getUser(booking.mentorId);
      
      if (!mentor?.stripeAccountId) {
        return res.status(400).json({ message: "Mentor doesn't have a Stripe account" });
      }

      // Create transfer to mentor
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(booking.mentorAmount) * 100),
        currency: 'usd',
        destination: mentor.stripeAccountId,
        metadata: {
          bookingId: booking.id,
          mentorId: booking.mentorId
        }
      });

      // Update booking
      await storage.releasePayment(bookingId, transfer.id);
      await storage.updateBooking(bookingId, { 
        status: 'completed',
        paymentStatus: 'released'
      });

      res.json({ success: true, message: "Payment released to mentor", transferId: transfer.id });
    } catch (error) {
      console.error("Error releasing payment:", error);
      res.status(500).json({ message: "Failed to release payment" });
    }
  });

  // POST /api/payments/refund - Refund payment (if review < 3 stars)
  app.post('/api/payments/refund', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.paymentStatus !== 'held') {
        return res.status(400).json({ message: "Payment is not in held status" });
      }

      // Check if review exists with rating < 3
      const review = await storage.getReview(bookingId);
      if (!review || review.rating >= 3) {
        return res.status(400).json({ message: "Refund only available for reviews below 3 stars" });
      }

      const stripe = await getUncachableStripeClient();
      
      if (!booking.stripePaymentIntentId) {
        return res.status(400).json({ message: "No payment intent found" });
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        metadata: {
          bookingId: booking.id,
          learnerId: booking.learnerId
        }
      });

      // Update booking
      await storage.refundPayment(bookingId);

      res.json({ success: true, message: "Payment refunded", refundId: refund.id });
    } catch (error) {
      console.error("Error refunding payment:", error);
      res.status(500).json({ message: "Failed to refund payment" });
    }
  });

  // ==================== COMMISSION RULES ROUTES (ADMIN ONLY) ====================

  // Middleware to check if user is admin
  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  };

  // GET /api/commission-rules - Get all commission rules
  app.get('/api/commission-rules', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rules = await storage.getCommissionRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching commission rules:", error);
      res.status(500).json({ message: "Failed to fetch commission rules" });
    }
  });

  // POST /api/commission-rules - Create commission rule
  app.post('/api/commission-rules', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertCommissionRuleSchema.parse(req.body);
      const rule = await storage.createCommissionRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating commission rule:", error);
      res.status(500).json({ message: "Failed to create commission rule" });
    }
  });

  // PATCH /api/commission-rules/:id - Update commission rule
  app.patch('/api/commission-rules/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertCommissionRuleSchema.partial().parse(req.body);
      const updated = await storage.updateCommissionRule(req.params.id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Commission rule not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating commission rule:", error);
      res.status(500).json({ message: "Failed to update commission rule" });
    }
  });

  // DELETE /api/commission-rules/:id - Delete commission rule
  app.delete('/api/commission-rules/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteCommissionRule(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Commission rule not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting commission rule:", error);
      res.status(500).json({ message: "Failed to delete commission rule" });
    }
  });

  // ==================== ADMIN PAYMENT DECISION ROUTES ====================
  
  // POST /api/admin/bookings/:id/release-full - Admin releases full payment to mentor
  app.post('/api/admin/bookings/:id/release-full', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }
      
      if (booking.paymentStatus !== 'held') {
        return res.status(400).json({ message: "الدفع ليس في حالة الحجز" });
      }

      const stripe = await getUncachableStripeClient();
      const mentor = await storage.getUser(booking.mentorId);
      
      if (!mentor?.stripeAccountId) {
        return res.status(400).json({ message: "المرشد ليس لديه حساب Stripe" });
      }

      // Create transfer to mentor (full mentor amount)
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(booking.mentorAmount) * 100),
        currency: 'sar',
        destination: mentor.stripeAccountId,
        metadata: {
          bookingId: booking.id,
          mentorId: booking.mentorId,
          decision: 'admin_release_full'
        }
      });

      // Update booking
      await storage.releasePayment(bookingId, transfer.id);
      await storage.updateBooking(bookingId, { 
        status: 'completed',
        paymentStatus: 'released'
      });

      res.json({ success: true, message: "تم إيداع المبلغ كاملاً للمرشد", transferId: transfer.id });
    } catch (error) {
      console.error("Error releasing full payment:", error);
      res.status(500).json({ message: "فشل في إيداع المبلغ" });
    }
  });

  // POST /api/admin/bookings/:id/release-partial - Admin releases partial payment
  app.post('/api/admin/bookings/:id/release-partial', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const { mentorPercentage } = req.body; // e.g., 50 for 50%
      
      if (!mentorPercentage || mentorPercentage < 0 || mentorPercentage > 100) {
        return res.status(400).json({ message: "النسبة يجب أن تكون بين 0 و 100" });
      }

      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }
      
      if (booking.paymentStatus !== 'held') {
        return res.status(400).json({ message: "الدفع ليس في حالة الحجز" });
      }

      const stripe = await getUncachableStripeClient();
      const mentor = await storage.getUser(booking.mentorId);
      
      if (!mentor?.stripeAccountId) {
        return res.status(400).json({ message: "المرشد ليس لديه حساب Stripe" });
      }

      // Calculate partial amounts
      const totalAmount = parseFloat(booking.totalAmount);
      const mentorAmount = (totalAmount * mentorPercentage) / 100;
      const refundAmount = totalAmount - mentorAmount;

      // Create partial transfer to mentor
      if (mentorAmount > 0) {
        await stripe.transfers.create({
          amount: Math.round(mentorAmount * 100),
          currency: 'sar',
          destination: mentor.stripeAccountId,
          metadata: {
            bookingId: booking.id,
            mentorId: booking.mentorId,
            decision: 'admin_release_partial',
            percentage: mentorPercentage
          }
        });
      }

      // Create partial refund to learner
      if (refundAmount > 0 && booking.stripePaymentIntentId) {
        await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
          metadata: {
            bookingId: booking.id,
            reason: 'admin_partial_refund'
          }
        });
      }

      // Update booking
      await storage.updateBooking(bookingId, { 
        status: 'completed',
        paymentStatus: 'released'
      });

      res.json({ 
        success: true, 
        message: `تم إيداع ${mentorPercentage}% للمرشد واسترداد ${100 - mentorPercentage}% للمتعلم`,
        mentorAmount: mentorAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2)
      });
    } catch (error) {
      console.error("Error releasing partial payment:", error);
      res.status(500).json({ message: "فشل في معالجة الدفع الجزئي" });
    }
  });

  // POST /api/admin/bookings/:id/refund-full - Admin refunds full amount to learner
  app.post('/api/admin/bookings/:id/refund-full', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }
      
      if (booking.paymentStatus !== 'held') {
        return res.status(400).json({ message: "الدفع ليس في حالة الحجز" });
      }

      if (!booking.stripePaymentIntentId) {
        return res.status(400).json({ message: "لا يوجد معرف دفع" });
      }

      const stripe = await getUncachableStripeClient();

      // Create full refund
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        metadata: {
          bookingId: booking.id,
          reason: 'admin_full_refund'
        }
      });

      // Update booking
      await storage.refundPayment(bookingId);

      res.json({ success: true, message: "تم استرداد المبلغ كاملاً للمتعلم", refundId: refund.id });
    } catch (error) {
      console.error("Error refunding payment:", error);
      res.status(500).json({ message: "فشل في استرداد المبلغ" });
    }
  });

  // POST /api/admin/bookings/:id/cancel - Admin cancels a booking
  app.post('/api/admin/bookings/:id/cancel', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }

      // Can only cancel pending or confirmed bookings
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: "لا يمكن إلغاء هذا الحجز - الحالة غير مناسبة" });
      }

      // Update booking status
      await storage.updateBooking(bookingId, { 
        status: 'cancelled',
        paymentStatus: 'refunded'
      });

      res.json({ success: true, message: "تم إلغاء الحجز بنجاح" });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "فشل في إلغاء الحجز" });
    }
  });

  // POST /api/admin/bookings/:id/suspend - Admin suspends a booking (under review)
  app.post('/api/admin/bookings/:id/suspend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }

      // Update booking status to under_review
      await storage.updateBooking(bookingId, { 
        status: 'under_review'
      });

      res.json({ success: true, message: "تم تعليق الحجز قيد المراجعة" });
    } catch (error) {
      console.error("Error suspending booking:", error);
      res.status(500).json({ message: "فشل في تعليق الحجز" });
    }
  });

  // POST /api/admin/bookings/:id/unsuspend - Admin removes suspension from a booking
  app.post('/api/admin/bookings/:id/unsuspend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookingId = req.params.id;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "الحجز غير موجود" });
      }

      if (booking.status !== 'under_review') {
        return res.status(400).json({ message: "الحجز ليس قيد المراجعة" });
      }

      // Update booking status back to confirmed
      await storage.updateBooking(bookingId, { 
        status: 'confirmed'
      });

      res.json({ success: true, message: "تم فك تعليق الحجز" });
    } catch (error) {
      console.error("Error unsuspending booking:", error);
      res.status(500).json({ message: "فشل في فك تعليق الحجز" });
    }
  });

  // ==================== USER PROFILE ROUTES ====================

  // GET /api/users/:id - Get user profile
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // PATCH /api/users/:id - Update user profile (protected, own profile)
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (req.params.id !== userId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const validatedData = insertUserSchema.partial().parse(req.body);
      const updated = await storage.updateUser(userId, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // POST /api/users/:id/become-mentor - Convert learner to mentor (protected)
  app.post('/api/users/:id/become-mentor', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (req.params.id !== userId) {
        return res.status(403).json({ message: "You can only convert your own account" });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'mentor') {
        return res.status(400).json({ message: "User is already a mentor" });
      }

      // Try to create Stripe Connect account for mentor (optional in development)
      let stripeAccountId: string | undefined;
      try {
        const stripe = await getUncachableStripeClient();
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email || undefined,
          metadata: {
            userId: user.id
          }
        });
        stripeAccountId = account.id;
      } catch (stripeError) {
        console.warn('Stripe Connect unavailable (continuing without):', stripeError instanceof Error ? stripeError.message : stripeError);
        // Continue without Stripe in development/testing
      }

      // Update user role and Stripe account
      const updated = await storage.updateUser(userId, { 
        role: 'mentor',
        stripeAccountId
      });

      // Create account link for onboarding if Stripe is available
      let accountLinkUrl: string | null = null;
      if (stripeAccountId) {
        try {
          const stripe = await getUncachableStripeClient();
          const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${req.protocol}://${req.get('host')}/mentor/onboarding`,
            return_url: `${req.protocol}://${req.get('host')}/mentor/dashboard`,
            type: 'account_onboarding',
          });
          accountLinkUrl = accountLink.url;
        } catch (stripeLinkError) {
          console.warn('Failed to create Stripe onboarding link:', stripeLinkError instanceof Error ? stripeLinkError.message : stripeLinkError);
        }
      }

      res.json({ 
        user: updated, 
        onboardingUrl: accountLinkUrl,
        message: "Successfully converted to mentor" + (accountLinkUrl ? ". Complete Stripe onboarding to start receiving payments." : ".")
      });
    } catch (error) {
      console.error("Error converting to mentor:", error);
      res.status(500).json({ message: "Failed to convert to mentor" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // GET /api/admin/bookings - Get all bookings with populated details
  app.get('/api/admin/bookings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allBookings = await storage.getAllBookings();
      
      // Populate each booking with experience and user details
      const populatedBookings = await Promise.all(
        allBookings.map(async (booking) => {
          const experience = await storage.getExperience(booking.experienceId);
          const learner = await storage.getUser(booking.learnerId);
          const mentor = await storage.getUser(booking.mentorId);
          return {
            ...booking,
            experience,
            learner,
            mentor
          };
        })
      );
      
      res.json(populatedBookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // GET /api/admin/users - Get all users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { role } = req.query;
      const filters: any = {};
      
      if (role) filters.role = role as string;
      
      const users = await storage.getAllUsers(filters);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // PATCH /api/admin/users/:id/role - Update user role (admin only)
  app.patch('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      const userId = req.params.id;
      
      if (!['admin', 'mentor', 'learner'].includes(role)) {
        return res.status(400).json({ message: "الدور غير صالح" });
      }
      
      const updated = await storage.updateUser(userId, { role });
      
      if (!updated) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "فشل تحديث دور المستخدم" });
    }
  });

  // GET /api/admin/experiences - Get all experiences
  app.get('/api/admin/experiences', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const experiences = await storage.getExperiences();
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching admin experiences:", error);
      res.status(500).json({ message: "Failed to fetch experiences" });
    }
  });

  // POST /api/admin/experiences/:id/approve - Approve or reject experience
  app.post('/api/admin/experiences/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { approvalStatus } = req.body;
      
      if (!['approved', 'rejected'].includes(approvalStatus)) {
        return res.status(400).json({ message: "Invalid approval status" });
      }
      
      const updated = await storage.updateExperience(req.params.id, { approvalStatus });
      
      if (!updated) {
        return res.status(404).json({ message: "Experience not found" });
      }
      
      res.json({ success: true, experience: updated });
    } catch (error) {
      console.error("Error updating experience approval:", error);
      res.status(500).json({ message: "Failed to update experience" });
    }
  });

  // DELETE /api/admin/experiences/:id - Delete experience with all related data
  app.delete('/api/admin/experiences/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const experienceId = req.params.id;
      const experience = await storage.getExperience(experienceId);
      
      if (!experience) {
        return res.status(404).json({ message: "التجربة غير موجودة" });
      }

      // Get all related bookings
      const allBookings = await storage.getAllBookings();
      const relatedBookings = allBookings.filter(b => b.experienceId === experienceId);

      // Delete all related data in order (cascade delete)
      // This is safe because we're an admin performing a deliberate action
      for (const booking of relatedBookings) {
        // Delete conversations 
        const conversation = await storage.getConversationByBookingId(booking.id);
        if (conversation) {
          await storage.updateConversation(conversation.id, { isActive: false });
        }
        
        // Release availability if booked
        if (booking.availabilityId) {
          await storage.releaseAvailability(booking.availabilityId, booking.id);
        }

        // Delete the booking itself
        await storage.deleteBooking(booking.id);
      }

      // Delete all availability slots for this experience
      const availabilitySlots = await storage.getAvailability(experienceId);
      for (const slot of availabilitySlots) {
        await storage.deleteAvailability(slot.id);
      }

      // Delete the experience itself
      await storage.deleteExperience(experienceId);
      
      res.json({ success: true, message: "تم حذف التجربة وجميع البيانات المرتبطة بها بنجاح" });
    } catch (error) {
      console.error("Error deleting experience:", error);
      res.status(500).json({ message: "فشل في حذف التجربة" });
    }
  });

  // PATCH /api/admin/experiences/:id/hide - Hide/unhide experience
  app.patch('/api/admin/experiences/:id/hide', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const experienceId = req.params.id;
      const { isHidden } = req.body;
      
      if (typeof isHidden !== 'boolean') {
        return res.status(400).json({ message: "isHidden must be a boolean" });
      }

      const experience = await storage.getExperience(experienceId);
      
      if (!experience) {
        return res.status(404).json({ message: "التجربة غير موجودة" });
      }

      const updated = await storage.updateExperience(experienceId, { isHidden });
      
      res.json({ 
        success: true, 
        message: isHidden ? "تم إخفاء التجربة" : "تم إظهار التجربة",
        experience: updated 
      });
    } catch (error) {
      console.error("Error hiding experience:", error);
      res.status(500).json({ message: "فشل في تحديث حالة التجربة" });
    }
  });

  // GET /api/admin/complaints - Get all complaints
  app.get('/api/admin/complaints', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      
      const complaints = await storage.getComplaints(filters);
      res.json(complaints);
    } catch (error) {
      console.error("Error fetching admin complaints:", error);
      res.status(500).json({ message: "Failed to fetch complaints" });
    }
  });

  // PATCH /api/admin/complaints/:id - Update complaint status
  app.patch('/api/admin/complaints/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, adminNotes, resolvedAt } = req.body;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      if (resolvedAt) updates.resolvedAt = new Date(resolvedAt);
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedByAdminId = userId;
      }
      
      const updated = await storage.updateComplaint(req.params.id, updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      
      res.json({ success: true, complaint: updated });
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(500).json({ message: "Failed to update complaint" });
    }
  });

  // GET /api/admin/revenue - Get revenue statistics
  app.get('/api/admin/revenue', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getRevenueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
      res.status(500).json({ message: "Failed to fetch revenue statistics" });
    }
  });

  // GET /api/admin/admin-emails - Get list of admin emails
  app.get('/api/admin/admin-emails', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const emails = await storage.getAdminEmails();
      res.json(emails);
    } catch (error) {
      console.error("Error fetching admin emails:", error);
      res.status(500).json({ message: "Failed to fetch admin emails" });
    }
  });

  // POST /api/admin/admin-emails - Add new admin email
  app.post('/api/admin/admin-emails', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      
      const currentUserId = req.user.claims.sub;
      await storage.addAdminEmail(email, currentUserId);
      
      res.json({ success: true, message: `تم إضافة ${email} إلى قائمة المسؤولين` });
    } catch (error) {
      console.error("Error adding admin email:", error);
      res.status(500).json({ message: "Failed to add admin email" });
    }
  });

  // DELETE /api/admin/admin-emails/:email - Remove admin email
  app.delete('/api/admin/admin-emails/:email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email } = req.params;
      await storage.removeAdminEmail(email);
      res.json({ success: true, message: `تم إزالة ${email} من قائمة المسؤولين` });
    } catch (error) {
      console.error("Error removing admin email:", error);
      res.status(500).json({ message: "Failed to remove admin email" });
    }
  });

  // ===== CONVERSATION & MESSAGING ROUTES =====
  
  // GET /api/conversations - Get all conversations for current user
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationsList = await storage.getConversationsByUserId(userId);
      
      // Enrich conversations with last message and user details
      const enrichedConversations = await Promise.all(
        conversationsList.map(async (conv) => {
          const messagesList = await storage.getMessages(conv.id);
          const lastMessage = messagesList[messagesList.length - 1];
          const otherUserId = conv.mentorId === userId ? conv.learnerId : conv.mentorId;
          const otherUser = await storage.getUser(otherUserId);
          const booking = await storage.getBooking(conv.bookingId);
          const experience = booking ? await storage.getExperience(booking.experienceId) : null;
          
          // Count unread messages
          const unreadCount = messagesList.filter(m => m.senderId !== userId && !m.isRead).length;
          
          return {
            ...conv,
            lastMessage,
            otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, profileImage: otherUser.profileImage } : null,
            experience: experience ? { id: experience.id, title: experience.title } : null,
            sessionDate: booking?.sessionDate,
            unreadCount,
          };
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // GET /api/conversations/:id - Get single conversation with messages
  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Verify user is part of the conversation
      if (conversation.mentorId !== userId && conversation.learnerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messagesList = await storage.getMessages(conversation.id);
      const otherUserId = conversation.mentorId === userId ? conversation.learnerId : conversation.mentorId;
      const otherUser = await storage.getUser(otherUserId);
      const booking = await storage.getBooking(conversation.bookingId);
      const experience = booking ? await storage.getExperience(booking.experienceId) : null;
      
      // Mark messages as read
      await storage.markMessagesAsRead(conversation.id, userId);
      
      res.json({
        ...conversation,
        messages: messagesList,
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, profileImage: otherUser.profileImage, email: otherUser.email } : null,
        experience: experience ? { id: experience.id, title: experience.title } : null,
        sessionDate: booking?.sessionDate,
        booking: booking ? { id: booking.id, status: booking.status } : null,
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // GET /api/conversations/booking/:bookingId - Get conversation by booking ID
  app.get('/api/conversations/booking/:bookingId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversationByBookingId(req.params.bookingId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Verify user is part of the conversation
      if (conversation.mentorId !== userId && conversation.learnerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation by booking:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // POST /api/conversations/:id/messages - Send a message
  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Verify user is part of the conversation
      if (conversation.mentorId !== userId && conversation.learnerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if conversation is still active
      if (!conversation.isActive) {
        return res.status(400).json({ message: "This conversation is no longer active" });
      }
      
      const message = await storage.createMessage({
        conversationId: conversation.id,
        senderId: userId,
        content: content.trim(),
        messageType: 'text',
        isRead: false,
      });
      
      // Broadcast to WebSocket clients in this conversation
      console.log(`📨 Broadcasting message to conversation ${conversation.id}`);
      broadcastToConversation(conversation.id, {
        type: 'new_message',
        conversationId: conversation.id,
        senderId: userId,
        message: message,
      });
      
      // Also notify the other user via direct user connection
      const otherUserId = conversation.mentorId === userId ? conversation.learnerId : conversation.mentorId;
      console.log(`📨 Broadcasting message to user ${otherUserId}`);
      broadcastToUser(otherUserId, {
        type: 'new_message',
        conversationId: conversation.id,
        senderId: userId,
        message: message,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // GET /api/unread-messages - Get unread message count for current user
  app.get('/api/unread-messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadCount = await storage.getUnreadMessageCount(userId);
      res.json({ unreadCount });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // POST /api/conversations/:id/mark-read - Mark messages as read
  app.post('/api/conversations/:id/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.mentorId !== userId && conversation.learnerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.markMessagesAsRead(conversation.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    let userId: string | null = null;
    let conversationId: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Authenticate and set user ID
          userId = message.userId;
          if (userId) {
            if (!userConnections.has(userId)) {
              userConnections.set(userId, new Set());
            }
            userConnections.get(userId)!.add(ws);
            
            ws.send(JSON.stringify({ type: 'auth_success' }));
          }
        } else if (message.type === 'join_conversation') {
          // Join a conversation room
          conversationId = message.conversationId;
          console.log(`👥 User ${userId} joining conversation ${conversationId}`);
          if (conversationId) {
            if (!conversationConnections.has(conversationId)) {
              conversationConnections.set(conversationId, new Set());
            }
            conversationConnections.get(conversationId)!.add(ws);
            console.log(`✅ User ${userId} joined conversation ${conversationId}. Total: ${conversationConnections.get(conversationId)!.size}`);
            
            ws.send(JSON.stringify({ type: 'joined', conversationId }));
          }
        } else if (message.type === 'leave_conversation') {
          // Leave current conversation room
          if (conversationId) {
            const connections = conversationConnections.get(conversationId);
            if (connections) {
              connections.delete(ws);
              if (connections.size === 0) {
                conversationConnections.delete(conversationId);
              }
            }
            conversationId = null;
          }
        } else if (message.type === 'typing') {
          // Broadcast typing indicator
          if (conversationId) {
            broadcastToConversation(conversationId, {
              type: 'typing',
              userId: userId,
              isTyping: message.isTyping,
            });
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on('close', () => {
      // Clean up connections
      if (userId) {
        const userConns = userConnections.get(userId);
        if (userConns) {
          userConns.delete(ws);
          if (userConns.size === 0) {
            userConnections.delete(userId);
          }
        }
      }
      if (conversationId) {
        const convConns = conversationConnections.get(conversationId);
        if (convConns) {
          convConns.delete(ws);
          if (convConns.size === 0) {
            conversationConnections.delete(conversationId);
          }
        }
      }
    });
  });
  
  return httpServer;
}
