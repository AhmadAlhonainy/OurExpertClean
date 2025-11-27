import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, pgEnum, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum("user_role", ["learner", "mentor", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled", "refunded", "under_review"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "held", "released", "refunded"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["pending", "in_review", "resolved", "closed"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  name: text("name"),
  profileImage: text("profile_image"),
  passwordHash: text("password_hash"), // For email/password auth (optional - null if OAuth)
  role: userRoleEnum("role").notNull().default("learner"),
  bio: text("bio"),
  phoneNumber: text("phone_number"),
  stripeAccountId: text("stripe_account_id"), // For mentors
  stripeCustomerId: text("stripe_customer_id"), // For learners
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Experiences table
export const experiences = pgTable("experiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: varchar("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  city: text("city").notNull(),
  learningPoints: text("learning_points").array().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Availability table
export const availability = pgTable("availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull().references(() => experiences.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  isBooked: boolean("is_booked").default(false).notNull(),
  bookedByBookingId: text("booked_by_booking_id"), // Track which booking owns this slot
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate slots (race condition protection)
  uniqueExperienceDate: unique().on(table.experienceId, table.date),
}));

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull().references(() => experiences.id),
  learnerId: varchar("learner_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  availabilityId: varchar("availability_id").notNull().references(() => availability.id),
  sessionDate: timestamp("session_date").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  mentorAmount: decimal("mentor_amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  reviewDeadline: timestamp("review_deadline").notNull(), // Auto-calculated: sessionDate + 24h
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().unique().references(() => bookings.id, { onDelete: "cascade" }),
  learnerId: varchar("learner_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  experienceId: varchar("experience_id").notNull().references(() => experiences.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Commission rules table
export const commissionRules = pgTable("commission_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleType: text("rule_type").notNull(), // 'global', 'category', 'mentor'
  targetId: text("target_id"), // null for global, category name or mentor id
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // percentage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Complaints table
export const complaints = pgTable("complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedByAdminId: varchar("resolved_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin emails table (for automatic admin role assignment)
export const adminEmails = pgTable("admin_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  addedByAdminId: varchar("added_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations table (for chat between mentor and learner)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().unique().references(() => bookings.id, { onDelete: "cascade" }),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  learnerId: varchar("learner_id").notNull().references(() => users.id),
  meetingLink: text("meeting_link"),
  meetingEventId: text("meeting_event_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'system', 'meeting_link'
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
}).required({ id: true });

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
  isBooked: true,
  bookedByBookingId: true,
}).extend({
  date: z.string().or(z.date()).transform((val) => new Date(val)),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionRuleSchema = createInsertSchema(commissionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplaintSchema = createInsertSchema(complaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminEmailSchema = createInsertSchema(adminEmails).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = z.infer<typeof insertCommissionRuleSchema>;

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;

export type AdminEmail = typeof adminEmails.$inferSelect;
export type InsertAdminEmail = z.infer<typeof insertAdminEmailSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
