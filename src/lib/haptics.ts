import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "@/lib/native";

export type CheckinFeedback = "tick" | "milestone" | "complete";

/**
 * 分级震动:普通打卡轻震,里程碑重震,目标完成用成功通知震动。
 * 只在原生包里触发;网页端和设备禁用震动时静默跳过,不影响打卡流程。
 */
export async function playCheckinFeedback(level: CheckinFeedback): Promise<void> {
  if (!isNative()) return;
  try {
    if (level === "complete") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (level === "milestone") {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {
    // 部分机型/系统设置会屏蔽震动,静默降级
  }
}
