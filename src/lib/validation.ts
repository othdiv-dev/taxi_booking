import { z } from "zod";

export const vehicleTypeSchema = z.enum(["sedan", "van", "luxury"]);

export const pricingRequestSchema = z.object({
  pickupAddress: z.string().min(3).max(255),
  dropoffAddress: z.string().min(3).max(255),
  vehicleType: vehicleTypeSchema.default("sedan"),
});

export const bookingRequestSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().max(100),
  customerPhone: z.string().min(6).max(20),
  passengers: z.coerce.number().int().min(1).max(8).default(1),
  luggage: z.coerce.number().int().min(0).max(8).default(1),
  zoneSlug: z.string().max(100).optional().nullable(),
  pickupAddress: z.string().min(3).max(255),
  dropoffAddress: z.string().min(3).max(255),
  pickupDatetime: z.string().min(1),
  flightNumber: z.string().max(20).optional().nullable(),
  vehicleType: vehicleTypeSchema.default("sedan"),
  customerNotes: z.string().max(1000).optional().nullable(),
});
