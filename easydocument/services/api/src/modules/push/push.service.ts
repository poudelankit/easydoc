import { Injectable } from "@nestjs/common";
import { writeStructuredLog } from "../../common/logging/structured-logger";

export type PushProviderMode = "placeholder" | "firebase-placeholder";

export interface PushProviderStatus {
  mode: PushProviderMode;
  providerName: string;
  configured: boolean;
  projectId: string | null;
  serviceAccountReference: string | null;
}

export interface PushNotificationPlaceholderInput {
  notificationId: string;
  recipientUserId: string;
  type: string;
  title: string;
}

@Injectable()
export class PushService {
  async publishPlaceholder(input: PushNotificationPlaceholderInput) {
    const status = this.getProviderStatus();
    writeStructuredLog("info", "push.notification.delivery_prepared", {
      notificationId: input.notificationId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      providerMode: status.mode,
      providerName: status.providerName,
      configured: status.configured
    });

    return {
      accepted: status.configured,
      providerMode: status.mode,
      providerName: status.providerName
    };
  }

  getProviderStatus(): PushProviderStatus {
    const providerName = process.env.PUSH_PROVIDER?.trim() || "placeholder";
    const mode: PushProviderMode = providerName === "firebase" ? "firebase-placeholder" : "placeholder";
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || null;
    const serviceAccountReference =
      process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME?.trim() ||
      (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ? "FIREBASE_SERVICE_ACCOUNT_JSON" : null);
    const configured = mode === "placeholder" ? true : Boolean(projectId && serviceAccountReference);

    return {
      mode,
      providerName,
      configured,
      projectId,
      serviceAccountReference
    };
  }
}
