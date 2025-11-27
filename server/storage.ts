import {
  type User,
  type UpsertUser,
  type InsertUser,
  type Experience,
  type InsertExperience,
  type Availability,
  type InsertAvailability,
  type Booking,
  type InsertBooking,
  type Review,
  type InsertReview,
  type CommissionRule,
  type InsertCommissionRule,
  type Complaint,
  type InsertComplaint,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  users,
  experiences,
  availability,
  bookings,
  reviews,
  commissionRules,
  complaints,
  adminEmails,
  conversations,
  messages,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, sql, desc, gte, lte, or, ilike } from "drizzle-orm";

export interface IStorage {
  // Users (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Experiences
  getExperience(id: string): Promise<Experience | undefined>;
  getExperiences(filters?: { category?: string; city?: string; mentorId?: string; approvalStatus?: string; search?: string }): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  updateExperience(id: string, experience: Partial<InsertExperience>): Promise<Experience | undefined>;
  deleteExperience(id: string): Promise<boolean>;

  // Availability
  getAvailability(experienceId: string): Promise<Availability[]>;
  getAvailabilityById(id: string): Promise<Availability | undefined>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  deleteAvailability(id: string): Promise<boolean>;
  markAvailabilityBooked(id: string, bookingId: string): Promise<boolean>; // Returns false if already booked or not found
  releaseAvailability(id: string, bookingId: string): Promise<boolean>; // Only releases if owned by bookingId

  // Bookings
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByLearner(learnerId: string): Promise<Booking[]>;
  getBookingsByMentor(mentorId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;

  // Reviews
  getReview(bookingId: string): Promise<Review | undefined>;
  getReviewsByMentor(mentorId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Commission Rules
  getCommissionRate(experienceId: string, mentorId: string): Promise<number>;
  getCommissionRule(id: string): Promise<CommissionRule | undefined>;
  getCommissionRules(): Promise<CommissionRule[]>;
  createCommissionRule(rule: InsertCommissionRule): Promise<CommissionRule>;
  updateCommissionRule(id: string, rule: Partial<InsertCommissionRule>): Promise<CommissionRule | undefined>;
  deleteCommissionRule(id: string): Promise<boolean>;

  // Payment Management
  getBookingsAwaitingReview(): Promise<Booking[]>; // Reviews deadline passed, no review yet
  getBookingsEligibleForRelease(): Promise<Booking[]>; // Reviewed with 3+ stars, held status
  holdPayment(bookingId: string, paymentIntentId: string): Promise<void>;
  releasePayment(bookingId: string, transferId: string): Promise<void>;
  refundPayment(bookingId: string): Promise<void>;
  flagForManualReview(bookingId: string, reason: string): Promise<void>;

  // Complaints
  getComplaint(id: string): Promise<Complaint | undefined>;
  getComplaints(filters?: { status?: string }): Promise<Complaint[]>;
  getComplaintsByReporter(reporterId: string): Promise<Complaint[]>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: string, complaint: Partial<InsertComplaint>): Promise<Complaint | undefined>;
  
  // Admin Statistics
  getAllBookings(): Promise<Booking[]>;
  getAllUsers(filters?: { role?: string }): Promise<User[]>;
  getRevenueStats(): Promise<{ totalRevenue: number; platformRevenue: number; mentorRevenue: number }>;
  
  // Admin Emails
  isAdminEmail(email: string): Promise<boolean>;
  getAdminEmails(): Promise<string[]>;
  addAdminEmail(email: string, addedByAdminId?: string): Promise<void>;
  removeAdminEmail(email: string): Promise<void>;

  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByBookingId(bookingId: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private experiences: Map<string, Experience>;
  private availability: Map<string, Availability>;
  private bookings: Map<string, Booking>;
  private reviews: Map<string, Review>;
  private commissionRules: Map<string, CommissionRule>;
  private complaints: Map<string, Complaint>;
  private manualReviewFlags: Map<string, { bookingId: string; reason: string }>;
  private adminEmails: Set<string>;

  constructor() {
    this.users = new Map();
    this.experiences = new Map();
    this.availability = new Map();
    this.bookings = new Map();
    this.reviews = new Map();
    this.commissionRules = new Map();
    this.complaints = new Map();
    this.manualReviewFlags = new Map();
    this.adminEmails = new Set(['eng.abomoqpel@gmail.com']); // Initialize with primary admin

    // Initialize default commission rule
    this.initializeCommissionRules();
  }

  private initializeCommissionRules() {
    const globalRule: CommissionRule = {
      id: randomUUID(),
      ruleType: "global",
      targetId: null,
      commissionRate: "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.commissionRules.set(globalRule.id, globalRule);
  }

  // Users (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.email) {
      const existingByEmail = await this.getUserByEmail(userData.email);
      if (existingByEmail && existingByEmail.id !== userData.id) {
        throw new Error(`Email ${userData.email} already exists with a different account. Please use your original sign-in method.`);
      }
    }
    
    const existing = this.users.get(userData.id);
    const user: User = {
      id: userData.id,
      email: userData.email ?? existing?.email ?? null,
      name: userData.name ?? existing?.name ?? null,
      profileImage: userData.profileImage ?? existing?.profileImage ?? null,
      passwordHash: userData.passwordHash ?? existing?.passwordHash ?? null,
      role: existing?.role ?? userData.role ?? "learner",
      bio: userData.bio ?? existing?.bio ?? null,
      phoneNumber: userData.phoneNumber ?? existing?.phoneNumber ?? null,
      stripeAccountId: userData.stripeAccountId ?? existing?.stripeAccountId ?? null,
      stripeCustomerId: userData.stripeCustomerId ?? existing?.stripeCustomerId ?? null,
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Additional user operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email ?? null,
      name: insertUser.name ?? null,
      profileImage: insertUser.profileImage ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      role: insertUser.role ?? "learner",
      bio: insertUser.bio ?? null,
      phoneNumber: insertUser.phoneNumber ?? null,
      stripeAccountId: insertUser.stripeAccountId ?? null,
      stripeCustomerId: insertUser.stripeCustomerId ?? null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Experiences
  async getExperience(id: string): Promise<Experience | undefined> {
    return this.experiences.get(id);
  }

  async getExperiences(filters?: { category?: string; city?: string; mentorId?: string; approvalStatus?: string; search?: string }): Promise<Experience[]> {
    let experiences = Array.from(this.experiences.values()).filter(exp => exp.isActive);
    
    if (filters?.category) {
      experiences = experiences.filter(exp => exp.category === filters.category);
    }
    if (filters?.city) {
      experiences = experiences.filter(exp => exp.city === filters.city);
    }
    if (filters?.mentorId) {
      experiences = experiences.filter(exp => exp.mentorId === filters.mentorId);
    }
    if (filters?.approvalStatus) {
      experiences = experiences.filter(exp => exp.approvalStatus === filters.approvalStatus);
    }
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      
      // First try exact phrase match
      let filtered = experiences.filter(exp => 
        exp.title.includes(searchTerm) ||
        exp.description.includes(searchTerm) ||
        exp.category.includes(searchTerm) ||
        exp.city.includes(searchTerm) ||
        exp.learningPoints.some(point => point.includes(searchTerm))
      );
      
      // If no results, search by individual words (excluding stop words)
      if (filtered.length === 0) {
        const stopWords = ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'أو', 'و', 'أن', 'أريد', 'أبحث'];
        const searchWords = searchTerm.split(/\s+/).filter(word => 
          word.length > 0 && !stopWords.includes(word)
        );
        
        if (searchWords.length > 0) {
          filtered = experiences.filter(exp =>
            searchWords.some(word => 
              exp.title.includes(word) ||
              exp.description.includes(word) ||
              exp.category.includes(word) ||
              exp.city.includes(word) ||
              exp.learningPoints.some(point => point.includes(word))
            )
          );
        }
      }
      
      // If still no results, show any 6 experiences
      if (filtered.length === 0 && experiences.length > 0) {
        filtered = experiences.slice(0, 6);
      }
      
      experiences = filtered;
    }
    
    return experiences;
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const id = randomUUID();
    const experience: Experience = {
      ...insertExperience,
      id,
      isActive: insertExperience.isActive ?? true,
      approvalStatus: insertExperience.approvalStatus ?? "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.experiences.set(id, experience);
    return experience;
  }

  async updateExperience(id: string, updates: Partial<InsertExperience>): Promise<Experience | undefined> {
    const experience = this.experiences.get(id);
    if (!experience) return undefined;
    
    const updated = { ...experience, ...updates, updatedAt: new Date() };
    this.experiences.set(id, updated);
    return updated;
  }

  async deleteExperience(id: string): Promise<boolean> {
    return this.experiences.delete(id);
  }

  // Availability
  async getAvailability(experienceId: string): Promise<Availability[]> {
    return Array.from(this.availability.values())
      .filter(avail => avail.experienceId === experienceId && !avail.isBooked);
  }

  async getAvailabilityById(id: string): Promise<Availability | undefined> {
    return this.availability.get(id);
  }

  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    // Enforce unique constraint (experienceId, date) to prevent duplicates
    const requestDate = new Date(insertAvailability.date);
    const duplicate = Array.from(this.availability.values()).find(slot => {
      const slotDate = new Date(slot.date);
      return slot.experienceId === insertAvailability.experienceId && 
             slotDate.getTime() === requestDate.getTime();
    });
    
    if (duplicate) {
      throw new Error(`duplicate key value violates unique constraint "availability_uniqueExperienceDate"`);
    }
    
    const id = randomUUID();
    const availability: Availability = {
      ...insertAvailability,
      id,
      isBooked: false,
      bookedByBookingId: null,
      createdAt: new Date(),
    };
    this.availability.set(id, availability);
    return availability;
  }

  async markAvailabilityBooked(id: string, bookingId: string): Promise<boolean> {
    const avail = this.availability.get(id);
    if (!avail) return false;
    if (avail.isBooked) return false; // Already booked
    
    // Mark as booked and record which booking owns it
    this.availability.set(id, { 
      ...avail, 
      isBooked: true,
      bookedByBookingId: bookingId 
    });
    return true;
  }

  async releaseAvailability(id: string, bookingId: string): Promise<boolean> {
    const avail = this.availability.get(id);
    if (!avail) return false;
    
    // Only release if this booking owns the slot
    if (avail.bookedByBookingId !== bookingId) return false;
    
    this.availability.set(id, { 
      ...avail, 
      isBooked: false,
      bookedByBookingId: null 
    });
    return true;
  }

  async deleteAvailability(id: string): Promise<boolean> {
    const avail = this.availability.get(id);
    if (!avail) return false;
    
    this.availability.delete(id);
    return true;
  }

  // Bookings
  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByLearner(learnerId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.learnerId === learnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBookingsByMentor(mentorId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.mentorId === mentorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    
    // Calculate review deadline: session date + 24 hours
    const reviewDeadline = new Date(insertBooking.sessionDate);
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);
    
    const booking: Booking = {
      ...insertBooking,
      id,
      status: insertBooking.status ?? "pending",
      paymentStatus: insertBooking.paymentStatus ?? "pending",
      reviewDeadline,
      stripePaymentIntentId: insertBooking.stripePaymentIntentId ?? null,
      stripeTransferId: insertBooking.stripeTransferId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updated = { ...booking, ...updates, updatedAt: new Date() };
    this.bookings.set(id, updated);
    return updated;
  }

  // Reviews
  async getReview(bookingId: string): Promise<Review | undefined> {
    return Array.from(this.reviews.values()).find(review => review.bookingId === bookingId);
  }

  async getReviewsByMentor(mentorId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.mentorId === mentorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = {
      ...insertReview,
      id,
      comment: insertReview.comment ?? null,
      createdAt: new Date(),
    };
    this.reviews.set(id, review);
    return review;
  }

  // Commission Rules
  async getCommissionRate(experienceId: string, mentorId: string): Promise<number> {
    const experience = await this.getExperience(experienceId);
    if (!experience) return 15; // Default fallback

    // Priority: mentor-specific > category-specific > global
    const mentorRule = Array.from(this.commissionRules.values()).find(
      rule => rule.ruleType === "mentor" && rule.targetId === mentorId && rule.isActive
    );
    if (mentorRule) return parseFloat(mentorRule.commissionRate);

    const categoryRule = Array.from(this.commissionRules.values()).find(
      rule => rule.ruleType === "category" && rule.targetId === experience.category && rule.isActive
    );
    if (categoryRule) return parseFloat(categoryRule.commissionRate);

    const globalRule = Array.from(this.commissionRules.values()).find(
      rule => rule.ruleType === "global" && rule.isActive
    );
    return globalRule ? parseFloat(globalRule.commissionRate) : 15;
  }

  async getCommissionRule(id: string): Promise<CommissionRule | undefined> {
    return this.commissionRules.get(id);
  }

  async getCommissionRules(): Promise<CommissionRule[]> {
    return Array.from(this.commissionRules.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCommissionRule(insertRule: InsertCommissionRule): Promise<CommissionRule> {
    const id = randomUUID();
    const rule: CommissionRule = {
      ...insertRule,
      id,
      targetId: insertRule.targetId ?? null,
      isActive: insertRule.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.commissionRules.set(id, rule);
    return rule;
  }

  async updateCommissionRule(id: string, updates: Partial<InsertCommissionRule>): Promise<CommissionRule | undefined> {
    const rule = this.commissionRules.get(id);
    if (!rule) return undefined;
    
    const updated = { ...rule, ...updates, updatedAt: new Date() };
    this.commissionRules.set(id, updated);
    return updated;
  }

  async deleteCommissionRule(id: string): Promise<boolean> {
    return this.commissionRules.delete(id);
  }

  // Payment Management
  async getBookingsAwaitingReview(): Promise<Booking[]> {
    const now = new Date();
    return Array.from(this.bookings.values()).filter(booking => {
      if (booking.status !== "completed" || booking.paymentStatus !== "held" || booking.reviewDeadline >= now) {
        return false;
      }
      
      // Check if a review exists for this booking
      const hasReview = Array.from(this.reviews.values()).some(review => review.bookingId === booking.id);
      return !hasReview;
    });
  }

  async getBookingsEligibleForRelease(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => {
      if (booking.paymentStatus !== "held") return false;
      
      const review = Array.from(this.reviews.values()).find(r => r.bookingId === booking.id);
      return review && review.rating >= 3;
    });
  }

  async holdPayment(bookingId: string, paymentIntentId: string): Promise<void> {
    const booking = this.bookings.get(bookingId);
    if (booking) {
      this.bookings.set(bookingId, {
        ...booking,
        paymentStatus: "held",
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      });
    }
  }

  async releasePayment(bookingId: string, transferId: string): Promise<void> {
    const booking = this.bookings.get(bookingId);
    if (booking) {
      this.bookings.set(bookingId, {
        ...booking,
        paymentStatus: "released",
        stripeTransferId: transferId,
        updatedAt: new Date(),
      });
    }
  }

  async refundPayment(bookingId: string): Promise<void> {
    const booking = this.bookings.get(bookingId);
    if (booking) {
      this.bookings.set(bookingId, {
        ...booking,
        paymentStatus: "refunded",
        status: "refunded",
        updatedAt: new Date(),
      });
    }
  }

  async flagForManualReview(bookingId: string, reason: string): Promise<void> {
    this.manualReviewFlags.set(bookingId, { bookingId, reason });
  }

  // Complaints
  async getComplaint(id: string): Promise<Complaint | undefined> {
    return this.complaints.get(id);
  }

  async getComplaints(filters?: { status?: string }): Promise<Complaint[]> {
    let complaints = Array.from(this.complaints.values());
    
    if (filters?.status) {
      complaints = complaints.filter(c => c.status === filters.status);
    }
    
    return complaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getComplaintsByReporter(reporterId: string): Promise<Complaint[]> {
    return Array.from(this.complaints.values())
      .filter(c => c.reporterId === reporterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createComplaint(insertComplaint: InsertComplaint): Promise<Complaint> {
    const id = randomUUID();
    const complaint: Complaint = {
      ...insertComplaint,
      id,
      reportedUserId: insertComplaint.reportedUserId ?? null,
      bookingId: insertComplaint.bookingId ?? null,
      status: insertComplaint.status ?? "pending",
      adminNotes: insertComplaint.adminNotes ?? null,
      resolvedAt: insertComplaint.resolvedAt ?? null,
      resolvedByAdminId: insertComplaint.resolvedByAdminId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.complaints.set(id, complaint);
    return complaint;
  }

  async updateComplaint(id: string, updates: Partial<InsertComplaint>): Promise<Complaint | undefined> {
    const complaint = this.complaints.get(id);
    if (!complaint) return undefined;
    
    const updated = { ...complaint, ...updates, updatedAt: new Date() };
    this.complaints.set(id, updated);
    return updated;
  }

  // Admin Statistics
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllUsers(filters?: { role?: string }): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (filters?.role) {
      users = users.filter(u => u.role === filters.role);
    }
    
    return users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; platformRevenue: number; mentorRevenue: number }> {
    const completedBookings = Array.from(this.bookings.values())
      .filter(b => b.status === 'completed' && b.paymentStatus === 'released');
    
    const totalRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const platformRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.platformFee), 0);
    const mentorRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.mentorAmount), 0);
    
    return { totalRevenue, platformRevenue, mentorRevenue };
  }

  // Admin Emails Management
  async isAdminEmail(email: string): Promise<boolean> {
    return this.adminEmails.has(email);
  }

  async getAdminEmails(): Promise<string[]> {
    return Array.from(this.adminEmails);
  }

  async addAdminEmail(email: string, addedByAdminId?: string): Promise<void> {
    this.adminEmails.add(email);
  }

  async removeAdminEmail(email: string): Promise<void> {
    this.adminEmails.delete(email);
  }

  // Conversations (MemStorage - minimal implementation)
  private conversationsMap: Map<string, Conversation> = new Map();
  private messagesMap: Map<string, Message> = new Map();

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversationsMap.get(id);
  }

  async getConversationByBookingId(bookingId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversationsMap.values()).find(c => c.bookingId === bookingId);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversationsMap.values())
      .filter(c => c.mentorId === userId || c.learnerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createConversation(insertConv: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConv,
      id,
      meetingLink: insertConv.meetingLink ?? null,
      meetingEventId: insertConv.meetingEventId ?? null,
      isActive: insertConv.isActive ?? true,
      createdAt: new Date(),
    };
    this.conversationsMap.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const conversation = this.conversationsMap.get(id);
    if (!conversation) return undefined;
    const updated = { ...conversation, ...updates };
    this.conversationsMap.set(id, updated);
    return updated;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messagesMap.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMsg,
      id,
      messageType: insertMsg.messageType ?? 'text',
      isRead: insertMsg.isRead ?? false,
      createdAt: new Date(),
    };
    this.messagesMap.set(id, message);
    return message;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const entries = Array.from(this.messagesMap.entries());
    for (const [id, msg] of entries) {
      if (msg.conversationId === conversationId && msg.senderId !== userId) {
        this.messagesMap.set(id, { ...msg, isRead: true });
      }
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const userConversations = await this.getConversationsByUserId(userId);
    const conversationIds = new Set(userConversations.map(c => c.id));
    
    return Array.from(this.messagesMap.values())
      .filter(m => conversationIds.has(m.conversationId) && m.senderId !== userId && !m.isRead)
      .length;
  }
}

export class DbStorage implements IStorage {
  private manualReviewFlags: Map<string, { bookingId: string; reason: string }>;

  constructor(private database: typeof db) {
    this.manualReviewFlags = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.database.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.email) {
      const existingByEmail = await this.getUserByEmail(userData.email);
      if (existingByEmail && existingByEmail.id !== userData.id) {
        throw new Error(`Email ${userData.email} already exists with a different account. Please use your original sign-in method.`);
      }
    }
    
    const newUser = {
      id: userData.id,
      email: userData.email ?? null,
      name: userData.name ?? null,
      profileImage: userData.profileImage ?? null,
      role: userData.role ?? "learner",
      bio: userData.bio ?? null,
      phoneNumber: userData.phoneNumber ?? null,
      stripeAccountId: userData.stripeAccountId ?? null,
      stripeCustomerId: userData.stripeCustomerId ?? null,
    };
    
    const result = await this.database
      .insert(users)
      .values(newUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email ?? null,
          name: userData.name ?? null,
          profileImage: userData.profileImage ?? null,
          ...(userData.role && { role: userData.role }),
          ...(userData.bio !== undefined && { bio: userData.bio }),
          ...(userData.phoneNumber !== undefined && { phoneNumber: userData.phoneNumber }),
          ...(userData.stripeAccountId !== undefined && { stripeAccountId: userData.stripeAccountId }),
          ...(userData.stripeCustomerId !== undefined && { stripeCustomerId: userData.stripeCustomerId }),
        }
      })
      .returning();
    
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.database.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.database.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await this.database
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getExperience(id: string): Promise<Experience | undefined> {
    const result = await this.database.select().from(experiences).where(eq(experiences.id, id)).limit(1);
    return result[0];
  }

  async getExperiences(filters?: { category?: string; city?: string; mentorId?: string; approvalStatus?: string; search?: string }): Promise<Experience[]> {
    const conditions = [eq(experiences.isActive, true)];
    
    if (filters?.category) {
      conditions.push(eq(experiences.category, filters.category));
    }
    if (filters?.city) {
      conditions.push(eq(experiences.city, filters.city));
    }
    if (filters?.mentorId) {
      conditions.push(eq(experiences.mentorId, filters.mentorId));
    }
    if (filters?.approvalStatus) {
      conditions.push(eq(experiences.approvalStatus, filters.approvalStatus as any));
    }
    
    let result = await this.database.select().from(experiences).where(and(...conditions));
    
    // If search filter is provided, apply smart search
    if (filters?.search) {
      const searchTerm = filters.search.trim().toLowerCase();
      
      // First try case-insensitive substring match
      let filtered = result.filter(exp => {
        const titleMatch = exp.title.toLowerCase().includes(searchTerm);
        const descMatch = exp.description.toLowerCase().includes(searchTerm);
        const catMatch = exp.category.toLowerCase().includes(searchTerm);
        const cityMatch = exp.city.toLowerCase().includes(searchTerm);
        const pointsMatch = exp.learningPoints.some(point => point.toLowerCase().includes(searchTerm));
        return titleMatch || descMatch || catMatch || cityMatch || pointsMatch;
      });
      
      // If no results, search by individual words (excluding stop words)
      if (filtered.length === 0) {
        const stopWords = ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'أو', 'و', 'أن', 'أريد', 'أبحث'];
        const searchWords = searchTerm.split(/\s+/).filter(word => 
          word.length > 0 && !stopWords.includes(word)
        );
        
        if (searchWords.length > 0) {
          filtered = result.filter(exp =>
            searchWords.some(word => {
              const titleMatch = exp.title.toLowerCase().includes(word);
              const descMatch = exp.description.toLowerCase().includes(word);
              const catMatch = exp.category.toLowerCase().includes(word);
              const cityMatch = exp.city.toLowerCase().includes(word);
              const pointsMatch = exp.learningPoints.some(point => point.toLowerCase().includes(word));
              return titleMatch || descMatch || catMatch || cityMatch || pointsMatch;
            })
          );
        }
      }
      
      // If still no results, show all available experiences
      if (filtered.length === 0 && result.length > 0) {
        filtered = result;
      }
      
      result = filtered;
    }
    
    return result;
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const result = await this.database.insert(experiences).values(insertExperience).returning();
    return result[0];
  }

  async updateExperience(id: string, updates: Partial<InsertExperience>): Promise<Experience | undefined> {
    const result = await this.database
      .update(experiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experiences.id, id))
      .returning();
    return result[0];
  }

  async deleteExperience(id: string): Promise<boolean> {
    const result = await this.database.delete(experiences).where(eq(experiences.id, id)).returning();
    return result.length > 0;
  }

  async getAvailability(experienceId: string): Promise<Availability[]> {
    return await this.database
      .select()
      .from(availability)
      .where(and(eq(availability.experienceId, experienceId), eq(availability.isBooked, false)));
  }

  async getAvailabilityById(id: string): Promise<Availability | undefined> {
    const result = await this.database.select().from(availability).where(eq(availability.id, id)).limit(1);
    return result[0];
  }

  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const result = await this.database.insert(availability).values(insertAvailability).returning();
    return result[0];
  }

  async markAvailabilityBooked(id: string, bookingId: string): Promise<boolean> {
    const avail = await this.getAvailabilityById(id);
    if (!avail || avail.isBooked) return false;
    
    const result = await this.database
      .update(availability)
      .set({ isBooked: true, bookedByBookingId: bookingId })
      .where(and(eq(availability.id, id), eq(availability.isBooked, false)))
      .returning();
    
    return result.length > 0;
  }

  async releaseAvailability(id: string, bookingId: string): Promise<boolean> {
    const result = await this.database
      .update(availability)
      .set({ isBooked: false, bookedByBookingId: null })
      .where(and(eq(availability.id, id), eq(availability.bookedByBookingId, bookingId)))
      .returning();
    
    return result.length > 0;
  }

  async deleteAvailability(id: string): Promise<boolean> {
    const result = await this.database
      .delete(availability)
      .where(eq(availability.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const result = await this.database.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return result[0];
  }

  async getBookingsByLearner(learnerId: string): Promise<Booking[]> {
    return await this.database
      .select()
      .from(bookings)
      .where(eq(bookings.learnerId, learnerId))
      .orderBy(desc(bookings.createdAt));
  }

  async getBookingsByMentor(mentorId: string): Promise<Booking[]> {
    return await this.database
      .select()
      .from(bookings)
      .where(eq(bookings.mentorId, mentorId))
      .orderBy(desc(bookings.createdAt));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const reviewDeadline = new Date(insertBooking.sessionDate);
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);
    
    const bookingData = {
      ...insertBooking,
      reviewDeadline,
    };
    
    const result = await this.database.insert(bookings).values(bookingData).returning();
    return result[0];
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await this.database
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  }

  async getReview(bookingId: string): Promise<Review | undefined> {
    const result = await this.database.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
    return result[0];
  }

  async getReviewsByMentor(mentorId: string): Promise<Review[]> {
    return await this.database
      .select()
      .from(reviews)
      .where(eq(reviews.mentorId, mentorId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const result = await this.database.insert(reviews).values(insertReview).returning();
    return result[0];
  }

  async getCommissionRate(experienceId: string, mentorId: string): Promise<number> {
    const experience = await this.getExperience(experienceId);
    if (!experience) return 15;

    const mentorRule = await this.database
      .select()
      .from(commissionRules)
      .where(and(
        eq(commissionRules.ruleType, "mentor"),
        eq(commissionRules.targetId, mentorId),
        eq(commissionRules.isActive, true)
      ))
      .limit(1);
    
    if (mentorRule[0]) return parseFloat(mentorRule[0].commissionRate);

    const categoryRule = await this.database
      .select()
      .from(commissionRules)
      .where(and(
        eq(commissionRules.ruleType, "category"),
        eq(commissionRules.targetId, experience.category),
        eq(commissionRules.isActive, true)
      ))
      .limit(1);
    
    if (categoryRule[0]) return parseFloat(categoryRule[0].commissionRate);

    const globalRule = await this.database
      .select()
      .from(commissionRules)
      .where(and(
        eq(commissionRules.ruleType, "global"),
        eq(commissionRules.isActive, true)
      ))
      .limit(1);
    
    return globalRule[0] ? parseFloat(globalRule[0].commissionRate) : 15;
  }

  async getCommissionRule(id: string): Promise<CommissionRule | undefined> {
    const result = await this.database.select().from(commissionRules).where(eq(commissionRules.id, id)).limit(1);
    return result[0];
  }

  async getCommissionRules(): Promise<CommissionRule[]> {
    return await this.database.select().from(commissionRules).orderBy(desc(commissionRules.createdAt));
  }

  async createCommissionRule(insertRule: InsertCommissionRule): Promise<CommissionRule> {
    const result = await this.database.insert(commissionRules).values(insertRule).returning();
    return result[0];
  }

  async updateCommissionRule(id: string, updates: Partial<InsertCommissionRule>): Promise<CommissionRule | undefined> {
    const result = await this.database
      .update(commissionRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(commissionRules.id, id))
      .returning();
    return result[0];
  }

  async deleteCommissionRule(id: string): Promise<boolean> {
    const result = await this.database.delete(commissionRules).where(eq(commissionRules.id, id)).returning();
    return result.length > 0;
  }

  async getBookingsAwaitingReview(): Promise<Booking[]> {
    const now = new Date();
    
    const completedBookings = await this.database
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.status, "completed"),
        eq(bookings.paymentStatus, "held"),
        lte(bookings.reviewDeadline, now)
      ));
    
    const bookingsWithoutReviews = [];
    for (const booking of completedBookings) {
      const review = await this.getReview(booking.id);
      if (!review) {
        bookingsWithoutReviews.push(booking);
      }
    }
    
    return bookingsWithoutReviews;
  }

  async getBookingsEligibleForRelease(): Promise<Booking[]> {
    const heldBookings = await this.database
      .select()
      .from(bookings)
      .where(eq(bookings.paymentStatus, "held"));
    
    const eligibleBookings = [];
    for (const booking of heldBookings) {
      const review = await this.getReview(booking.id);
      if (review && review.rating >= 3) {
        eligibleBookings.push(booking);
      }
    }
    
    return eligibleBookings;
  }

  async holdPayment(bookingId: string, paymentIntentId: string): Promise<void> {
    await this.database
      .update(bookings)
      .set({
        paymentStatus: "held",
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  async releasePayment(bookingId: string, transferId: string): Promise<void> {
    await this.database
      .update(bookings)
      .set({
        paymentStatus: "released",
        stripeTransferId: transferId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  async refundPayment(bookingId: string): Promise<void> {
    await this.database
      .update(bookings)
      .set({
        paymentStatus: "refunded",
        status: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  async flagForManualReview(bookingId: string, reason: string): Promise<void> {
    this.manualReviewFlags.set(bookingId, { bookingId, reason });
  }

  async getComplaint(id: string): Promise<Complaint | undefined> {
    const result = await this.database.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    return result[0];
  }

  async getComplaints(filters?: { status?: string }): Promise<Complaint[]> {
    if (filters?.status) {
      return await this.database
        .select()
        .from(complaints)
        .where(eq(complaints.status, filters.status as any))
        .orderBy(desc(complaints.createdAt));
    }
    
    return await this.database.select().from(complaints).orderBy(desc(complaints.createdAt));
  }

  async getComplaintsByReporter(reporterId: string): Promise<Complaint[]> {
    return await this.database
      .select()
      .from(complaints)
      .where(eq(complaints.reporterId, reporterId))
      .orderBy(desc(complaints.createdAt));
  }

  async createComplaint(insertComplaint: InsertComplaint): Promise<Complaint> {
    const result = await this.database.insert(complaints).values(insertComplaint).returning();
    return result[0];
  }

  async updateComplaint(id: string, updates: Partial<InsertComplaint>): Promise<Complaint | undefined> {
    const result = await this.database
      .update(complaints)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();
    return result[0];
  }

  async getAllBookings(): Promise<Booking[]> {
    return await this.database.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getAllUsers(filters?: { role?: string }): Promise<User[]> {
    if (filters?.role) {
      return await this.database
        .select()
        .from(users)
        .where(eq(users.role, filters.role as any))
        .orderBy(desc(users.createdAt));
    }
    
    return await this.database.select().from(users).orderBy(desc(users.createdAt));
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; platformRevenue: number; mentorRevenue: number }> {
    const completedBookings = await this.database
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.status, "completed"),
        eq(bookings.paymentStatus, "released")
      ));
    
    const totalRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const platformRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.platformFee), 0);
    const mentorRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.mentorAmount), 0);
    
    return { totalRevenue, platformRevenue, mentorRevenue };
  }

  async isAdminEmail(email: string): Promise<boolean> {
    const result = await this.database.select().from(adminEmails).where(eq(adminEmails.email, email)).limit(1);
    return result.length > 0;
  }

  async getAdminEmails(): Promise<string[]> {
    const result = await this.database.select().from(adminEmails);
    return result.map(row => row.email);
  }

  async addAdminEmail(email: string, addedByAdminId?: string): Promise<void> {
    await this.database.insert(adminEmails).values({
      email,
      addedByAdminId: addedByAdminId ?? null,
    });
  }

  async removeAdminEmail(email: string): Promise<void> {
    await this.database.delete(adminEmails).where(eq(adminEmails.email, email));
  }

  // Conversations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await this.database.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationByBookingId(bookingId: string): Promise<Conversation | undefined> {
    const result = await this.database.select().from(conversations).where(eq(conversations.bookingId, bookingId)).limit(1);
    return result[0];
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await this.database
      .select()
      .from(conversations)
      .where(or(
        eq(conversations.mentorId, userId),
        eq(conversations.learnerId, userId)
      ))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(insertConv: InsertConversation): Promise<Conversation> {
    const result = await this.database.insert(conversations).values(insertConv).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await this.database
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return await this.database
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const result = await this.database.insert(messages).values(insertMsg).returning();
    return result[0];
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await this.database
      .update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`
      ));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const userConversations = await this.getConversationsByUserId(userId);
    const conversationIds = userConversations.map(c => c.id);
    
    if (conversationIds.length === 0) return 0;
    
    const result = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(
        sql`${messages.conversationId} IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`,
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      ));
    
    return result[0]?.count ?? 0;
  }
}

// Use DbStorage for persistent PostgreSQL-based storage
export const storage = new DbStorage(db);
