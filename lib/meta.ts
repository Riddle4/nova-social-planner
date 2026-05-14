import type { Company, MediaAsset, Post } from "@prisma/client";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

type MetaPost = Post & { mediaAsset: MediaAsset | null };

type MetaScheduleResult = {
  ok: boolean;
  facebookPostId?: string;
  instagramPostId?: string;
  error?: string;
};

function getMetaAccessToken(company: Company) {
  return process.env.META_ACCESS_TOKEN || company.metaAccessTokenEncrypted || "";
}

function buildCaption(post: MetaPost, platform: "FACEBOOK" | "INSTAGRAM") {
  const text = platform === "INSTAGRAM" ? post.instagramText || post.facebookText : post.facebookText || post.instagramText;
  const hashtags = post.hashtags.length ? `\n\n${post.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}` : "";
  return `${text || ""}${hashtags}`.trim();
}

function scheduleTimestamp(post: MetaPost) {
  if (!post.recommendedDate) return null;
  const [hours = "9", minutes = "0"] = (post.recommendedTime || "09:00").split(":");
  const date = new Date(post.recommendedDate);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function validateSchedule(post: MetaPost): { ok: true; timestamp: number } | { ok: false; error: string } {
  const timestamp = scheduleTimestamp(post);
  if (!timestamp) return { ok: false, error: "Date recommandée manquante." as const };
  const now = Math.floor(Date.now() / 1000);
  const min = now + 10 * 60;
  const max = now + 75 * 24 * 60 * 60;
  if (timestamp < min) return { ok: false, error: "La date doit être au moins 10 minutes dans le futur." as const };
  if (timestamp > max) return { ok: false, error: "La date doit être dans les 75 prochains jours." as const };
  return { ok: true, timestamp };
}

async function postToGraph(path: string, body: Record<string, string | number | boolean>) {
  const response = await fetch(`${GRAPH_BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(
      Object.entries(body).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {})
    )
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Erreur Meta Graph API.");
  }
  return data as { id?: string; post_id?: string };
}

async function scheduleFacebookPost(params: {
  pageId: string;
  accessToken: string;
  post: MetaPost;
  scheduledPublishTime: number;
}) {
  const caption = buildCaption(params.post, "FACEBOOK");
  if (!caption) throw new Error("Texte Facebook manquant.");

  if (params.post.mediaAsset?.url) {
    const data = await postToGraph(`${params.pageId}/photos`, {
      access_token: params.accessToken,
      url: params.post.mediaAsset.url,
      caption,
      published: false,
      scheduled_publish_time: params.scheduledPublishTime
    });
    return data.post_id || data.id;
  }

  const data = await postToGraph(`${params.pageId}/feed`, {
    access_token: params.accessToken,
    message: caption,
    published: false,
    scheduled_publish_time: params.scheduledPublishTime
  });
  return data.id;
}

async function scheduleInstagramPost(params: {
  instagramBusinessId: string;
  accessToken: string;
  post: MetaPost;
  scheduledPublishTime: number;
}) {
  const caption = buildCaption(params.post, "INSTAGRAM");
  if (!caption) throw new Error("Texte Instagram manquant.");
  if (!params.post.mediaAsset?.url) throw new Error("Instagram nécessite une image publique.");

  const data = await postToGraph(`${params.instagramBusinessId}/media`, {
    access_token: params.accessToken,
    image_url: params.post.mediaAsset.url,
    caption,
    published: false,
    scheduled_publish_time: params.scheduledPublishTime
  });
  return data.id;
}

export function getMetaConfigurationIssues(company: Company) {
  const issues: string[] = [];
  if (!getMetaAccessToken(company)) issues.push("META_ACCESS_TOKEN manquant.");
  if (!company.metaFacebookPageId) issues.push("Facebook Page ID manquant.");
  if (!company.metaInstagramBusinessId) issues.push("Instagram Business Account ID manquant.");
  return issues;
}

export async function schedulePostToMeta(company: Company, post: MetaPost): Promise<MetaScheduleResult> {
  const accessToken = getMetaAccessToken(company);
  if (!accessToken) return { ok: false, error: "META_ACCESS_TOKEN manquant." };

  const schedule = validateSchedule(post);
  if (!schedule.ok) return { ok: false, error: schedule.error };

  const result: MetaScheduleResult = { ok: true };
  const errors: string[] = [];
  const shouldScheduleFacebook = post.platform === "FACEBOOK" || post.platform === "BOTH";
  const shouldScheduleInstagram = post.platform === "INSTAGRAM" || post.platform === "BOTH";

  if (shouldScheduleFacebook) {
    if (!company.metaFacebookPageId) {
      errors.push("Facebook Page ID manquant.");
    } else {
      try {
        result.facebookPostId = await scheduleFacebookPost({
          pageId: company.metaFacebookPageId,
          accessToken,
          post,
          scheduledPublishTime: schedule.timestamp
        });
      } catch (error) {
        errors.push(`Facebook: ${error instanceof Error ? error.message : "erreur inconnue"}`);
      }
    }
  }

  if (shouldScheduleInstagram) {
    if (!company.metaInstagramBusinessId) {
      errors.push("Instagram Business Account ID manquant.");
    } else {
      try {
        result.instagramPostId = await scheduleInstagramPost({
          instagramBusinessId: company.metaInstagramBusinessId,
          accessToken,
          post,
          scheduledPublishTime: schedule.timestamp
        });
      } catch (error) {
        errors.push(`Instagram: ${error instanceof Error ? error.message : "erreur inconnue"}`);
      }
    }
  }

  if (errors.length) {
    return { ...result, ok: Boolean(result.facebookPostId || result.instagramPostId), error: errors.join(" | ") };
  }

  return result;
}
