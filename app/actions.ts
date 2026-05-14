"use server";

import { CommercialPriority, Platform, PostStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseTags, toNullableDate, toNullableString } from "@/lib/utils";

export async function getDefaultCompany() {
  const configuredId = process.env.NOVA_DEFAULT_COMPANY_ID;
  if (configuredId) {
    const found = await prisma.company.findUnique({ where: { id: configuredId } });
    if (found) return found;
  }

  return prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Cosmo Atelier",
      description: "Entreprise locale qui veut développer une présence Facebook et Instagram régulière.",
      website: "https://cosmo-ai.local",
      brandTone: "premium, chaleureux, clair, orienté conversion",
      facebookUrl: "https://facebook.com",
      instagramUrl: "https://instagram.com",
      defaultLanguage: "fr",
      timezone: "Europe/Zurich"
    }
  });
}

export async function upsertCompany(formData: FormData) {
  const company = await getDefaultCompany();
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: String(formData.get("name") || company.name),
      description: toNullableString(formData.get("description")),
      website: toNullableString(formData.get("website")),
      brandTone: toNullableString(formData.get("brandTone")),
      facebookUrl: toNullableString(formData.get("facebookUrl")),
      instagramUrl: toNullableString(formData.get("instagramUrl")),
      defaultLanguage: String(formData.get("defaultLanguage") || "fr"),
      timezone: String(formData.get("timezone") || "Europe/Zurich"),
      metaFacebookPageId: toNullableString(formData.get("metaFacebookPageId")),
      metaInstagramBusinessId: toNullableString(formData.get("metaInstagramBusinessId"))
    }
  });
  revalidatePath("/nova");
  revalidatePath("/dashboard");
}

export async function createService(formData: FormData) {
  const company = await getDefaultCompany();
  await prisma.service.create({
    data: {
      companyId: company.id,
      name: String(formData.get("name") || "Nouveau service"),
      shortDescription: String(formData.get("shortDescription") || ""),
      longDescription: toNullableString(formData.get("longDescription")),
      targetAudience: toNullableString(formData.get("targetAudience")),
      benefits: toNullableString(formData.get("benefits")),
      pricingInfo: toNullableString(formData.get("pricingInfo")),
      bookingUrl: toNullableString(formData.get("bookingUrl")),
      bookingEmail: toNullableString(formData.get("bookingEmail")),
      seasonality: toNullableString(formData.get("seasonality")),
      commercialPriority: String(formData.get("commercialPriority") || "MEDIUM") as CommercialPriority,
      salesArguments: toNullableString(formData.get("salesArguments")),
      frequentObjections: toNullableString(formData.get("frequentObjections"))
    }
  });
  revalidatePath("/services");
}

export async function updateService(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.service.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "Service"),
      shortDescription: String(formData.get("shortDescription") || ""),
      longDescription: toNullableString(formData.get("longDescription")),
      targetAudience: toNullableString(formData.get("targetAudience")),
      benefits: toNullableString(formData.get("benefits")),
      pricingInfo: toNullableString(formData.get("pricingInfo")),
      bookingUrl: toNullableString(formData.get("bookingUrl")),
      bookingEmail: toNullableString(formData.get("bookingEmail")),
      seasonality: toNullableString(formData.get("seasonality")),
      commercialPriority: String(formData.get("commercialPriority") || "MEDIUM") as CommercialPriority,
      salesArguments: toNullableString(formData.get("salesArguments")),
      frequentObjections: toNullableString(formData.get("frequentObjections"))
    }
  });
  revalidatePath("/services");
  revalidatePath(`/services/${id}`);
  revalidatePath("/nova");
}

export async function deleteService(formData: FormData) {
  await prisma.service.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/services");
  redirect("/services");
}

export async function createEvent(formData: FormData) {
  const company = await getDefaultCompany();
  await prisma.event.create({
    data: {
      companyId: company.id,
      title: String(formData.get("title") || "Nouvel événement"),
      description: toNullableString(formData.get("description")),
      startsAt: toNullableDate(formData.get("startsAt")) || new Date(),
      endsAt: toNullableDate(formData.get("endsAt")),
      location: toNullableString(formData.get("location")),
      targetAudience: toNullableString(formData.get("targetAudience")),
      bookingUrl: toNullableString(formData.get("bookingUrl")),
      bookingEmail: toNullableString(formData.get("bookingEmail")),
      registrationDeadline: toNullableDate(formData.get("registrationDeadline")),
      commercialPriority: String(formData.get("commercialPriority") || "MEDIUM") as CommercialPriority,
      objective: toNullableString(formData.get("objective")),
      internalNotes: toNullableString(formData.get("internalNotes"))
    }
  });
  revalidatePath("/events");
}

export async function updateEvent(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.event.update({
    where: { id },
    data: {
      title: String(formData.get("title") || "Événement"),
      description: toNullableString(formData.get("description")),
      startsAt: toNullableDate(formData.get("startsAt")) || new Date(),
      endsAt: toNullableDate(formData.get("endsAt")),
      location: toNullableString(formData.get("location")),
      targetAudience: toNullableString(formData.get("targetAudience")),
      bookingUrl: toNullableString(formData.get("bookingUrl")),
      bookingEmail: toNullableString(formData.get("bookingEmail")),
      registrationDeadline: toNullableDate(formData.get("registrationDeadline")),
      commercialPriority: String(formData.get("commercialPriority") || "MEDIUM") as CommercialPriority,
      objective: toNullableString(formData.get("objective")),
      internalNotes: toNullableString(formData.get("internalNotes"))
    }
  });
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/nova");
}

export async function deleteEvent(formData: FormData) {
  await prisma.event.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/events");
  redirect("/events");
}

export async function createPost(formData: FormData) {
  const company = await getDefaultCompany();
  const post = await prisma.post.create({
    data: {
      companyId: company.id,
      serviceId: toNullableString(formData.get("serviceId")),
      eventId: toNullableString(formData.get("eventId")),
      mediaAssetId: toNullableString(formData.get("mediaAssetId")),
      internalTitle: String(formData.get("internalTitle") || "Post Nova"),
      objective: toNullableString(formData.get("objective")),
      marketingAngle: toNullableString(formData.get("marketingAngle")),
      platform: String(formData.get("platform") || "BOTH") as Platform,
      status: String(formData.get("status") || "IDEA") as PostStatus,
      recommendedDate: toNullableDate(formData.get("recommendedDate")),
      recommendedTime: toNullableString(formData.get("recommendedTime")),
      facebookText: toNullableString(formData.get("facebookText")),
      instagramText: toNullableString(formData.get("instagramText")),
      hashtags: parseTags(formData.get("hashtags")),
      callToAction: toNullableString(formData.get("callToAction")),
      link: toNullableString(formData.get("link")),
      generatedImagePrompt: toNullableString(formData.get("generatedImagePrompt")),
      novaScore: Number(formData.get("novaScore")) || null,
      strategicJustification: toNullableString(formData.get("strategicJustification"))
    }
  });
  revalidatePath("/posts");
  redirect(`/posts/${post.id}`);
}

export async function updatePost(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.post.update({
    where: { id },
    data: {
      serviceId: toNullableString(formData.get("serviceId")),
      eventId: toNullableString(formData.get("eventId")),
      internalTitle: String(formData.get("internalTitle") || "Post Nova"),
      objective: toNullableString(formData.get("objective")),
      marketingAngle: toNullableString(formData.get("marketingAngle")),
      platform: String(formData.get("platform") || "BOTH") as Platform,
      status: String(formData.get("status") || "AI_DRAFT") as PostStatus,
      recommendedDate: toNullableDate(formData.get("recommendedDate")),
      recommendedTime: toNullableString(formData.get("recommendedTime")),
      facebookText: toNullableString(formData.get("facebookText")),
      instagramText: toNullableString(formData.get("instagramText")),
      hashtags: parseTags(formData.get("hashtags")),
      callToAction: toNullableString(formData.get("callToAction")),
      link: toNullableString(formData.get("link")),
      generatedImagePrompt: toNullableString(formData.get("generatedImagePrompt")),
      novaScore: Number(formData.get("novaScore")) || null,
      strategicJustification: toNullableString(formData.get("strategicJustification"))
    }
  });
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/calendar");
}

export async function updatePostMedia(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.post.update({
    where: { id },
    data: { mediaAssetId: toNullableString(formData.get("mediaAssetId")) }
  });
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/calendar");
}

export async function removePostMedia(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.post.update({
    where: { id },
    data: { mediaAssetId: null }
  });
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/calendar");
}

export async function deletePost(formData: FormData) {
  await prisma.post.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/posts");
  redirect("/posts");
}

export async function archivePost(formData: FormData) {
  await prisma.post.update({
    where: { id: String(formData.get("id")) },
    data: { status: "ARCHIVED" }
  });
  revalidatePath("/posts");
  revalidatePath(`/posts/${String(formData.get("id"))}`);
}

export async function uploadMedia(formData: FormData) {
  const company = await getDefaultCompany();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const serviceId = toNullableString(formData.get("serviceId"));
  const eventId = toNullableString(formData.get("eventId"));

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", safeName);
  await writeFile(uploadPath, bytes);

  await prisma.mediaAsset.create({
    data: {
      companyId: company.id,
      serviceId,
      eventId,
      url: `/uploads/${safeName}`,
      filename: file.name,
      type: file.type || "application/octet-stream",
      title: toNullableString(formData.get("title")),
      description: toNullableString(formData.get("description")),
      tags: parseTags(formData.get("tags")),
      source: "UPLOAD"
    }
  });
  revalidatePath("/media");
  if (serviceId) revalidatePath(`/media/services/${serviceId}`);
  if (eventId) revalidatePath(`/media/events/${eventId}`);
  if (!serviceId && !eventId) revalidatePath("/media/uncategorized");
}

export async function updateMedia(formData: FormData) {
  const id = String(formData.get("id"));
  const existing = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { serviceId: true, eventId: true }
  });
  const serviceId = toNullableString(formData.get("serviceId"));
  const eventId = toNullableString(formData.get("eventId"));
  await prisma.mediaAsset.update({
    where: { id },
    data: {
      serviceId,
      eventId,
      title: toNullableString(formData.get("title")),
      description: toNullableString(formData.get("description")),
      tags: parseTags(formData.get("tags"))
    }
  });
  revalidatePath("/media");
  if (existing?.serviceId) revalidatePath(`/media/services/${existing.serviceId}`);
  if (existing?.eventId) revalidatePath(`/media/events/${existing.eventId}`);
  if (!existing?.serviceId && !existing?.eventId) revalidatePath("/media/uncategorized");
  if (serviceId) revalidatePath(`/media/services/${serviceId}`);
  if (eventId) revalidatePath(`/media/events/${eventId}`);
  if (!serviceId && !eventId) revalidatePath("/media/uncategorized");
  revalidatePath("/nova");
}

export async function deleteMedia(formData: FormData) {
  const id = String(formData.get("id"));
  const existing = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { serviceId: true, eventId: true }
  });
  await prisma.mediaAsset.delete({ where: { id } });
  revalidatePath("/media");
  if (existing?.serviceId) revalidatePath(`/media/services/${existing.serviceId}`);
  if (existing?.eventId) revalidatePath(`/media/events/${existing.eventId}`);
  if (!existing?.serviceId && !existing?.eventId) revalidatePath("/media/uncategorized");
  revalidatePath("/nova");
}
