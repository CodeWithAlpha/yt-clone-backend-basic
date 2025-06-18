import { Activity } from "../models/activity.model";

export const logActivity = async ({
  user,
  method,
  endpoint,
  message,
  ip,
  userAgent,
}: {
  user?: string;
  method?: string;
  endpoint?: string;
  message?: string;
  ip?: string;
  userAgent?: string;
}) => {
  try {
    await Activity.create({
      user,
      method,
      endpoint,
      message,
      ip,
      userAgent,
    });
  } catch (err) {
    // console.error("Logging failed:", err);
  }
};
