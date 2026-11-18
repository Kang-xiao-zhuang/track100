package com.track100.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Widget 与 WebView(JS) 之间的数据桥接层。
 *
 * <p>AppWidgetProvider 运行在桌面/主进程，无法直接读 WebView 的 localStorage，
 * 因此统一通过文件名为 {@link #PREFS_NAME} 的 SharedPreferences 中转。
 * 两个进程同属一个应用 UID，可共享该文件。</p>
 *
 * <ul>
 *   <li>{@link #KEY_GOALS}    : 最多 4 个目标的 JSON 数组字符串</li>
 *   <li>{@link #KEY_PENDING}  : 待 JS 消费的打卡记录 JSON 数组字符串</li>
 * </ul>
 */
public final class WidgetPrefs {

    public static final String PREFS_NAME = "Track100Prefs";
    public static final String KEY_GOALS = "widget_goals";
    public static final String KEY_PENDING = "pending_checkins";
    public static final int MAX_GOALS = 4;

    private WidgetPrefs() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /**
     * 写入目标列表（最多 {@link #MAX_GOALS} 个），只保留 widget 需要的字段。
     */
    public static void saveGoals(Context context, JSONArray goals) {
        JSONArray out = new JSONArray();
        int count = goals == null ? 0 : Math.min(goals.length(), MAX_GOALS);
        for (int i = 0; i < count; i++) {
            JSONObject src = goals.optJSONObject(i);
            if (src == null) {
                continue;
            }
            JSONObject item = new JSONObject();
            putString(item, src, "id", "");
            putString(item, src, "title", "");
            putString(item, src, "icon", "🎯");
            putNumber(item, src, "step", 1);
            putNumber(item, src, "current", 0);
            putNumber(item, src, "target", 0);
            putString(item, src, "color", "");
            out.put(item);
        }
        prefs(context).edit().putString(KEY_GOALS, out.toString()).commit();
    }

    /** 读取目标列表；数据损坏或为空时返回空数组。 */
    public static JSONArray getGoals(Context context) {
        String raw = prefs(context).getString(KEY_GOALS, null);
        if (raw == null) {
            return new JSONArray();
        }
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    /** 追加一条待消费打卡记录。用 commit 确保跨进程/进程重启前落盘。 */
    public static void appendPending(Context context, JSONObject entry) {
        JSONArray pending = getPending(context);
        pending.put(entry);
        prefs(context).edit().putString(KEY_PENDING, pending.toString()).commit();
    }

    /**
     * 读取并清空待消费打卡记录。JS 拿到后负责落地 localStorage，
     * 这样 widget 的即时 +1 与 WebView 内数据最终一致。
     */
    public static JSONArray drainPending(Context context) {
        JSONArray pending = getPending(context);
        prefs(context).edit().remove(KEY_PENDING).commit();
        return pending;
    }

    /** 本地乐观更新：把指定目标的 current += step（clamp 到 target），让 widget 立刻反映点击。 */
    public static void incrementLocal(Context context, String goalId, double step) {
        JSONArray goals = getGoals(context);
        for (int i = 0; i < goals.length(); i++) {
            JSONObject goal = goals.optJSONObject(i);
            if (goal != null && goalId.equals(goal.optString("id"))) {
                double current = goal.optDouble("current", 0) + step;
                double target = goal.optDouble("target", 0);
                if (target > 0 && current > target) {
                    current = target;
                }
                putNumberValue(goal, "current", current);
                break;
            }
        }
        prefs(context).edit().putString(KEY_GOALS, goals.toString()).commit();
    }

    private static JSONArray getPending(Context context) {
        String raw = prefs(context).getString(KEY_PENDING, null);
        if (raw == null) {
            return new JSONArray();
        }
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static void putString(JSONObject target, JSONObject src, String key, String def) {
        try {
            target.put(key, src.optString(key, def));
        } catch (JSONException ignored) {
            // optString 不会抛异常，这里仅为满足 put 的受检声明
        }
    }

    /** 数值字段用 double 存储,兼容小数步长(如 +0.5 小时)。整数仍以整数形式写出。 */
    private static void putNumber(JSONObject target, JSONObject src, String key, double def) {
        putNumberValue(target, key, src.optDouble(key, def));
    }

    private static void putNumberValue(JSONObject target, String key, double value) {
        try {
            if (value == Math.rint(value) && Math.abs(value) < 1e15) {
                target.put(key, (long) value);
            } else {
                target.put(key, value);
            }
        } catch (JSONException ignored) {
            // 数值不会抛异常
        }
    }
}
