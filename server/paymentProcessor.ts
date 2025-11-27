import { storage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Process payments that are eligible for release
 * This should be run periodically (e.g., every hour) to handle:
 * 1. Auto-release funds after 24h review deadline passes (no review submitted)
 * 2. Process payments based on reviews (rating >= 3 = release)
 * NOTE: Reviews with rating < 3 are sent to admin for manual review
 */
export async function processPayments() {
  console.log("[Payment Processor] Starting payment processing...");
  
  try {
    // Get bookings awaiting review (24h deadline passed, no review)
    const awaitingReview = await storage.getBookingsAwaitingReview();
    console.log(`[Payment Processor] Found ${awaitingReview.length} bookings awaiting review`);
    
    for (const booking of awaitingReview) {
      try {
        // Auto-release payment since no review was submitted within 24h
        await releasePaymentToMentor(booking.id);
        console.log(`[Payment Processor] Auto-released payment for booking ${booking.id}`);
      } catch (error) {
        console.error(`[Payment Processor] Error processing booking ${booking.id}:`, error);
        await storage.flagForManualReview(booking.id, `Auto-release failed: ${error}`);
      }
    }
    
    // Get bookings eligible for release based on reviews (only rating >= 3)
    const eligibleForRelease = await storage.getBookingsEligibleForRelease();
    console.log(`[Payment Processor] Found ${eligibleForRelease.length} bookings eligible for release`);
    
    for (const booking of eligibleForRelease) {
      try {
        const review = await storage.getReview(booking.id);
        if (!review) continue;
        
        // Only process rating >= 3 (rating < 3 goes to admin review)
        if (review.rating >= 3) {
          await releasePaymentToMentor(booking.id);
          console.log(`[Payment Processor] Released payment for booking ${booking.id} (rating: ${review.rating})`);
        }
        // NOTE: rating < 3 is handled by admin via complaints system
      } catch (error) {
        console.error(`[Payment Processor] Error processing booking ${booking.id}:`, error);
        await storage.flagForManualReview(booking.id, `Payment processing failed: ${error}`);
      }
    }
    
    console.log("[Payment Processor] Payment processing completed");
  } catch (error) {
    console.error("[Payment Processor] Fatal error:", error);
  }
}

async function releasePaymentToMentor(bookingId: string) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  
  if (booking.paymentStatus !== 'held') {
    throw new Error(`Cannot release payment with status: ${booking.paymentStatus}`);
  }
  
  const stripe = await getUncachableStripeClient();
  const mentor = await storage.getUser(booking.mentorId);
  
  if (!mentor?.stripeAccountId) {
    throw new Error("Mentor doesn't have a Stripe account");
  }
  
  // Create transfer to mentor
  const transfer = await stripe.transfers.create({
    amount: Math.round(parseFloat(booking.mentorAmount) * 100),
    currency: 'sar', // Saudi Riyal
    destination: mentor.stripeAccountId,
    metadata: {
      bookingId: booking.id,
      mentorId: booking.mentorId,
      learnerId: booking.learnerId
    }
  });
  
  // Update booking
  await storage.releasePayment(bookingId, transfer.id);
  await storage.updateBooking(bookingId, {
    status: 'completed',
    paymentStatus: 'released'
  });
}

async function refundPaymentToLearner(bookingId: string) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  
  if (booking.paymentStatus !== 'held') {
    throw new Error(`Cannot refund payment with status: ${booking.paymentStatus}`);
  }
  
  if (!booking.stripePaymentIntentId) {
    throw new Error("No payment intent ID found");
  }
  
  const stripe = await getUncachableStripeClient();
  
  // Create refund
  await stripe.refunds.create({
    payment_intent: booking.stripePaymentIntentId,
    metadata: {
      bookingId: booking.id,
      reason: 'Low rating (< 3 stars)'
    }
  });
  
  // Update booking
  await storage.refundPayment(bookingId);
}

/**
 * Start the payment processor (runs every hour)
 */
export function startPaymentProcessor() {
  // Run immediately on startup
  processPayments();
  
  // Then run every hour
  setInterval(() => {
    processPayments();
  }, 60 * 60 * 1000); // 1 hour
  
  console.log("[Payment Processor] Started (runs every hour)");
}
